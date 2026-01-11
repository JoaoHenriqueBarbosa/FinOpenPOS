export interface TournamentRegistrationPayment {
  id: number;
  tournament_id: number;
  tournament_team_id: number;
  player_id: number;
  user_uid: string;
  has_paid: boolean;
  payment_method_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTournamentPaymentInput {
  tournament_id: number;
  tournament_team_id: number;
  player_id: number;
  has_paid?: boolean;
  payment_method_id?: number | null;
  notes?: string | null;
}

export interface UpdateTournamentPaymentInput {
  has_paid?: boolean;
  payment_method_id?: number | null;
  notes?: string | null;
}
