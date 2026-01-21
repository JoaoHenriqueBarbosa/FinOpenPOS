// src/models/db/order.ts
export type OrderStatus = "open" | "closed" | "cancelled";

export interface OrderDB {
  id: number;
  user_uid: string;
  player_id: number;
  status: OrderStatus;
  total_amount: number;
  discount_percentage: number | null;
  discount_amount: number | null;
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

// Input types for creating/updating entities
export interface CreateOrderInput {
  player_id: number;
  total_amount?: number;
  status?: OrderStatus;
}

// Alias for backward compatibility with existing code
export type CreateOrderInputWithPlayerId = Omit<CreateOrderInput, "player_id"> & { playerId: number };

export interface CreateOrderItemInput {
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface OrderWithPlayer extends OrderDB {
  player?: {
    first_name: string;
    last_name: string;
  };
}

export interface OrderItemWithProduct extends OrderItemDB {
  product?: {
    id: number;
    name: string;
    price: number;
  };
}


