import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { ProductDB, CreateProductInput, FindProductsOptions } from "@/models/db/product";

export class ProductsRepository extends BaseRepository {
  /**
   * Get all products with optional filters
   */
  async findAll(options: FindProductsOptions = {}): Promise<ProductDB[]> {
    let query = this.supabase
      .from("products")
      .select(`
        id, 
        name, 
        description, 
        price, 
        uses_stock, 
        min_stock, 
        category_id, 
        is_active, 
        created_at, 
        updated_at,
        user_uid,
        category:category_id (
          id,
          name,
          description,
          color,
          is_active,
          created_at
        )
      `);

    if (options.status) {
      if (options.status === "active") {
        query = query.eq("is_active", true);
      } else if (options.status === "inactive") {
        query = query.eq("is_active", false);
      }
      // if status is "all", no additional filtering
    } else if (options.onlyActive) {
      query = query.eq("is_active", true);
    }

    if (options.categoryId) {
      query = query.eq("category_id", options.categoryId);
    }

    if (options.search && options.search.trim() !== "") {
      query = query.ilike("name", `%${options.search.trim()}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return (data ?? []) as ProductDB[];
  }

  /**
   * Get a single product by ID
   */
  async findById(productId: number): Promise<ProductDB | null> {
    const { data, error } = await this.supabase
      .from("products")
      .select("id, name, description, price, uses_stock, min_stock, category_id, is_active, created_at, updated_at")
      .eq("id", productId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return data as ProductDB;
  }

  /**
   * Create a new product
   */
  async create(input: CreateProductInput): Promise<ProductDB> {
    const { data, error } = await this.supabase
      .from("products")
      .insert({
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        uses_stock: input.uses_stock ?? true,
        min_stock: input.min_stock ?? 0,
        category_id: input.category_id ?? null,
        is_active: input.is_active ?? true,
        user_uid: this.userId,
      })
      .select("id, name, description, price, uses_stock, min_stock, category_id, is_active, created_at, updated_at")
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return data as ProductDB;
  }

  /**
   * Update a product
   */
  async update(productId: number, updates: Partial<Omit<ProductDB, "id" | "user_uid" | "created_at" | "updated_at">>): Promise<ProductDB> {
    const { data, error } = await this.supabase
      .from("products")
      .update(updates)
      .eq("id", productId)
      .select("id, name, description, price, uses_stock, min_stock, category_id, is_active, created_at, updated_at")
      .single();

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    return data as ProductDB;
  }

  /**
   * Delete a product (soft delete by setting is_active to false)
   */
  async delete(productId: number): Promise<void> {
    const { error } = await this.supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", productId);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }
}

