// Database models for tournaments
// These types reflect the exact structure of the database tables

export type TournamentStatus = "draft" | "schedule_review" | "in_progress" | "finished" | "cancelled";
export type MatchPhase = "group" | "playoff";
export type MatchStatus = "scheduled" | "in_progress" | "finished" | "cancelled";

export interface Tournament {
  id: number;
  user_uid: string;
  name: string;
  description: string | null;
  category: string | null;
  start_date: string | null; // DATE
  end_date: string | null; // DATE
  status: TournamentStatus;
  has_super_tiebreak: boolean;
  match_duration: number;
  registration_fee: number;
  created_at: string; // TIMESTAMP
}

export interface TournamentTeam {
  id: number;
  tournament_id: number;
  user_uid: string;
  player1_id: number;
  player2_id: number;
  display_name: string | null;
  seed_number: number | null;
  notes: string | null;
  display_order: number;
  is_substitute: boolean;
  schedule_notes: string | null;
}

export interface TournamentGroup {
  id: number;
  tournament_id: number;
  user_uid: string;
  name: string;
  group_order: number;
}

export interface TournamentGroupTeam {
  id: number;
  tournament_group_id: number;
  team_id: number;
  user_uid: string;
}

export interface TournamentMatch {
  id: number;
  tournament_id: number;
  user_uid: string;
  phase: MatchPhase;
  tournament_group_id: number | null;
  team1_id: number | null;
  team2_id: number | null;
  court_id: number | null;
  match_date: string | null; // DATE
  start_time: string | null; // TIME
  end_time: string | null; // TIME
  match_order: number | null;
  status: MatchStatus;
  set1_team1_games: number | null;
  set1_team2_games: number | null;
  set2_team1_games: number | null;
  set2_team2_games: number | null;
  set3_team1_games: number | null;
  set3_team2_games: number | null;
  super_tiebreak_team1_points: number | null;
  super_tiebreak_team2_points: number | null;
  team1_sets: number;
  team2_sets: number;
  team1_games_total: number;
  team2_games_total: number;
}

export interface TournamentGroupStanding {
  id: number;
  tournament_group_id: number;
  team_id: number;
  position: number;
  matches_played: number;
  wins: number;
  losses: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
}

export interface TournamentPlayoff {
  id: number;
  tournament_id: number;
  round: string;
  bracket_pos: number;
  source_team1: string | null;
  source_team2: string | null;
  match_id: number | null;
}

// Input types for creating/updating entities
export interface CreateTournamentInput {
  name: string;
  description?: string | null;
  category?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  has_super_tiebreak?: boolean;
  match_duration?: number;
  registration_fee?: number;
}

export interface CreateTournamentTeamInput {
  tournament_id: number;
  player1_id: number;
  player2_id: number;
  display_name?: string | null;
  seed_number?: number | null;
  notes?: string | null;
  display_order?: number;
  is_substitute?: boolean;
  schedule_notes?: string | null;
}

export interface CreateTournamentGroupInput {
  tournament_id: number;
  name: string;
  group_order: number;
}

export interface CreateTournamentMatchInput {
  tournament_id: number;
  phase: MatchPhase;
  tournament_group_id?: number | null;
  team1_id?: number | null;
  team2_id?: number | null;
  court_id?: number | null;
  match_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  match_order?: number | null;
  status?: MatchStatus;
}

export interface TournamentGroupsData {
  groups: TournamentGroup[];
  groupTeams: Array<TournamentGroupTeam & {
    team?: {
      id: number;
      display_name: string | null;
      seed_number: number | null;
      player1?: { first_name: string; last_name: string };
      player2?: { first_name: string; last_name: string };
    };
  }>;
  matches: Array<TournamentMatch & {
    team1?: {
      id: number;
      display_name: string | null;
      player1?: { first_name: string; last_name: string };
      player2?: { first_name: string; last_name: string };
    };
    team2?: {
      id: number;
      display_name: string | null;
      player1?: { first_name: string; last_name: string };
      player2?: { first_name: string; last_name: string };
    };
  }>;
  standings: TournamentGroupStanding[];
}

