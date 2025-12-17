import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { PaymentMethodDB, PaymentScope, CreatePaymentMethodInput, FindPaymentMethodsOptions } from "@/models/db/payment-method";

export class PaymentMethodsRepository extends BaseRepository {
  /**
   * Get all payment methods with optional filters
   */
  async findAll(options: FindPaymentMethodsOptions = {}): Promise<PaymentMethodDB[]> {
    let query = this.supabase
      .from("payment_methods")
      .select("id, name, scope, is_active, created_at")
      .eq("user_uid", this.userId);

    if (options.scope) {
      query = query.or(`scope.eq.${options.scope},scope.eq.BOTH`);
    }

    if (options.onlyActive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch payment methods: ${error.message}`);
    }

    return (data ?? []) as PaymentMethodDB[];
  }

  /**
   * Get a single payment method by ID
   */
  async findById(paymentMethodId: number): Promise<PaymentMethodDB | null> {
    const { data, error } = await this.supabase
      .from("payment_methods")
      .select("id, name, scope, is_active, created_at")
      .eq("id", paymentMethodId)
      .eq("user_uid", this.userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch payment method: ${error.message}`);
    }

    return data as PaymentMethodDB;
  }

  /**
   * Create a new payment method
   */
  async create(input: CreatePaymentMethodInput): Promise<PaymentMethodDB> {
    const { data, error } = await this.supabase
      .from("payment_methods")
      .insert({
        name: input.name,
        scope: input.scope,
        is_active: input.is_active ?? true,
        user_uid: this.userId,
      })
      .select("id, name, scope, is_active, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to create payment method: ${error.message}`);
    }

    return data as PaymentMethodDB;
  }

  /**
   * Update a payment method
   */
  async update(
    paymentMethodId: number,
    updates: Partial<Omit<PaymentMethodDB, "id" | "user_uid" | "created_at">>
  ): Promise<PaymentMethodDB> {
    const { data, error } = await this.supabase
      .from("payment_methods")
      .update(updates)
      .eq("id", paymentMethodId)
      .eq("user_uid", this.userId)
      .select("id, name, scope, is_active, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to update payment method: ${error.message}`);
    }

    return data as PaymentMethodDB;
  }

  /**
   * Delete a payment method (soft delete by setting is_active to false)
   */
  async delete(paymentMethodId: number): Promise<void> {
    const { error } = await this.supabase
      .from("payment_methods")
      .update({ is_active: false })
      .eq("id", paymentMethodId)
      .eq("user_uid", this.userId);

    if (error) {
      throw new Error(`Failed to delete payment method: ${error.message}`);
    }
  }
}

