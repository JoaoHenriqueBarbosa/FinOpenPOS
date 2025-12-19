import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type {
  Tournament,
  TournamentStatus,
  TournamentTeam,
  TournamentGroup,
  TournamentGroupTeam,
  TournamentMatch,
  TournamentGroupStanding,
  TournamentPlayoff,
  MatchPhase,
  MatchStatus,
  CreateTournamentInput,
  CreateTournamentTeamInput,
  CreateTournamentGroupInput,
  CreateTournamentMatchInput,
  TournamentGroupsData,
} from "@/models/db/tournament";

export class TournamentsRepository extends BaseRepository {
  /**
   * Get all tournaments
   */
  async findAll(): Promise<Tournament[]> {
    const { data, error } = await this.supabase
      .from("tournaments")
      .select("*")
      .eq("user_uid", this.userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tournaments: ${error.message}`);
    }

    return (data ?? []) as Tournament[];
  }

  /**
   * Get a single tournament by ID
   */
  async findById(tournamentId: number): Promise<Tournament | null> {
    const { data, error } = await this.supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .eq("user_uid", this.userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch tournament: ${error.message}`);
    }

    return data as Tournament;
  }

  /**
   * Create a new tournament
   */
  async create(input: CreateTournamentInput): Promise<Tournament> {
    const { data, error } = await this.supabase
      .from("tournaments")
      .insert({
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? null,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        has_super_tiebreak: input.has_super_tiebreak ?? false,
        match_duration: input.match_duration ?? 60,
        status: "draft",
        user_uid: this.userId,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create tournament: ${error.message}`);
    }

    return data as Tournament;
  }

  /**
   * Update a tournament
   */
  async update(
    tournamentId: number,
    updates: Partial<Omit<Tournament, "id" | "user_uid" | "created_at">>
  ): Promise<Tournament> {
    const { data, error } = await this.supabase
      .from("tournaments")
      .update(updates)
      .eq("id", tournamentId)
      .eq("user_uid", this.userId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update tournament: ${error.message}`);
    }

    return data as Tournament;
  }
}

export class TournamentTeamsRepository extends BaseRepository {
  /**
   * Get all teams for a tournament
   */
  async findByTournamentId(tournamentId: number): Promise<Array<TournamentTeam & {
    player1?: { first_name: string; last_name: string };
    player2?: { first_name: string; last_name: string };
  }>> {
    const { data, error } = await this.supabase
      .from("tournament_teams")
      .select(
        `
        id,
        tournament_id,
        player1_id,
        player2_id,
        display_name,
        seed_number,
        notes,
        player1:player1_id (
          first_name,
          last_name
        ),
        player2:player2_id (
          first_name,
          last_name
        )
      `
      )
      .eq("tournament_id", tournamentId)
      .eq("user_uid", this.userId)
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tournament teams: ${error.message}`);
    }

    // Normalize player relations (Supabase returns arrays for relations)
    return (data ?? []).map((item: any) => ({
      ...item,
      player1: Array.isArray(item.player1) ? (item.player1[0] || undefined) : item.player1,
      player2: Array.isArray(item.player2) ? (item.player2[0] || undefined) : item.player2,
    })) as unknown as Array<TournamentTeam & {
      player1?: { first_name: string; last_name: string };
      player2?: { first_name: string; last_name: string };
    }>;
  }

  /**
   * Create a new tournament team
   */
  async create(input: CreateTournamentTeamInput): Promise<TournamentTeam> {
    const { data, error } = await this.supabase
      .from("tournament_teams")
      .insert({
        tournament_id: input.tournament_id,
        player1_id: input.player1_id,
        player2_id: input.player2_id,
        display_name: input.display_name ?? null,
        seed_number: input.seed_number ?? null,
        notes: input.notes ?? null,
        user_uid: this.userId,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create tournament team: ${error.message}`);
    }

    return data as TournamentTeam;
  }

  /**
   * Delete a tournament team
   */
  async delete(teamId: number): Promise<void> {
    const { error } = await this.supabase
      .from("tournament_teams")
      .delete()
      .eq("id", teamId)
      .eq("user_uid", this.userId);

    if (error) {
      throw new Error(`Failed to delete tournament team: ${error.message}`);
    }
  }

  /**
   * Check if a player is already in a team for a tournament
   */
  async isPlayerInTournament(tournamentId: number, playerId: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("tournament_teams")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", this.userId)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .limit(1);

    if (error) {
      throw new Error(`Failed to check player in tournament: ${error.message}`);
    }

    return (data?.length ?? 0) > 0;
  }
}

