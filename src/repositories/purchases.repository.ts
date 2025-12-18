import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { PurchaseDB, PurchaseItemDB, PurchaseStatus, CreatePurchaseInput, CreatePurchaseItemInput, PurchaseWithRelations } from "@/models/db/purchase";

export class PurchasesRepository extends BaseRepository {
  /**
   * Get all purchases
   */
  async findAll(): Promise<PurchaseWithRelations[]> {
    const { data, error } = await this.supabase
      .from("purchases")
      .select(
        `
        id,
        user_uid,
        supplier_id,
        payment_method_id,
        transaction_id,
        total_amount,
        status,
        notes,
        created_at,
        supplier:supplier_id (
          id,
          name
        ),
        payment_method:payment_method_id (
          id,
          name
        )
      `
      )
      .eq("user_uid", this.userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch purchases: ${error.message}`);
    }

    // Normalize relations (Supabase returns arrays for relations)
    return (data ?? []).map((item: any) => ({
      ...item,
      supplier: Array.isArray(item.supplier) ? (item.supplier[0] || null) : item.supplier,
      payment_method: Array.isArray(item.payment_method) ? (item.payment_method[0] || null) : item.payment_method,
    })) as unknown as PurchaseWithRelations[];
  }

  /**
   * Get a single purchase by ID with items
   */
  async findById(purchaseId: number): Promise<PurchaseWithRelations | null> {
    const { data: purchase, error: purchaseError } = await this.supabase
      .from("purchases")
      .select(
        `
        id,
        user_uid,
        supplier_id,
        payment_method_id,
        transaction_id,
        total_amount,
        status,
        notes,
        created_at,
        supplier:supplier_id (
          id,
          name
        ),
        payment_method:payment_method_id (
          id,
          name
        )
      `
      )
      .eq("id", purchaseId)
      .eq("user_uid", this.userId)
      .single();

    if (purchaseError) {
      if (purchaseError.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch purchase: ${purchaseError.message}`);
    }

    // Get items separately
    const { data: items, error: itemsError } = await this.supabase
      .from("purchase_items")
      .select(
        `
        id,
        user_uid,
        purchase_id,
        product_id,
        quantity,
        unit_cost,
        notes,
        created_at,
        product:product_id (
          id,
          name
        )
      `
      )
      .eq("purchase_id", purchaseId)
      .eq("user_uid", this.userId)
      .order("id", { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to fetch purchase items: ${itemsError.message}`);
    }

    // Normalize relations (Supabase returns arrays for relations)
    const normalized = {
      ...(purchase as PurchaseDB),
      supplier: Array.isArray(purchase.supplier) ? (purchase.supplier[0] || null) : purchase.supplier,
      payment_method: Array.isArray(purchase.payment_method) ? (purchase.payment_method[0] || null) : purchase.payment_method,
      items: (items ?? []).map((item: any) => ({
        ...item,
        product: Array.isArray(item.product) ? (item.product[0] || null) : item.product,
      })) as unknown as PurchaseItemDB[],
    };
    return normalized as unknown as PurchaseWithRelations;
  }

  /**
   * Create a new purchase
   */
  async create(input: CreatePurchaseInput): Promise<PurchaseWithRelations> {
    const { data, error } = await this.supabase
      .from("purchases")
      .insert({
        supplier_id: input.supplier_id,
        payment_method_id: input.payment_method_id ?? null,
        total_amount: input.total_amount ?? 0,
        status: input.status ?? "pending",
        notes: input.notes ?? null,
        user_uid: this.userId,
      })
      .select(
        `
        id,
        supplier_id,
        payment_method_id,
        transaction_id,
        total_amount,
        status,
        notes,
        created_at,
        supplier:supplier_id (
          id,
          name
        ),
        payment_method:payment_method_id (
          id,
          name
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create purchase: ${error.message}`);
    }

    // Normalize relations (Supabase returns arrays for relations)
    const normalized = {
      ...data,
      supplier: Array.isArray(data.supplier) ? (data.supplier[0] || null) : data.supplier,
      payment_method: Array.isArray(data.payment_method) ? (data.payment_method[0] || null) : data.payment_method,
    };
    return normalized as unknown as PurchaseWithRelations;
  }

  /**
   * Update a purchase
   */
  async update(
    purchaseId: number,
    updates: Partial<Omit<PurchaseDB, "id" | "user_uid" | "created_at">>
  ): Promise<PurchaseWithRelations> {
    const { data, error } = await this.supabase
      .from("purchases")
      .update(updates)
      .eq("id", purchaseId)
      .eq("user_uid", this.userId)
      .select(
        `
        id,
        supplier_id,
        payment_method_id,
        transaction_id,
        total_amount,
        status,
        notes,
        created_at,
        supplier:supplier_id (
          id,
          name
        ),
        payment_method:payment_method_id (
          id,
          name
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to update purchase: ${error.message}`);
    }

    // Normalize relations (Supabase returns arrays for relations)
    const normalized = {
      ...data,
      supplier: Array.isArray(data.supplier) ? (data.supplier[0] || null) : data.supplier,
      payment_method: Array.isArray(data.payment_method) ? (data.payment_method[0] || null) : data.payment_method,
    };
    return normalized as unknown as PurchaseWithRelations;
  }

  /**
   * Create a purchase with items, stock movements, and transaction
   */
  async createWithItems(
    input: CreatePurchaseInput & {
      items: Array<{
        productId: number;
        quantity: number;
        unitCost: number;
      }>;
    }
  ): Promise<PurchaseWithRelations> {
    // Calculate total
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );

    // Create purchase
    const purchase = await this.create({
      ...input,
      total_amount: totalAmount,
    });

    // Create purchase items
    const purchaseItemsRepo = new PurchaseItemsRepository(this.supabase, this.userId);
    for (const item of input.items) {
      await purchaseItemsRepo.create({
        purchase_id: purchase.id,
        product_id: item.productId ?? null,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        notes: null,
      });
    }

    // Get supplier name for stock movements
    const supplier = await this.supabase
      .from("suppliers")
      .select("name")
      .eq("id", input.supplier_id)
      .eq("user_uid", this.userId)
      .single()
      .then(({ data, error }) => {
        if (error) throw new Error(`Failed to fetch supplier: ${error.message}`);
        return data;
      });

    // Create stock movements
    const stockMovementsPayload = input.items.map((item) => ({
      product_id: item.productId,
      movement_type: "purchase",
      quantity: item.quantity,
      unit_cost: item.unitCost,
      notes: `Purchase #${purchase.id} from supplier: ${supplier.name}`,
      user_uid: this.userId,
    }));

    const { error: smError } = await this.supabase
      .from("stock_movements")
      .insert(stockMovementsPayload);

    if (smError) {
      throw new Error(`Failed to create stock movements: ${smError.message}`);
    }

    // Create transaction if payment method provided
    let transactionId: number | null = null;
    if (input.payment_method_id) {
      const paymentMethod = await this.supabase
        .from("payment_methods")
        .select("id, name")
        .eq("id", input.payment_method_id)
        .eq("user_uid", this.userId)
        .single()
        .then(({ data, error }) => {
          if (error) throw new Error(`Failed to fetch payment method: ${error.message}`);
          return data;
        });

      const { data: tx, error: txError } = await this.supabase
        .from("transactions")
        .insert({
          amount: totalAmount,
          user_uid: this.userId,
          type: "expense",
          status: "completed",
          payment_method_id: input.payment_method_id,
          description: `Purchase #${purchase.id} from ${supplier.name} (${paymentMethod.name})`,
        })
        .select("id")
        .single();

      if (txError) {
        throw new Error(`Failed to create transaction: ${txError.message}`);
      }

      transactionId = tx.id;

      // Update purchase with transaction_id
      await this.update(purchase.id, { transaction_id: transactionId });
    }

    // Return purchase with transaction_id
    const updatedPurchase = await this.findById(purchase.id);
    if (!updatedPurchase) {
      throw new Error("Purchase not found after creation");
    }

    return updatedPurchase;
  }
}

