// src/models/dto/product.ts
import { ProductDB, ProductCategoryDB } from "../db/product";

// Product Category DTO
export interface ProductCategoryDTO extends Omit<ProductCategoryDB, "user_uid"> {}

// Product DTO
export interface ProductDTO extends Omit<ProductDB, "user_uid" | "category_id"> {
  category?: ProductCategoryDTO | null;
}

// Nested product DTO for use in other entities (e.g., OrderItem)
export type ProductNestedDTO = Pick<ProductDTO, "id" | "name">;


