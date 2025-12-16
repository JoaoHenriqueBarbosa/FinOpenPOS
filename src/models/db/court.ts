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


