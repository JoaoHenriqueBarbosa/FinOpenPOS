// src/models/db/payment-method.ts
export type PaymentScope = "BAR" | "COURT" | "BOTH";

export interface PaymentMethodDB {
  id: number;
  user_uid: string;
  name: string;
  scope: PaymentScope;
  is_active: boolean;
  created_at: string;
}

// Input types for creating/updating entities
export interface CreatePaymentMethodInput {
  name: string;
  scope: PaymentScope;
  is_active?: boolean;
}

export interface FindPaymentMethodsOptions {
  onlyActive?: boolean;
  scope?: PaymentScope;
}


