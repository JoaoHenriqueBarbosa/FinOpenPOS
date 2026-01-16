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
    restricted_schedule_ids?: number[];
  }>> {
    // Query con todos los campos (Supabase ignorará los campos que no existan)
    // Intentamos incluir los nuevos campos pero manejamos el caso donde no existen
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
        display_order,
        is_substitute,
        schedule_notes,
        player1:player1_id (
          id,
          first_name,
          last_name
        ),
        player2:player2_id (
          id,
          first_name,
          last_name
        )
      `
      )
      .eq("tournament_id", tournamentId)
      .order("id", { ascending: true }); // Ordenar solo por id por ahora, luego ordenamos por display_order en memoria

    if (error) {
      // Si el error es por columnas faltantes, intentar query sin campos nuevos
      if (error.message.includes('column') && (error.message.includes('display_order') || error.message.includes('is_substitute') || error.message.includes('schedule_notes'))) {
        // Query fallback sin los campos nuevos
        const { data: fallbackData, error: fallbackError } = await this.supabase
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
              id,
              first_name,
              last_name
            ),
            player2:player2_id (
              id,
              first_name,
              last_name
            )
          `
          )
          .eq("tournament_id", tournamentId)
          .order("id", { ascending: true });
        
        if (fallbackError) {
          throw new Error(`Failed to fetch tournament teams: ${fallbackError.message}`);
        }
        
        // Procesar datos fallback con valores por defecto
        const teamIds = (fallbackData ?? []).map((t: any) => t.id);
        const restrictedSchedulesMap = new Map<number, Array<{ date: string; start_time: string; end_time: string }>>();
        
        if (teamIds.length > 0) {
          const { data: restrictions } = await this.supabase
            .from("tournament_team_schedule_restrictions")
            .select("tournament_team_id, date, start_time, end_time")
            .in("tournament_team_id", teamIds);
          
          if (restrictions) {
            restrictions.forEach((r: any) => {
              const teamId = r.tournament_team_id;
              if (!restrictedSchedulesMap.has(teamId)) {
                restrictedSchedulesMap.set(teamId, []);
              }
              restrictedSchedulesMap.get(teamId)!.push({
                date: r.date,
                start_time: r.start_time,
                end_time: r.end_time,
              });
            });
          }
        }
        
        const normalized = this.normalizeTeamData(fallbackData ?? [], restrictedSchedulesMap, true);
        // Ordenar por display_order (que será el index) y luego por id
        return normalized.sort((a, b) => {
          const orderA = a.display_order ?? 0;
          const orderB = b.display_order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.id - b.id;
        });
      }
      throw new Error(`Failed to fetch tournament teams: ${error.message}`);
    }

    // Obtener restricciones para cada equipo
    const teamIds = (data ?? []).map((t: any) => t.id);
    const restrictedSchedulesMap = new Map<number, Array<{ date: string; start_time: string; end_time: string }>>();
    
    if (teamIds.length > 0) {
      const { data: restrictions, error: restrictionsError } = await this.supabase
        .from("tournament_team_schedule_restrictions")
        .select("tournament_team_id, date, start_time, end_time")
        .in("tournament_team_id", teamIds);

      if (!restrictionsError && restrictions) {
        restrictions.forEach((r: any) => {
          const teamId = r.tournament_team_id;
          if (!restrictedSchedulesMap.has(teamId)) {
            restrictedSchedulesMap.set(teamId, []);
          }
          restrictedSchedulesMap.get(teamId)!.push({
            date: r.date,
            start_time: r.start_time,
            end_time: r.end_time,
          });
        });
      }
    }

    const normalized = this.normalizeTeamData(data ?? [], restrictedSchedulesMap, false);
    // Ordenar por display_order si está disponible, luego por id
    return normalized.sort((a, b) => {
      const orderA = a.display_order ?? 0;
      const orderB = b.display_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.id - b.id;
    });
  }

  /**
   * Normaliza los datos de equipos (helper method)
   */
  private normalizeTeamData(
    data: any[],
    restrictedSchedulesMap: Map<number, Array<{ date: string; start_time: string; end_time: string }>>,
    useDefaults: boolean
  ): Array<TournamentTeam & {
    player1?: { first_name: string; last_name: string };
    player2?: { first_name: string; last_name: string };
    restricted_schedule_ids?: number[];
  }> {
    return data.map((item: any, index: number) => {
      // Normalizar player1
      let player1 = undefined;
      if (item.player1) {
        if (Array.isArray(item.player1)) {
          const p = item.player1[0];
          if (p && p.first_name && p.last_name) {
            player1 = { first_name: p.first_name, last_name: p.last_name, id: p.id };
          }
        } else if (item.player1.first_name && item.player1.last_name) {
          player1 = { 
            first_name: item.player1.first_name, 
            last_name: item.player1.last_name,
            id: item.player1.id 
          };
        }
      }
      
      // Normalizar player2
      let player2 = undefined;
      if (item.player2) {
        if (Array.isArray(item.player2)) {
          const p = item.player2[0];
          if (p && p.first_name && p.last_name) {
            player2 = { first_name: p.first_name, last_name: p.last_name, id: p.id };
          }
        } else if (item.player2.first_name && item.player2.last_name) {
          player2 = { 
            first_name: item.player2.first_name, 
            last_name: item.player2.last_name,
            id: item.player2.id 
          };
        }
      }
      
      return {
        ...item,
        display_order: useDefaults ? index : (item.display_order ?? index),
        is_substitute: useDefaults ? false : (item.is_substitute ?? false),
        schedule_notes: useDefaults ? null : (item.schedule_notes ?? null),
        player1,
        player2,
        restricted_schedules: restrictedSchedulesMap.get(item.id) || [],
      };
    }) as unknown as Array<TournamentTeam & {
      player1?: { first_name: string; last_name: string };
      player2?: { first_name: string; last_name: string };
      restricted_schedule_ids?: number[];
    }>;
  }

  /**
   * Create a new tournament team
   */
  async create(input: CreateTournamentTeamInput): Promise<TournamentTeam> {
    // Si no se especifica display_order, obtener el máximo y sumar 1
    let displayOrder = input.display_order;
    if (displayOrder === undefined) {
      const { data: maxOrderData } = await this.supabase
        .from("tournament_teams")
        .select("display_order")
        .eq("tournament_id", input.tournament_id)
        .order("display_order", { ascending: false })
        .limit(1)
        .single();
      
      displayOrder = maxOrderData?.display_order !== undefined ? (maxOrderData.display_order + 1) : 0;
    }

    const { data, error } = await this.supabase
      .from("tournament_teams")
      .insert({
        tournament_id: input.tournament_id,
        player1_id: input.player1_id,
        player2_id: input.player2_id,
        display_name: input.display_name ?? null,
        seed_number: input.seed_number ?? null,
        notes: input.notes ?? null,
        display_order: displayOrder,
        is_substitute: input.is_substitute ?? false,
        schedule_notes: input.schedule_notes ?? null,
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
   * Update a tournament team
   */
  async update(
    teamId: number,
    updates: Partial<Omit<TournamentTeam, "id" | "tournament_id" | "user_uid" | "created_at">>
  ): Promise<TournamentTeam> {
    const { data, error } = await this.supabase
      .from("tournament_teams")
      .update(updates)
      .eq("id", teamId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update tournament team: ${error.message}`);
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
      .eq("id", teamId);

    if (error) {
      throw new Error(`Failed to delete tournament team: ${error.message}`);
    }
  }

  /**
   * Check if a player is already in a team for a tournament (excluding a specific team if provided)
   */
  async isPlayerInTournament(tournamentId: number, playerId: number, excludeTeamId?: number): Promise<boolean> {
    let query = this.supabase
      .from("tournament_teams")
      .select("id")
      .eq("tournament_id", tournamentId)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);
    
    if (excludeTeamId !== undefined) {
      query = query.neq("id", excludeTeamId);
    }
    
    const { data, error } = await query.limit(1);

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
        .in("tournament_group_id", groupIds),

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
          court_id,
          set1_team1_games,
          set1_team2_games,
          set2_team1_games,
          set2_team2_games,
          set3_team1_games,
          set3_team2_games,
          super_tiebreak_team1_points,
          super_tiebreak_team2_points,
          super_tiebreak_team1_points,
          super_tiebreak_team2_points,
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
      .eq("tournament_id", tournamentId);

    if (groupsError) {
      throw new Error(`Failed to fetch groups: ${groupsError.message}`);
    }

    if (!groups || groups.length === 0) {
      return; // Nothing to delete
    }

    const groupIds = groups.map((g) => g.id);

    // Delete in order (sequentially to avoid foreign key constraint violations):
    // 1. standings
    // 2. matches (must be deleted before groups due to foreign key)
    // 3. group_teams
    // 4. groups (last, after all dependencies are removed)

    // 1. Delete standings
    const standingsResult = await this.supabase
      .from("tournament_group_standings")
      .delete()
      .in("tournament_group_id", groupIds);

    if (standingsResult.error) {
      throw new Error(`Failed to delete standings: ${standingsResult.error.message}`);
    }

    // 2. Delete matches (CRITICAL: must be done before deleting groups)
    // Delete all group matches for this tournament, not just those in groupIds
    // to handle any edge cases where group_id might be null or mismatched
    const matchesResult = await this.supabase
      .from("tournament_matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("phase", "group");

    if (matchesResult.error) {
      throw new Error(`Failed to delete matches: ${matchesResult.error.message}`);
    }

    // 3. Delete group_teams
    const groupTeamsResult = await this.supabase
      .from("tournament_group_teams")
      .delete()
      .in("tournament_group_id", groupIds);

    if (groupTeamsResult.error) {
      throw new Error(`Failed to delete group teams: ${groupTeamsResult.error.message}`);
    }

    // 4. Finally, delete groups (after all dependencies are removed)
    const groupsResult = await this.supabase
      .from("tournament_groups")
      .delete()
      .eq("tournament_id", tournamentId);

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
        super_tiebreak_team1_points,
        super_tiebreak_team2_points,
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
      .select("id, tournament_group_id, team1_id, team2_id, match_order, status, set1_team1_games, court_id")
      .eq("tournament_id", tournamentId)
      .eq("phase", phase)
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
          court_id,
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
            player2:player2_id ( first_name, last_name ),
            standings:tournament_group_standings!team_id (
              position,
              group:tournament_group_id (
                name
              )
            )
          ),
          team2:team2_id (
            id,
            display_name,
            player1:player1_id ( first_name, last_name ),
            player2:player2_id ( first_name, last_name ),
            standings:tournament_group_standings!team_id (
              position,
              group:tournament_group_id (
                name
              )
            )
          )
        )
      `
      )
      .eq("tournament_id", tournamentId)
      .order("round", { ascending: true })
      .order("bracket_pos", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch playoffs: ${error.message}`);
    }

    // Normalize match relation (Supabase returns array for relations)
    return (data ?? []).map((item: any) => {
      const match = Array.isArray(item.match) ? (item.match[0] || undefined) : item.match;
      if (match) {
        // Normalize standings (Supabase returns array for relations)
        const normalizeStandings = (standings: any) => {
          if (!standings) return undefined;
          const standingsArray = Array.isArray(standings) ? standings : [standings];
          return standingsArray.map((s: any) => ({
            position: s.position,
            group: Array.isArray(s.group) ? (s.group[0] || undefined) : s.group,
          }));
        };

        return {
          ...item,
          match: {
            ...match,
            team1: match.team1 ? {
              ...(Array.isArray(match.team1) ? match.team1[0] : match.team1),
              standings: normalizeStandings(Array.isArray(match.team1) ? match.team1[0]?.standings : match.team1?.standings),
            } : undefined,
            team2: match.team2 ? {
              ...(Array.isArray(match.team2) ? match.team2[0] : match.team2),
              standings: normalizeStandings(Array.isArray(match.team2) ? match.team2[0]?.standings : match.team2?.standings),
            } : undefined,
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
          standings?: Array<{
            position: number;
            group?: { name: string };
          }>;
        };
        team2?: {
          id: number;
          display_name: string | null;
          player1?: { first_name: string; last_name: string };
          player2?: { first_name: string; last_name: string };
          standings?: Array<{
            position: number;
            group?: { name: string };
          }>;
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
        : Promise.resolve({ error: null }),
      this.supabase
        .from("tournament_playoffs")
        .delete()
        .eq("tournament_id", tournamentId),
    ]);

    if (matchesResult.error) {
      throw new Error(`Failed to delete playoff matches: ${matchesResult.error.message}`);
    }
    if (playoffsResult.error) {
      throw new Error(`Failed to delete playoffs: ${playoffsResult.error.message}`);
    }
  }
}

