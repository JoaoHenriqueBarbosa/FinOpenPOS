import { BaseRepository } from "./base-repository";
import type { TournamentRegistrationPayment, CreateTournamentPaymentInput, UpdateTournamentPaymentInput } from "@/models/db/tournament-payment";

export class TournamentPaymentsRepository extends BaseRepository {
  /**
   * Obtener todos los pagos de inscripción de un torneo
   */
  async findByTournamentId(tournamentId: number): Promise<TournamentRegistrationPayment[]> {
    const { data, error } = await this.supabase
      .from("tournament_registration_payments")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tournament registration payments: ${error.message}`);
    }

    return (data ?? []) as TournamentRegistrationPayment[];
  }

  /**
   * Obtener pago de inscripción de un jugador específico en un equipo
   */
  async findByPlayerInTeam(
    teamId: number, 
    playerId: number
  ): Promise<TournamentRegistrationPayment | null> {
    const { data, error } = await this.supabase
      .from("tournament_registration_payments")
      .select("*")
      .eq("tournament_team_id", teamId)
      .eq("player_id", playerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // No encontrado
      }
      throw new Error(`Failed to fetch tournament registration payment: ${error.message}`);
    }

    return data as TournamentRegistrationPayment;
  }

  /**
   * Crear o actualizar pago de inscripción
   */
  async upsert(input: CreateTournamentPaymentInput): Promise<TournamentRegistrationPayment> {
    const payload = {
      ...input,
      user_uid: this.userId,
    };

    const { data, error } = await this.supabase
      .from("tournament_registration_payments")
      .upsert(payload, {
        onConflict: "tournament_team_id,player_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert tournament registration payment: ${error.message}`);
    }

    return data as TournamentRegistrationPayment;
  }

  /**
   * Actualizar pago de inscripción
   */
  async update(
    id: number,
    updates: UpdateTournamentPaymentInput
  ): Promise<TournamentRegistrationPayment> {
    const { data, error } = await this.supabase
      .from("tournament_registration_payments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update tournament registration payment: ${error.message}`);
    }

    return data as TournamentRegistrationPayment;
  }

  /**
   * Eliminar pago de inscripción
   */
  async delete(id: number): Promise<void> {
    const { error } = await this.supabase
      .from("tournament_registration_payments")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete tournament registration payment: ${error.message}`);
    }
  }

  /**
   * Obtener pagos por equipo (ambos jugadores)
   */
  async findByTeamId(teamId: number): Promise<TournamentRegistrationPayment[]> {
    const { data, error } = await this.supabase
      .from("tournament_registration_payments")
      .select("*")
      .eq("tournament_team_id", teamId)
      .order("player_id", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch team payments: ${error.message}`);
    }

    return (data ?? []) as TournamentRegistrationPayment[];
  }
}
