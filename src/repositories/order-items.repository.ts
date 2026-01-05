import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { OrderItemDB, CreateOrderItemInput, OrderItemWithProduct } from "@/models/db/order";

export class OrderItemsRepository extends BaseRepository {
  /**
   * Get all items for an order
   */
  async findByOrderId(orderId: number): Promise<OrderItemWithProduct[]> {
    const { data, error } = await this.supabase
      .from("order_items")
      .select(
        `
        id,
        user_uid,
        order_id,
        product_id,
        quantity,
        unit_price,
        total_price,
        created_at,
        product:product_id (
          name
        )
      `
      )
      .eq("order_id", orderId)
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch order items: ${error.message}`);
    }

    // Normalize product relation (Supabase returns array for relations)
    return (data ?? []).map((item: any) => ({
      ...item,
      product: Array.isArray(item.product) ? (item.product[0] || null) : item.product,
    })) as unknown as OrderItemWithProduct[];
  }

  /**
   * Get a single order item by ID
   */
  async findById(itemId: number): Promise<OrderItemWithProduct | null> {
    const { data, error } = await this.supabase
      .from("order_items")
      .select(
        `
        id,
        user_uid,
        order_id,
        product_id,
        quantity,
        unit_price,
        total_price,
        created_at,
        product:product_id (
          name
        )
      `
      )
      .eq("id", itemId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch order item: ${error.message}`);
    }

    // Normalize product relation (Supabase returns array for relations)
    const normalized = {
      ...data,
      product: Array.isArray(data.product) ? (data.product[0] || null) : data.product,
    };
    return normalized as unknown as OrderItemWithProduct;
  }

  /**
   * Create a new order item
   */
  async create(input: CreateOrderItemInput): Promise<OrderItemWithProduct> {
    const { data, error } = await this.supabase
      .from("order_items")
      .insert({
        order_id: input.order_id,
        product_id: input.product_id,
        quantity: input.quantity,
        unit_price: input.unit_price,
        user_uid: this.userId,
      })
      .select(
        `
        id,
        user_uid,
        order_id,
        product_id,
        quantity,
        unit_price,
        total_price,
        created_at,
        product:product_id (
          name
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create order item: ${error.message}`);
    }

    // Normalize product relation (Supabase returns array for relations)
    const normalized = {
      ...data,
      product: Array.isArray(data.product) ? (data.product[0] || null) : data.product,
    };
    return normalized as OrderItemWithProduct;
  }

  /**
   * Update an order item
   */
  async update(itemId: number, updates: Partial<Pick<OrderItemDB, "quantity" | "unit_price">>): Promise<OrderItemWithProduct> {
    const { data, error } = await this.supabase
      .from("order_items")
      .update(updates)
      .eq("id", itemId)
      .select(
        `
        id,
        user_uid,
        order_id,
        product_id,
        quantity,
        unit_price,
        total_price,
        created_at,
        product:product_id (
          name
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to update order item: ${error.message}`);
    }

    // Normalize product relation (Supabase returns array for relations)
    const normalized = {
      ...data,
      product: Array.isArray(data.product) ? (data.product[0] || null) : data.product,
    };
    return normalized as OrderItemWithProduct;
  }

  /**
   * Delete an order item
   */
  async delete(itemId: number): Promise<void> {
    const { error } = await this.supabase
      .from("order_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      throw new Error(`Failed to delete order item: ${error.message}`);
    }
  }

  /**
   * Delete all items for an order
   */
  async deleteByOrderId(orderId: number): Promise<void> {
    const { error } = await this.supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (error) {
      throw new Error(`Failed to delete order items: ${error.message}`);
    }
  }

  /**
   * Calculate total for an order
   */
  async calculateOrderTotal(orderId: number): Promise<number> {
    const { data, error } = await this.supabase
      .from("order_items")
      .select("quantity, unit_price")
      .eq("order_id", orderId);

    if (error) {
      throw new Error(`Failed to calculate order total: ${error.message}`);
    }

    return (data ?? []).reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }
}

