// src/models/db/court.ts
export interface CourtDB {
  id: number;
  user_uid: string;
  name: string;
  is_active: boolean;
}

export interface CourtSlotDB {
  id: number;
  user_uid: string;
  court_id: number;
  slot_date: string; // DATE
  start_time: string; // TIME
  end_time: string; // TIME
  was_played: boolean;
  notes: string | null;
  player1_payment_method_id: number | null;
  player1_note: string | null;
  player2_payment_method_id: number | null;
  player2_note: string | null;
  player3_payment_method_id: number | null;
  player3_note: string | null;
  player4_payment_method_id: number | null;
  player4_note: string | null;
  created_at: string;
}

// Input types for creating/updating entities
export interface CreateCourtInput {
  name: string;
  is_active?: boolean;
}

export interface CreateCourtSlotInput {
  court_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  was_played?: boolean;
  notes?: string | null;
  player1_payment_method_id?: number | null;
  player1_note?: string | null;
  player2_payment_method_id?: number | null;
  player2_note?: string | null;
  player3_payment_method_id?: number | null;
  player3_note?: string | null;
  player4_payment_method_id?: number | null;
  player4_note?: string | null;
}

export interface CourtSlotWithCourt extends CourtSlotDB {
  court?: {
    id: number;
    name: string;
  } | null;
  player1_payment_method?: {
    id: number;
    name: string;
  } | null;
  player2_payment_method?: {
    id: number;
    name: string;
  } | null;
  player3_payment_method?: {
    id: number;
    name: string;
  } | null;
  player4_payment_method?: {
    id: number;
    name: string;
  } | null;
}

export type CourtType = 'INDOOR' | 'OUTDOOR' | 'OTRAS';

export interface CourtPricingDB {
  id: number;
  user_uid: string;
  court_id: number;
  start_time: string; // TIME
  end_time: string; // TIME
  price_per_player: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCourtPricingInput {
  court_id: number;
  start_time: string;
  end_time: string;
  price_per_player: number;
}

export interface UpdateCourtPricingInput {
  start_time?: string;
  end_time?: string;
  price_per_player?: number;
}


