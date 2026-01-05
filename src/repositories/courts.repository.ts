import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { CourtDB, CreateCourtInput } from "@/models/db/court";

export class CourtsRepository extends BaseRepository {
  /**
   * Get all courts, optionally filtered by active status
   */
  async findAll(onlyActive?: boolean): Promise<CourtDB[]> {
    let query = this.supabase
      .from("courts")
      .select("id, name, is_active");

    if (onlyActive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("id", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch courts: ${error.message}`);
    }

    return (data ?? []) as CourtDB[];
  }

  /**
   * Get a single court by ID
   */
  async findById(courtId: number): Promise<CourtDB | null> {
    const { data, error } = await this.supabase
      .from("courts")
      .select("id, name, is_active")
      .eq("id", courtId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch court: ${error.message}`);
    }

    return data as CourtDB;
  }

  /**
   * Create a new court
   */
  async create(input: CreateCourtInput): Promise<CourtDB> {
    const { data, error } = await this.supabase
      .from("courts")
      .insert({
        name: input.name,
        is_active: input.is_active ?? true,
        user_uid: this.userId,
      })
      .select("id, name, is_active")
      .single();

    if (error) {
      throw new Error(`Failed to create court: ${error.message}`);
    }

    return data as CourtDB;
  }

  /**
   * Update a court
   */
  async update(courtId: number, updates: Partial<Pick<CourtDB, "name" | "is_active">>): Promise<CourtDB> {
    const { data, error } = await this.supabase
      .from("courts")
      .update(updates)
      .eq("id", courtId)
      .select("id, name, is_active")
      .single();

    if (error) {
      throw new Error(`Failed to update court: ${error.message}`);
    }

    return data as CourtDB;
  }
}