export class TournamentGroupsRepository extends BaseRepository {
  /**
   * Get all groups data for a tournament (groups, teams, matches, standings)
   */
  async getGroupsData(tournamentId: number): Promise<TournamentGroupsData> {
    // Get groups first
    const { data: groups, error: gError } = await this.supabase
      .from("tournament_groups")
      .select("id, name, group_order")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", this.userId)
      .order("group_order", { ascending: true });

    if (gError) {
      throw new Error(`Failed to fetch groups: ${gError.message}`);
    }

    if (!groups || groups.length === 0) {
      return { groups: [], groupTeams: [], matches: [], standings: [] };
    }

    const groupIds = groups.map((g) => g.id);

    // Execute remaining queries in parallel
    const [groupTeamsResult, matchesResult, standingsResult] = await Promise.all([
      // Group teams
      this.supabase
        .from("tournament_group_teams")
        .select(
          `
          id,
          tournament_group_id,
          team:team_id (
            id,
            display_name,
            seed_number,
            player1:player1_id ( first_name, last_name ),
            player2:player2_id ( first_name, last_name )
          )
        `
        )
        .in("tournament_group_id", groupIds)
        .eq("user_uid", this.userId),

      // Matches
      this.supabase
        .from("tournament_matches")
        .select(
          `
          id,
          tournament_group_id,
          phase,
          status,
          match_date,
          start_time,
          end_time,
          match_order,
          set1_team1_games,
          set1_team2_games,
          set2_team1_games,
          set2_team2_games,
          set3_team1_games,
          set3_team2_games,
          team1:team1_id (
            id,
            display_name,
            player1:player1_id ( first_name, last_name ),
            player2:player2_id ( first_name, last_name )
          ),
          team2:team2_id (
            id,
            display_name,
            player1:player1_id ( first_name, last_name ),
            player2:player2_id ( first_name, last_name )
          )
        `
        )
        .eq("tournament_id", tournamentId)
        .eq("phase", "group")
        .in("tournament_group_id", groupIds)
        .eq("user_uid", this.userId)
        .order("id", { ascending: true }),

      // Standings
      this.supabase
        .from("tournament_group_standings")
        .select(
          `
          id,
          tournament_group_id,
          team_id,
          position,
          matches_played,
          wins,
          losses,
          sets_won,
          sets_lost,
          games_won,
          games_lost
        `
        )
        .in("tournament_group_id", groupIds)
        .eq("user_uid", this.userId)
        .order("tournament_group_id", { ascending: true })
        .order("position", { ascending: true }),
    ]);

    if (groupTeamsResult.error) {
      throw new Error(`Failed to fetch group teams: ${groupTeamsResult.error.message}`);
    }

    if (matchesResult.error) {
      throw new Error(`Failed to fetch matches: ${matchesResult.error.message}`);
    }

    if (standingsResult.error) {
      // Don't fail, just log
      console.error("Failed to fetch standings:", standingsResult.error);
    }

    // Normalize relations (Supabase returns arrays for relations)
    const normalizedGroupTeams = (groupTeamsResult.data ?? []).map((item: any) => ({
      ...item,
      team: Array.isArray(item.team) ? (item.team[0] || undefined) : item.team,
    })) as unknown as TournamentGroupsData["groupTeams"];

    const normalizedMatches = (matchesResult.data ?? []).map((item: any) => ({
      ...item,
      team1: Array.isArray(item.team1) ? (item.team1[0] || undefined) : item.team1,
      team2: Array.isArray(item.team2) ? (item.team2[0] || undefined) : item.team2,
    })) as unknown as TournamentGroupsData["matches"];

    return {
      groups: groups as TournamentGroup[],
      groupTeams: normalizedGroupTeams,
      matches: normalizedMatches,
      standings: (standingsResult.data ?? []) as TournamentGroupStanding[],
    };
  }

