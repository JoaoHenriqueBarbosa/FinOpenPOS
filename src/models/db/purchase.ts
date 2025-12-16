// src/models/db/purchase.ts
export type PurchaseStatus = "pending" | "completed" | "cancelled";

export interface PurchaseDB {
  id: number;
  user_uid: string;
  supplier_id: number;
  payment_method_id: number | null;
  total_amount: number;
  status: PurchaseStatus;
  notes: string | null;
  created_at: string;
}

export interface PurchaseItemDB {
  id: number;
  user_uid: string;
  purchase_id: number;
  product_id: number | null;
  quantity: number;
  unit_cost: number;
  notes: string | null;
  created_at: string;
}

