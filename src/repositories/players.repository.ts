import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { Player, PlayerStatus, CreatePlayerInput, FindPlayersOptions } from "@/models/db/player";

export class PlayersRepository extends BaseRepository {
  /**
   * Get all players with optional filters
   */
  async findAll(options: FindPlayersOptions = {}): Promise<Player[]> {
    let query = this.supabase
      .from("players")
      .select("id, first_name, last_name, phone, status, created_at")
      .eq("user_uid", this.userId);

    if (options.onlyActive) {
      query = query.eq("status", "active");
    }

    if (options.search && options.search.trim() !== "") {
      const searchTerm = options.search.trim();
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
      );
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch players: ${error.message}`);
    }

    return (data ?? []) as Player[];
  }

  /**
   * Get a single player by ID
   */
  async findById(playerId: number): Promise<Player | null> {
    const { data, error } = await this.supabase
      .from("players")
      .select("id, first_name, last_name, phone, status, created_at")
      .eq("id", playerId)
      .eq("user_uid", this.userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch player: ${error.message}`);
    }

    return data as Player;
  }

  /**
   * Create a new player
   */
  async create(input: CreatePlayerInput): Promise<Player> {
    const { data, error } = await this.supabase
      .from("players")
      .insert({
        user_uid: this.userId,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        phone: input.phone,
        status: input.status ?? "active",
      })
      .select("id, first_name, last_name, phone, status, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to create player: ${error.message}`);
    }

    return data as Player;
  }

  /**
   * Update a player
   */
  async update(playerId: number, updates: Partial<Pick<Player, "first_name" | "last_name" | "phone" | "status">>): Promise<Player> {
    const { data, error } = await this.supabase
      .from("players")
      .update(updates)
      .eq("id", playerId)
      .eq("user_uid", this.userId)
      .select("id, first_name, last_name, phone, status, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to update player: ${error.message}`);
    }

    return data as Player;
  }

  /**
   * Delete a player (soft delete by setting status to inactive)
   */
  async delete(playerId: number): Promise<void> {
    const { error } = await this.supabase
      .from("players")
      .update({ status: "inactive" })
      .eq("id", playerId)
      .eq("user_uid", this.userId);

    if (error) {
      throw new Error(`Failed to delete player: ${error.message}`);
    }
  }
}

