// DTOs (Data Transfer Objects) for tournaments
// These types include relations and computed fields for API responses and UI

import type { TournamentStatus, MatchPhase, MatchStatus } from "../db/tournament";
import type { Player } from "../db/player";

// Tournament DTOs
export interface TournamentDTO {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  status: TournamentStatus;
  has_super_tiebreak: boolean;
  match_duration: number;
  start_date?: string | null;
  end_date?: string | null;
}

// Tournament with minimal fields for lists
export interface TournamentListItem {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  status: TournamentStatus;
}

// Reusable Player nested DTO (shared type)
export type PlayerNestedDTO = {
  id: number;
  first_name: string;
  last_name: string;
};

// Team DTOs
export interface TeamPlayer extends PlayerNestedDTO {}

export interface AvailableSchedule {
  id: number;
  tournament_id: number;
  date: string; // YYYY-MM-DD - Fecha específica
  start_time: string; // HH:MM
  end_time: string; // HH:MM
}

export interface TeamDTO {
  id: number;
  display_name: string | null;
  seed_number: number | null;
  player1: TeamPlayer;
  player2: TeamPlayer;
  restricted_schedule_ids?: number[]; // IDs de horarios disponibles que el equipo NO puede jugar
}

// Group DTOs
export interface GroupDTO {
  id: number;
  name: string;
  group_order?: number;
}

export interface GroupTeamDTO {
  id: number;
  tournament_group_id: number;
  team: TeamDTO | null;
}

// Match DTOs
export interface MatchDTO {
  id: number;
  tournament_group_id: number | null;
  phase: MatchPhase;
  status: MatchStatus;
  match_date: string | null;
  start_time: string | null;
  end_time: string | null;
  match_order?: number | null;
  set1_team1_games: number | null;
  set1_team2_games: number | null;
  set2_team1_games: number | null;
  set2_team2_games: number | null;
  set3_team1_games: number | null;
  set3_team2_games: number | null;
  team1: TeamDTO | null;
  team2: TeamDTO | null;
}

// Standing DTOs
export interface StandingDTO {
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
  team?: TeamDTO; // Optional team relation
}

// Playoff DTOs
export interface PlayoffRow {
  id: number;
  tournament_id: number;
  round: string;
  bracket_pos: number;
  source_team1: string | null;
  source_team2: string | null;
  match: {
    id: number;
    team1_id: number | null;
    team2_id: number | null;
    status: MatchStatus;
    match_date: string | null;
    start_time: string | null;
    end_time: string | null;
    set1_team1_games: number | null;
    set1_team2_games: number | null;
    set2_team1_games: number | null;
    set2_team2_games: number | null;
    set3_team1_games: number | null;
    set3_team2_games: number | null;
    team1: TeamDTO | null;
    team2: TeamDTO | null;
  } | null;
}

// API Response DTOs
export interface GroupsApiResponse {
  groups: GroupDTO[];
  groupTeams: GroupTeamDTO[];
  matches: MatchDTO[];
  standings?: StandingDTO[];
}

export interface TeamsApiResponse {
  teams: TeamDTO[];
}

export interface PlayoffsApiResponse {
  rows: PlayoffRow[];
}

export interface ApiResponseStandings {
  groups: GroupDTO[];
  standings: StandingDTO[];
  matches: MatchDTO[];
  groupTeams?: GroupTeamDTO[];
}

// Schedule DTOs
export interface ScheduleDay {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export interface ScheduleConfig {
  days: ScheduleDay[];
  matchDuration: number; // minutes
  courtIds: number[];
}

