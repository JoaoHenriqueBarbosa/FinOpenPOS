// DTOs for players

import type { PlayerStatus } from "../db/player";

export interface PlayerDTO {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
  status: PlayerStatus;
}

export interface PlayerListItem {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: PlayerStatus;
}

