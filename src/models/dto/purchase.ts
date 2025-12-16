// src/models/dto/purchase.ts
import { PurchaseDB, PurchaseItemDB, PurchaseStatus } from "../db/purchase";
import { SupplierNestedDTO } from "./supplier";
import { PaymentMethodNestedDTO } from "./payment-method";
import { ProductNestedDTO } from "./product";

// Purchase Item DTO with nested product
export interface PurchaseItemDTO extends Omit<PurchaseItemDB, "user_uid" | "purchase_id" | "product_id"> {
  product: ProductNestedDTO | null;
}

// Purchase DTO with nested supplier and payment method
export interface PurchaseDTO extends Omit<PurchaseDB, "user_uid" | "supplier_id" | "payment_method_id"> {
  supplier: SupplierNestedDTO | null;
  payment_method: PaymentMethodNestedDTO | null;
  items?: PurchaseItemDTO[];
}

// Re-export status type
export type { PurchaseStatus };


