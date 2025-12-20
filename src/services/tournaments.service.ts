import { TournamentPlayoff, TournamentTeam } from "@/models/db";
import type { ApiResponseStandings, GroupsApiResponse, PlayoffRow, TeamDTO, TournamentDTO, AvailableSchedule } from "@/models/dto/tournament";

export interface CreateTournamentInput {
  name: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_teams?: number | null;
  format?: string | null;
  description?: string | null;
}

export interface CreateTournamentTeamInput {
  player1_id: number;
  player2_id: number;
}

export interface RegenerateScheduleInput {
  days: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
  matchDuration: number;
  courtIds: number[];
}

class TournamentsService {
  private baseUrl = "/api/tournaments";

  async getAll(): Promise<TournamentDTO[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch tournaments");
    }
    return response.json();
  }

  async getById(id: number): Promise<TournamentDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch tournament");
    }
    return response.json();
  }

  async create(input: CreateTournamentInput): Promise<TournamentDTO> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error creating tournament");
    }
    return response.json();
  }

  async getGroups(tournamentId: number): Promise<GroupsApiResponse> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/groups`);
    if (!response.ok) {
      throw new Error("Failed to fetch tournament groups");
    }
    return response.json();
  }

  async getTeams(tournamentId: number): Promise<TeamDTO[]> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/teams`);
    if (!response.ok) {
      throw new Error("Failed to fetch tournament teams");
    }
    return response.json();
  }

  async createTeam(tournamentId: number, input: CreateTournamentTeamInput): Promise<TournamentTeam> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || "Error al crear el equipo";
      throw new Error(errorMessage);
    }
    return response.json();
  }

  async deleteTeam(tournamentId: number, teamId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/teams`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ team_id: teamId }),
    });
    if (!response.ok) {
      throw new Error("Error deleting tournament team");
    }
  }

  async getAvailableSchedules(tournamentId: number, grouped: boolean = false): Promise<AvailableSchedule[]> {
    const url = grouped 
      ? `${this.baseUrl}/${tournamentId}/available-schedules?grouped=true`
      : `${this.baseUrl}/${tournamentId}/available-schedules`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch available schedules");
    }
    return response.json();
  }

  async updateAvailableSchedules(
    tournamentId: number,
    schedules: Omit<AvailableSchedule, "id" | "tournament_id">[]
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/available-schedules`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ schedules }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || "Error al actualizar horarios disponibles";
      throw new Error(errorMessage);
    }
  }

  async updateTeamRestrictions(
    tournamentId: number,
    teamId: number,
    restrictedScheduleIds: number[]
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/teams/${teamId}/restrictions`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ restricted_schedule_ids: restrictedScheduleIds }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || "Error al actualizar restricciones horarias";
      throw new Error(errorMessage);
    }
  }

  async getStandings(tournamentId: number): Promise<ApiResponseStandings> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/standings`);
    if (!response.ok) {
      throw new Error("Failed to fetch tournament standings");
    }
    return response.json();
  }

  async getPlayoffs(tournamentId: number): Promise<PlayoffRow[]> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/playoffs`);
    if (!response.ok) {
      throw new Error("Failed to fetch tournament playoffs");
    }
    const data = await response.json();
    // Transform repository response to PlayoffRow[] format
    // The repository returns match as optional, but PlayoffRow requires it (can be null)
    return data.map((item: any) => ({
      ...item,
      match: item.match ?? null,
    }));
  }

  async regenerateSchedule(tournamentId: number, input: RegenerateScheduleInput): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/regenerate-schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || "Error al regenerar horarios";
      throw new Error(errorMessage);
    }
    return response.json();
  }

  async closeRegistration(tournamentId: number, scheduleConfig?: ScheduleConfig): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${tournamentId}/close-registration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scheduleConfig || {}),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || "Error closing registration";
      throw new Error(errorMessage);
    }
  }
}

class TournamentMatchesService {
  private baseUrl = "/api/tournament-matches";

  async scheduleMatch(matchId: number, input: { date: string; start_time: string; end_time?: string; court_id?: number }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${matchId}/schedule`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        match_date: input.date,
        start_time: input.start_time,
        end_time: input.end_time,
        court_id: input.court_id,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || "Error scheduling match");
    }
  }
}

export const tournamentsService = new TournamentsService();
export const tournamentMatchesService = new TournamentMatchesService();