export class PurchaseItemsRepository extends BaseRepository {
  /**
   * Get all items for a purchase
   */
  async findByPurchaseId(purchaseId: number): Promise<PurchaseItemDB[]> {
    const { data, error } = await this.supabase
      .from("purchase_items")
      .select(
        `
        id,
        user_uid,
        purchase_id,
        product_id,
        quantity,
        unit_cost,
        notes,
        created_at,
        product:product_id (
          id,
          name
        )
      `
      )
      .eq("purchase_id", purchaseId)
      .eq("user_uid", this.userId)
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch purchase items: ${error.message}`);
    }

    // Normalize product relation (Supabase returns array for relations)
    return (data ?? []).map((item: any) => ({
      ...item,
      product: Array.isArray(item.product) ? (item.product[0] || null) : item.product,
    })) as unknown as PurchaseItemDB[];
  }

  /**
   * Create a new purchase item
   */
  async create(input: CreatePurchaseItemInput): Promise<PurchaseItemDB> {
    const { data, error } = await this.supabase
      .from("purchase_items")
      .insert({
        purchase_id: input.purchase_id,
        product_id: input.product_id ?? null,
        quantity: input.quantity,
        unit_cost: input.unit_cost,
        notes: input.notes ?? null,
        user_uid: this.userId,
      })
      .select(
        `
        id,
        user_uid,
        purchase_id,
        product_id,
        quantity,
        unit_cost,
        notes,
        created_at,
        product:product_id (
          id,
          name
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create purchase item: ${error.message}`);
    }

    // Normalize product relation (Supabase returns array for relations)
    const normalized = {
      ...data,
      product: Array.isArray(data.product) ? (data.product[0] || null) : data.product,
    };
    return normalized as unknown as PurchaseItemDB;
  }

  /**
   * Delete a purchase item
   */
  async delete(itemId: number): Promise<void> {
    const { error } = await this.supabase
      .from("purchase_items")
      .delete()
      .eq("id", itemId)
      .eq("user_uid", this.userId);

    if (error) {
      throw new Error(`Failed to delete purchase item: ${error.message}`);
    }
  }

  /**
   * Delete all items for a purchase
   */
  async deleteByPurchaseId(purchaseId: number): Promise<void> {
    const { error } = await this.supabase
      .from("purchase_items")
      .delete()
      .eq("purchase_id", purchaseId)
      .eq("user_uid", this.userId);

    if (error) {
      throw new Error(`Failed to delete purchase items: ${error.message}`);
    }
  }
}

