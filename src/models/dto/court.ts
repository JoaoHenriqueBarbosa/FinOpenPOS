// src/models/dto/court.ts
import { CourtDB, CourtSlotDB } from "../db/court";
import { PaymentMethodNestedDTO } from "./payment-method";

// Court DTO
export interface CourtDTO extends Omit<CourtDB, "user_uid"> {}

// Nested court DTO for use in other entities
export type CourtNestedDTO = Pick<CourtDTO, "id" | "name">;

// Court Slot DTO with nested court and payment methods
export interface CourtSlotDTO extends Omit<CourtSlotDB, "user_uid" | "court_id" | "player1_payment_method_id" | "player2_payment_method_id" | "player3_payment_method_id" | "player4_payment_method_id"> {
  court: CourtNestedDTO | null;
  player1_payment_method?: PaymentMethodNestedDTO | null;
  player2_payment_method?: PaymentMethodNestedDTO | null;
  player3_payment_method?: PaymentMethodNestedDTO | null;
  player4_payment_method?: PaymentMethodNestedDTO | null;
}


