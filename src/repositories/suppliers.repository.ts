import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { SupplierDB, SupplierStatus, CreateSupplierInput, FindSuppliersOptions } from "@/models/db/supplier";

export class SuppliersRepository extends BaseRepository {
  /**
   * Get all suppliers with optional filters
   */
  async findAll(options: FindSuppliersOptions = {}): Promise<SupplierDB[]> {
    let query = this.supabase
      .from("suppliers")
      .select("id, name, contact_email, phone, notes, status, created_at")
      .eq("user_uid", this.userId);

    if (options.onlyActive) {
      query = query.eq("status", "active");
    }

    if (options.search && options.search.trim() !== "") {
      query = query.ilike("name", `%${options.search.trim()}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch suppliers: ${error.message}`);
    }

    return (data ?? []) as SupplierDB[];
  }

  /**
   * Get a single supplier by ID
   */
  async findById(supplierId: number): Promise<SupplierDB | null> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .select("id, name, contact_email, phone, notes, status, created_at")
      .eq("id", supplierId)
      .eq("user_uid", this.userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch supplier: ${error.message}`);
    }

    return data as SupplierDB;
  }

  /**
   * Create a new supplier
   */
  async create(input: CreateSupplierInput): Promise<SupplierDB> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .insert({
        name: input.name,
        contact_email: input.contact_email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        status: input.status ?? "active",
        user_uid: this.userId,
      })
      .select("id, name, contact_email, phone, notes, status, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to create supplier: ${error.message}`);
    }

    return data as SupplierDB;
  }

  /**
   * Update a supplier
   */
  async update(
    supplierId: number,
    updates: Partial<Omit<SupplierDB, "id" | "user_uid" | "created_at">>
  ): Promise<SupplierDB> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .update(updates)
      .eq("id", supplierId)
      .eq("user_uid", this.userId)
      .select("id, name, contact_email, phone, notes, status, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to update supplier: ${error.message}`);
    }

    return data as SupplierDB;
  }

  /**
   * Delete a supplier (soft delete by setting status to inactive)
   */
  async delete(supplierId: number): Promise<void> {
    const { error } = await this.supabase
      .from("suppliers")
      .update({ status: "inactive" })
      .eq("id", supplierId)
      .eq("user_uid", this.userId);

    if (error) {
      throw new Error(`Failed to delete supplier: ${error.message}`);
    }
  }
}

