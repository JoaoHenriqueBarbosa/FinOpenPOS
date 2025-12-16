// src/models/dto/supplier.ts
import { SupplierDB, SupplierStatus } from "../db/supplier";

// Supplier DTO
export interface SupplierDTO extends Omit<SupplierDB, "user_uid"> {}

// Nested supplier DTO for use in other entities
export type SupplierNestedDTO = Pick<SupplierDTO, "id" | "name">;

// Re-export status type
export type { SupplierStatus };


