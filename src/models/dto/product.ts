// src/models/dto/product.ts
import { ProductDB } from "../db/product";
import type { ProductCategoryDTO } from "./product-category";

// Re-export for backward compatibility
export type { ProductCategoryDTO } from "./product-category";

// Product DTO
export interface ProductDTO extends Omit<ProductDB, "user_uid" | "category_id"> {
  category?: ProductCategoryDTO | null;
}

// Nested product DTO for use in other entities (e.g., OrderItem)
export type ProductNestedDTO = Pick<ProductDTO, "id" | "name">;


