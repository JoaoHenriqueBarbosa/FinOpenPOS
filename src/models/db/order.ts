// src/models/db/order.ts
export type OrderStatus = "open" | "closed" | "cancelled";

export interface OrderDB {
  id: number;
  user_uid: string;
  player_id: number;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  closed_at: string | null;
}

export interface OrderItemDB {
  id: number;
  user_uid: string;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}


