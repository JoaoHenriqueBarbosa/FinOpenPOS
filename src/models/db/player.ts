// Database models for players

export type PlayerStatus = "active" | "inactive";

export interface Player {
  id: number;
  user_uid: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null; // DATE
  notes: string | null;
  status: PlayerStatus;
  created_at: string; // TIMESTAMP
}

