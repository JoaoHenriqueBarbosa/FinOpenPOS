import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { ProductCategoryDB, CreateProductCategoryInput, FindProductCategoriesOptions } from "@/models/db/product";

export class ProductCategoriesRepository extends BaseRepository {
  /**
   * Get all product categories with optional filters
   */
  async findAll(options: FindProductCategoriesOptions = {}): Promise<ProductCategoryDB[]> {
    let query = this.supabase
      .from("product_categories")
      .select("id, name, description, color, is_sellable, is_active, created_at");

    if (options.onlyActive) {
      query = query.eq("is_active", true);
    }

    if (options.onlySellable) {
      query = query.eq("is_sellable", true);
    }

    if (options.search && options.search.trim() !== "") {
      query = query.ilike("name", `%${options.search.trim()}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch product categories: ${error.message}`);
    }

    return (data ?? []) as ProductCategoryDB[];
  }

  /**
   * Get a single product category by ID
   */
  async findById(categoryId: number): Promise<ProductCategoryDB | null> {
    const { data, error } = await this.supabase
      .from("product_categories")
      .select("id, name, description, color, is_sellable, is_active, created_at")
      .eq("id", categoryId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch product category: ${error.message}`);
    }

    return data as ProductCategoryDB;
  }

  /**
   * Create a new product category
   */
  async create(input: CreateProductCategoryInput): Promise<ProductCategoryDB> {
    const { data, error } = await this.supabase
      .from("product_categories")
      .insert({
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? null,
        is_sellable: input.is_sellable ?? true,
        is_active: input.is_active ?? true,
        user_uid: this.userId,
      })
      .select("id, name, description, color, is_sellable, is_active, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to create product category: ${error.message}`);
    }

    return data as ProductCategoryDB;
  }

  /**
   * Update a product category
   */
  async update(
    categoryId: number,
    updates: Partial<Omit<ProductCategoryDB, "id" | "user_uid" | "created_at">>
  ): Promise<ProductCategoryDB> {
    const { data, error } = await this.supabase
      .from("product_categories")
      .update(updates)
      .eq("id", categoryId)
      .select("id, name, description, color, is_sellable, is_active, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to update product category: ${error.message}`);
    }

    return data as ProductCategoryDB;
  }

  /**
   * Delete a product category (soft delete by setting is_active to false)
   */
  async delete(categoryId: number): Promise<void> {
    const { error } = await this.supabase
      .from("product_categories")
      .update({ is_active: false })
      .eq("id", categoryId);

    if (error) {
      throw new Error(`Failed to delete product category: ${error.message}`);
    }
  }
}

