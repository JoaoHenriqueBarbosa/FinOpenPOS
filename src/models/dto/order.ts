// src/models/dto/order.ts
import { OrderDB, OrderItemDB, OrderStatus } from "../db/order";
import { ProductNestedDTO } from "./product";
import type { PlayerNestedDTO } from "./tournament";

// Order Item DTO with nested product
export interface OrderItemDTO extends Omit<OrderItemDB, "user_uid" | "order_id" | "product_id"> {
  product: ProductNestedDTO | null;
}

// Order DTO with nested player and items
export interface OrderDTO extends Omit<OrderDB, "user_uid" | "player_id"> {
  player: PlayerNestedDTO | null;
  items?: OrderItemDTO[];
}

// Re-export status type
export type { OrderStatus };

