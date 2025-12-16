// src/models/dto/payment-method.ts
import { PaymentMethodDB, PaymentScope } from "../db/payment-method";

// Payment Method DTO
export interface PaymentMethodDTO extends Omit<PaymentMethodDB, "user_uid"> {}

// Nested payment method DTO for use in other entities
export type PaymentMethodNestedDTO = Pick<PaymentMethodDTO, "id" | "name">;

// Re-export scope type
export type { PaymentScope };


