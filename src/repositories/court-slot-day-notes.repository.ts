import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";

export interface CourtSlotDayNoteDB {
  id: number;
  user_uid: string;
  slot_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCourtSlotDayNoteInput {
  slot_date: string;
  notes: string | null;
}

export interface UpdateCourtSlotDayNoteInput {
  notes: string | null;
}

export class CourtSlotDayNotesRepository extends BaseRepository {
  /**
   * Get day notes for a specific date
   */
  async findByDate(date: string): Promise<CourtSlotDayNoteDB | null> {
    const { data, error } = await this.supabase
      .from("court_slot_day_notes")
      .select("*")
      .eq("slot_date", date)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch day notes: ${error.message}`);
    }

    return data as CourtSlotDayNoteDB;
  }

  /**
   * Create or update day notes (upsert)
   */
  async upsert(input: CreateCourtSlotDayNoteInput): Promise<CourtSlotDayNoteDB> {
    const { data, error } = await this.supabase
      .from("court_slot_day_notes")
      .upsert(
        {
          user_uid: this.userId,
          slot_date: input.slot_date,
          notes: input.notes,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_uid,slot_date",
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert day notes: ${error.message}`);
    }

    return data as CourtSlotDayNoteDB;
  }

  /**
   * Update day notes
   */
  async update(
    date: string,
    updates: UpdateCourtSlotDayNoteInput
  ): Promise<CourtSlotDayNoteDB> {
    const { data, error } = await this.supabase
      .from("court_slot_day_notes")
      .update({
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("slot_date", date)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update day notes: ${error.message}`);
    }

    return data as CourtSlotDayNoteDB;
  }
}