  /**
   * Delete all groups for a tournament
   */
  async deleteByTournamentId(tournamentId: number): Promise<void> {
    // Get all groups first
    const { data: groups, error: groupsError } = await this.supabase
      .from("tournament_groups")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", this.userId);

    if (groupsError) {
      throw new Error(`Failed to fetch groups: ${groupsError.message}`);
    }

    if (!groups || groups.length === 0) {
      return; // Nothing to delete
    }

    const groupIds = groups.map((g) => g.id);

    // Delete in order: standings, matches, group_teams, groups
    const [standingsResult, matchesResult, groupTeamsResult, groupsResult] = await Promise.all([
      this.supabase
        .from("tournament_group_standings")
        .delete()
        .in("tournament_group_id", groupIds)
        .eq("user_uid", this.userId),
      this.supabase
        .from("tournament_matches")
        .delete()
        .eq("tournament_id", tournamentId)
        .eq("phase", "group")
        .in("tournament_group_id", groupIds)
        .eq("user_uid", this.userId),
      this.supabase
        .from("tournament_group_teams")
        .delete()
        .in("tournament_group_id", groupIds)
        .eq("user_uid", this.userId),
      this.supabase
        .from("tournament_groups")
        .delete()
        .eq("tournament_id", tournamentId)
        .eq("user_uid", this.userId),
    ]);

    if (standingsResult.error) {
      throw new Error(`Failed to delete standings: ${standingsResult.error.message}`);
    }
    if (matchesResult.error) {
      throw new Error(`Failed to delete matches: ${matchesResult.error.message}`);
    }
    if (groupTeamsResult.error) {
      throw new Error(`Failed to delete group teams: ${groupTeamsResult.error.message}`);
    }
    if (groupsResult.error) {
      throw new Error(`Failed to delete groups: ${groupsResult.error.message}`);
    }
  }
}

export class TournamentMatchesRepository extends BaseRepository {
  /**
   * Get matches for a tournament by phase
   */
  async findByTournamentAndPhase(tournamentId: number, phase: MatchPhase): Promise<Array<TournamentMatch & {
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
  }>> {
    const { data, error } = await this.supabase
      .from("tournament_matches")
      .select(
        `
        id,
        tournament_id,
        phase,
        tournament_group_id,
        team1_id,
        team2_id,
        court_id,
        match_date,
        start_time,
        end_time,
        match_order,
        status,
        set1_team1_games,
        set1_team2_games,
        set2_team1_games,
        set2_team2_games,
        set3_team1_games,
        set3_team2_games,
        team1_sets,
        team2_sets,
        team1_games_total,
        team2_games_total,
        team1:team1_id (
          id,
          display_name,
          player1:player1_id ( first_name, last_name ),
          player2:player2_id ( first_name, last_name )
        ),
        team2:team2_id (
          id,
          display_name,
          player1:player1_id ( first_name, last_name ),
          player2:player2_id ( first_name, last_name )
        )
      `
      )
      .eq("tournament_id", tournamentId)
      .eq("phase", phase)
      .eq("user_uid", this.userId)
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }

    // Normalize team relations (Supabase returns arrays for relations)
    return (data ?? []).map((item: any) => ({
      ...item,
      team1: Array.isArray(item.team1) ? (item.team1[0] || undefined) : item.team1,
      team2: Array.isArray(item.team2) ? (item.team2[0] || undefined) : item.team2,
    })) as unknown as Array<TournamentMatch & {
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
  }

  /**
   * Get matches without results (for scheduling)
   */
  async findWithoutResults(tournamentId: number, phase: MatchPhase): Promise<TournamentMatch[]> {
    const { data, error } = await this.supabase
      .from("tournament_matches")
      .select("id, tournament_group_id, team1_id, team2_id, match_order, status, set1_team1_games")
      .eq("tournament_id", tournamentId)
      .eq("phase", phase)
      .eq("user_uid", this.userId)
      .is("set1_team1_games", null);

    if (error) {
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }

    return (data ?? []) as TournamentMatch[];
  }

  /**
   * Create a new match
   */
  async create(input: CreateTournamentMatchInput): Promise<TournamentMatch> {
    const { data, error } = await this.supabase
      .from("tournament_matches")
      .insert({
        tournament_id: input.tournament_id,
        phase: input.phase,
        tournament_group_id: input.tournament_group_id ?? null,
        team1_id: input.team1_id ?? null,
        team2_id: input.team2_id ?? null,
        court_id: input.court_id ?? null,
        match_date: input.match_date ?? null,
        start_time: input.start_time ?? null,
        end_time: input.end_time ?? null,
        match_order: input.match_order ?? null,
        status: input.status ?? "scheduled",
        team1_sets: 0,
        team2_sets: 0,
        team1_games_total: 0,
        team2_games_total: 0,
        user_uid: this.userId,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create match: ${error.message}`);
    }

    return data as TournamentMatch;
  }

  /**
   * Create multiple matches in bulk
   */
  async createMany(inputs: CreateTournamentMatchInput[]): Promise<TournamentMatch[]> {
    const matches = inputs.map((input) => ({
      tournament_id: input.tournament_id,
      phase: input.phase,
      tournament_group_id: input.tournament_group_id ?? null,
      team1_id: input.team1_id ?? null,
      team2_id: input.team2_id ?? null,
      court_id: input.court_id ?? null,
      match_date: input.match_date ?? null,
      start_time: input.start_time ?? null,
      end_time: input.end_time ?? null,
      match_order: input.match_order ?? null,
      status: input.status ?? "scheduled",
      team1_sets: 0,
      team2_sets: 0,
      team1_games_total: 0,
      team2_games_total: 0,
      user_uid: this.userId,
    }));

    const { data, error } = await this.supabase
      .from("tournament_matches")
      .insert(matches)
      .select("*");

    if (error) {
      throw new Error(`Failed to create matches: ${error.message}`);
    }

    return (data ?? []) as TournamentMatch[];
  }

  /**
   * Update a match
   */
  async update(
    matchId: number,
    updates: Partial<Omit<TournamentMatch, "id" | "tournament_id" | "user_uid">>
  ): Promise<TournamentMatch> {
    const { data, error } = await this.supabase
      .from("tournament_matches")
      .update(updates)
      .eq("id", matchId)
      .eq("user_uid", this.userId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update match: ${error.message}`);
    }

    return data as TournamentMatch;
  }

  /**
   * Update multiple matches (for scheduling)
   */
  async updateMany(
    updates: Array<{
      id: number;
      updates: Partial<Omit<TournamentMatch, "id" | "tournament_id" | "user_uid">>;
    }>
  ): Promise<void> {
    // Supabase doesn't support bulk updates with different values, so we do them in parallel
    await Promise.all(
      updates.map(({ id, updates: matchUpdates }) =>
        this.supabase
          .from("tournament_matches")
          .update(matchUpdates)
          .eq("id", id)
          .eq("user_uid", this.userId)
      )
    );
  }

