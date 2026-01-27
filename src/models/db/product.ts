// src/models/db/product.ts
export interface ProductCategoryDB {
  id: number;
  user_uid: string;
  name: string;
  description: string | null;
  color: string | null;
  is_sellable: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ProductDB {
  id: number;
  user_uid: string;
  category_id: number | null;
  name: string;
  description: string | null;
  price: number;
  uses_stock: boolean;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Input types for creating/updating entities
export interface CreateProductInput {
  name: string;
  description?: string | null;
  price: number;
  uses_stock?: boolean;
  min_stock?: number;
  category_id?: number | null;
  is_active?: boolean;
}

export interface CreateProductCategoryInput {
  name: string;
  description?: string | null;
  color?: string | null;
  is_sellable?: boolean;
  is_active?: boolean;
}

export type ProductStatusFilter = "active" | "inactive" | "all";

export interface FindProductsOptions {
  categoryId?: number;
  search?: string;
  onlyActive?: boolean;
  status?: ProductStatusFilter;
}

export interface FindProductCategoriesOptions {
  onlyActive?: boolean;
  onlySellable?: boolean;
  search?: string;
}


