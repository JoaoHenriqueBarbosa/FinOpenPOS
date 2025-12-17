// src/models/dto/product-category.ts
import { ProductCategoryDB } from "../db/product";

// Product Category DTO
export interface ProductCategoryDTO extends Omit<ProductCategoryDB, "user_uid"> {}