  /**
   * Get a single match by ID
   */
  async findById(matchId: number): Promise<TournamentMatch | null> {
    const { data, error } = await this.supabase
      .from("tournament_matches")
      .select("*")
      .eq("id", matchId)
      .eq("user_uid", this.userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch match: ${error.message}`);
    }

    return data as TournamentMatch;
  }
}

export class TournamentPlayoffsRepository extends BaseRepository {
  /**
   * Get all playoffs for a tournament
   */
  async findByTournamentId(tournamentId: number): Promise<Array<TournamentPlayoff & {
    match?: TournamentMatch & {
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
    };
  }>> {
    const { data, error } = await this.supabase
      .from("tournament_playoffs")
      .select(
        `
        id,
        round,
        bracket_pos,
        source_team1,
        source_team2,
        match:match_id (
          id,
          status,
          match_date,
          start_time,
          set1_team1_games,
          set1_team2_games,
          set2_team1_games,
          set2_team2_games,
          set3_team1_games,
          set3_team2_games,
          team1:team1_id (
            id,
            display_name,
            player1:player1_id ( first_name, last_name ),
            player2:player2_id ( first_name, last_name )
          ),
          team2:team2_id (
            id,
            display_name,
            player1:player1_id ( first_name, last_name ),
            player2:player2_id ( first_name, last_name )
          )
        )
      `
      )
      .eq("tournament_id", tournamentId)
      .eq("user_uid", this.userId)
      .order("round", { ascending: true })
      .order("bracket_pos", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch playoffs: ${error.message}`);
    }

    // Normalize match relation (Supabase returns array for relations)
    return (data ?? []).map((item: any) => {
      const match = Array.isArray(item.match) ? (item.match[0] || undefined) : item.match;
      if (match) {
        return {
          ...item,
          match: {
            ...match,
            team1: Array.isArray(match.team1) ? (match.team1[0] || undefined) : match.team1,
            team2: Array.isArray(match.team2) ? (match.team2[0] || undefined) : match.team2,
          },
        };
      }
      return { ...item, match: undefined };
    }) as unknown as Array<TournamentPlayoff & {
      match?: TournamentMatch & {
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
      };
    }>;
  }

  /**
   * Check if playoffs exist for a tournament
   */
  async existsForTournament(tournamentId: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("tournament_playoffs")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", this.userId)
      .limit(1);

    if (error) {
      throw new Error(`Failed to check playoffs: ${error.message}`);
    }

    return (data?.length ?? 0) > 0;
  }

  /**
   * Delete all playoffs for a tournament
   */
  async deleteByTournamentId(tournamentId: number): Promise<void> {
    // Get playoffs first to get match IDs
    const { data: playoffs, error: playoffsError } = await this.supabase
      .from("tournament_playoffs")
      .select("match_id")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", this.userId);

    if (playoffsError) {
      throw new Error(`Failed to fetch playoffs: ${playoffsError.message}`);
    }

    if (!playoffs || playoffs.length === 0) {
      return; // Nothing to delete
    }

    const matchIds = playoffs.map((p) => p.match_id).filter((id): id is number => id !== null);

    // Delete matches and playoffs in parallel
    const [matchesResult, playoffsResult] = await Promise.all([
      matchIds.length > 0
        ? this.supabase
            .from("tournament_matches")
            .delete()
            .in("id", matchIds)
            .eq("tournament_id", tournamentId)
            .eq("phase", "playoff")
            .eq("user_uid", this.userId)
        : Promise.resolve({ error: null }),
      this.supabase
        .from("tournament_playoffs")
        .delete()
        .eq("tournament_id", tournamentId)
        .eq("user_uid", this.userId),
    ]);

    if (matchesResult.error) {
      throw new Error(`Failed to delete playoff matches: ${matchesResult.error.message}`);
    }
    if (playoffsResult.error) {
      throw new Error(`Failed to delete playoffs: ${playoffsResult.error.message}`);
    }
  }
}

