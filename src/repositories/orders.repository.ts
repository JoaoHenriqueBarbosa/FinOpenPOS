import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { OrderDB, OrderStatus, CreateOrderInput, CreateOrderInputWithPlayerId, OrderWithPlayer } from "@/models/db/order";

export class OrdersRepository extends BaseRepository {
  /**
   * Get all orders, optionally filtered by status
   */
  async findAll(status?: OrderStatus): Promise<OrderWithPlayer[]> {
    let query = this.supabase
      .from("orders")
      .select(
        `
        id,
        player_id,
        total_amount,
        discount_percentage,
        discount_amount,
        user_uid,
        status,
        created_at,
        closed_at,
        player:player_id (
          first_name,
          last_name
        )
      `
      );

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return (data ?? []) as unknown as OrderWithPlayer[];
  }

  /**
   * Get a single order by ID
   */
  async findById(orderId: number): Promise<OrderWithPlayer | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select(
        `
        id,
        player_id,
        total_amount,
        discount_percentage,
        discount_amount,
        user_uid,
        status,
        created_at,
        closed_at,
        player:player_id (
          first_name,
          last_name
        )
      `
      )
      .eq("id", orderId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return data as unknown as OrderWithPlayer;
  }

  /**
   * Check if a player has an open order
   */
  async hasOpenOrder(playerId: number): Promise<{ hasOpen: boolean; orderId?: number }> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("id")
      .eq("player_id", playerId)
      .eq("status", "open")
      .limit(1);

    if (error) {
      throw new Error(`Failed to check open orders: ${error.message}`);
    }

    if (data && data.length > 0) {
      return { hasOpen: true, orderId: data[0].id };
    }

    return { hasOpen: false };
  }

  /**
   * Create a new order
   */
  async create(input: CreateOrderInputWithPlayerId): Promise<OrderWithPlayer> {
    const { playerId, ...rest } = input;
    const createInput: CreateOrderInput = { ...rest, player_id: playerId };
    
    const { data, error } = await this.supabase
      .from("orders")
      .insert({
        player_id: createInput.player_id,
        total_amount: input.total_amount ?? 0,
        user_uid: this.userId,
        status: input.status ?? "open",
      })
      .select(
        `
        id,
        player_id,
        total_amount,
        user_uid,
        status,
        created_at,
        closed_at,
        player:player_id (
          first_name,
          last_name
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return data as unknown as OrderWithPlayer;
  }

  /**
   * Update order status and total
   */
  async update(orderId: number, updates: Partial<Pick<OrderDB, "status" | "total_amount" | "closed_at">>): Promise<OrderWithPlayer> {
    const { data, error } = await this.supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .select(
        `
        id,
        player_id,
        total_amount,
        user_uid,
        status,
        created_at,
        closed_at,
        player:player_id (
          first_name,
          last_name
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return data as unknown as OrderWithPlayer;
  }

  /**
   * Count open orders
   */
  async countOpen(): Promise<number> {
    const { count, error } = await this.supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");

    if (error) {
      throw new Error(`Failed to count open orders: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Get order with items
   */
  async findByIdWithItems(orderId: number): Promise<(OrderWithPlayer & { items: Array<{
    id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    product?: { name: string };
  }> }) | null> {
    const order = await this.findById(orderId);
    if (!order) {
      return null;
    }

    const { data: items, error: itemsError } = await this.supabase
      .from("order_items")
      .select(
        `
        id,
        product_id,
        quantity,
        unit_price,
        product:product_id (
          name
        )
      `
      )
      .eq("order_id", orderId)
      .order("id", { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to fetch order items: ${itemsError.message}`);
    }

    return {
      ...order,
      items: (items ?? []) as unknown as Array<{
        id: number;
        product_id: number;
        quantity: number;
        unit_price: number;
        product?: { name: string };
      }>,
    };
  }

  /**
   * Update order items in batch
   */
  async updateOrderItems(
    orderId: number,
    items: Array<{ id?: number; product_id: number; quantity: number; unit_price: number }>
  ): Promise<OrderWithPlayer & { items: Array<{
    id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    product?: { name: string };
  }> }> {
    // Get current items
    const { data: currentItems, error: currentItemsError } = await this.supabase
      .from("order_items")
      .select("id, product_id, quantity, unit_price")
      .eq("order_id", orderId);

    if (currentItemsError) {
      throw new Error(`Failed to fetch current items: ${currentItemsError.message}`);
    }

    const currentItemsMap = new Map(
      (currentItems ?? []).map((item) => [item.id, item])
    );
    const newItemsMap = new Map(
      items
        .filter((item) => item.id && item.id > 0)
        .map((item) => [item.id!, item])
    );

    // Identify items to insert, update, and delete
    const itemsToInsert: Array<{
      order_id: number;
      product_id: number;
      quantity: number;
      unit_price: number;
      user_uid: string;
    }> = [];
    const itemsToUpdate: Array<{ id: number; quantity: number }> = [];
    const itemsToDelete: number[] = [];

    // New items (without ID or with negative/temporary ID)
    for (const item of items) {
      if (!item.id || item.id <= 0) {
        // Verify product exists and get current price
        const { data: product, error: productError } = await this.supabase
          .from("products")
          .select("id, price")
          .eq("id", item.product_id)
          .single();

        if (productError || !product) {
          console.warn(`Product ${item.product_id} not found, skipping`);
          continue;
        }

        itemsToInsert.push({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: product.price,
          user_uid: this.userId,
        });
      } else if (currentItemsMap.has(item.id)) {
        // Existing item that may have changed
        const currentItem = currentItemsMap.get(item.id)!;
        if (
          currentItem.quantity !== item.quantity ||
          currentItem.unit_price !== item.unit_price
        ) {
          itemsToUpdate.push({
            id: item.id,
            quantity: item.quantity,
          });
        }
      }
    }

    // Items to delete (in DB but not in new list)
    currentItemsMap.forEach((_, itemId) => {
      if (!newItemsMap.has(itemId)) {
        itemsToDelete.push(itemId);
      }
    });

    // Execute operations: delete, update, insert
    if (itemsToDelete.length > 0) {
      const { error: deleteError } = await this.supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId)
        .in("id", itemsToDelete);

      if (deleteError) {
        throw new Error(`Failed to delete items: ${deleteError.message}`);
      }
    }

    for (const update of itemsToUpdate) {
      const { error: updateError } = await this.supabase
        .from("order_items")
        .update({ quantity: update.quantity })
        .eq("id", update.id)
        .eq("order_id", orderId);

      if (updateError) {
        throw new Error(`Failed to update item: ${updateError.message}`);
      }
    }

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await this.supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert items: ${insertError.message}`);
      }
    }

    // Recalculate total
    const total = await this.supabase
      .from("order_items")
      .select("quantity, unit_price")
      .eq("order_id", orderId)
      .then(({ data, error }) => {
        if (error) throw new Error(`Failed to calculate total: ${error.message}`);
        return (data ?? []).reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      });

    await this.update(orderId, { total_amount: total });

    // Return updated order with items
    const updatedOrder = await this.findByIdWithItems(orderId);
    if (!updatedOrder) {
      throw new Error("Order not found after update");
    }

    return updatedOrder;
  }
}

