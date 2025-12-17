import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./base-repository";
import type { CourtSlotDB, CreateCourtSlotInput, CourtSlotWithCourt } from "@/models/db/court";

export class CourtSlotsRepository extends BaseRepository {
  /**
   * Get court slots for a specific date
   */
  async findByDate(date: string): Promise<CourtSlotWithCourt[]> {
    const { data, error } = await this.supabase
      .from("court_slots")
      .select(
        `
        id,
        user_uid,
        court_id,
        slot_date,
        start_time,
        end_time,
        was_played,
        notes,
        player1_payment_method_id,
        player1_note,
        player2_payment_method_id,
        player2_note,
        player3_payment_method_id,
        player3_note,
        player4_payment_method_id,
        player4_note,
        created_at,
        court:court_id (
          id,
          name
        ),
        player1_payment_method:player1_payment_method_id (
          id,
          name
        ),
        player2_payment_method:player2_payment_method_id (
          id,
          name
        ),
        player3_payment_method:player3_payment_method_id (
          id,
          name
        ),
        player4_payment_method:player4_payment_method_id (
          id,
          name
        )
      `
      )
      .eq("user_uid", this.userId)
      .eq("slot_date", date)
      .order("start_time", { ascending: true })
      .order("court_id", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch court slots: ${error.message}`);
    }

    // Normalize relations (Supabase returns array for relations)
    return (data ?? []).map((item: any) => ({
      ...item,
      court: Array.isArray(item.court) ? (item.court[0] || null) : item.court,
      player1_payment_method: Array.isArray(item.player1_payment_method) ? (item.player1_payment_method[0] || null) : item.player1_payment_method,
      player2_payment_method: Array.isArray(item.player2_payment_method) ? (item.player2_payment_method[0] || null) : item.player2_payment_method,
      player3_payment_method: Array.isArray(item.player3_payment_method) ? (item.player3_payment_method[0] || null) : item.player3_payment_method,
      player4_payment_method: Array.isArray(item.player4_payment_method) ? (item.player4_payment_method[0] || null) : item.player4_payment_method,
    })) as CourtSlotWithCourt[];
  }

  /**
   * Get a single court slot by ID
   */
  async findById(slotId: number): Promise<CourtSlotWithCourt | null> {
    const { data, error } = await this.supabase
      .from("court_slots")
      .select(
        `
        id,
        user_uid,
        court_id,
        slot_date,
        start_time,
        end_time,
        was_played,
        notes,
        player1_payment_method_id,
        player1_note,
        player2_payment_method_id,
        player2_note,
        player3_payment_method_id,
        player3_note,
        player4_payment_method_id,
        player4_note,
        created_at,
        court:court_id (
          id,
          name
        ),
        player1_payment_method:player1_payment_method_id (
          id,
          name
        ),
        player2_payment_method:player2_payment_method_id (
          id,
          name
        ),
        player3_payment_method:player3_payment_method_id (
          id,
          name
        ),
        player4_payment_method:player4_payment_method_id (
          id,
          name
        )
      `
      )
      .eq("id", slotId)
      .eq("user_uid", this.userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch court slot: ${error.message}`);
    }

    // Normalize relations (Supabase returns array for relations)
    const normalized = {
      ...data,
      court: Array.isArray(data.court) ? (data.court[0] || null) : data.court,
      player1_payment_method: Array.isArray(data.player1_payment_method) ? (data.player1_payment_method[0] || null) : data.player1_payment_method,
      player2_payment_method: Array.isArray(data.player2_payment_method) ? (data.player2_payment_method[0] || null) : data.player2_payment_method,
      player3_payment_method: Array.isArray(data.player3_payment_method) ? (data.player3_payment_method[0] || null) : data.player3_payment_method,
      player4_payment_method: Array.isArray(data.player4_payment_method) ? (data.player4_payment_method[0] || null) : data.player4_payment_method,
    };
    return normalized as CourtSlotWithCourt;
  }

  /**
   * Create a new court slot
   */
  async create(input: CreateCourtSlotInput): Promise<CourtSlotWithCourt> {
    const { data, error } = await this.supabase
      .from("court_slots")
      .insert({
        court_id: input.court_id,
        slot_date: input.slot_date,
        start_time: input.start_time,
        end_time: input.end_time,
        was_played: input.was_played ?? true, // Default to played
        notes: input.notes ?? null,
        player1_payment_method_id: input.player1_payment_method_id ?? null,
        player1_note: input.player1_note ?? null,
        player2_payment_method_id: input.player2_payment_method_id ?? null,
        player2_note: input.player2_note ?? null,
        player3_payment_method_id: input.player3_payment_method_id ?? null,
        player3_note: input.player3_note ?? null,
        player4_payment_method_id: input.player4_payment_method_id ?? null,
        player4_note: input.player4_note ?? null,
        user_uid: this.userId,
      })
      .select(
        `
        id,
        user_uid,
        court_id,
        slot_date,
        start_time,
        end_time,
        was_played,
        notes,
        player1_payment_method_id,
        player1_note,
        player2_payment_method_id,
        player2_note,
        player3_payment_method_id,
        player3_note,
        player4_payment_method_id,
        player4_note,
        created_at,
        court:court_id (
          id,
          name
        ),
        player1_payment_method:player1_payment_method_id (
          id,
          name
        ),
        player2_payment_method:player2_payment_method_id (
          id,
          name
        ),
        player3_payment_method:player3_payment_method_id (
          id,
          name
        ),
        player4_payment_method:player4_payment_method_id (
          id,
          name
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create court slot: ${error.message}`);
    }

    // Normalize relations (Supabase returns array for relations)
    const normalized = {
      ...data,
      court: Array.isArray(data.court) ? (data.court[0] || null) : data.court,
      player1_payment_method: Array.isArray(data.player1_payment_method) ? (data.player1_payment_method[0] || null) : data.player1_payment_method,
      player2_payment_method: Array.isArray(data.player2_payment_method) ? (data.player2_payment_method[0] || null) : data.player2_payment_method,
      player3_payment_method: Array.isArray(data.player3_payment_method) ? (data.player3_payment_method[0] || null) : data.player3_payment_method,
      player4_payment_method: Array.isArray(data.player4_payment_method) ? (data.player4_payment_method[0] || null) : data.player4_payment_method,
    };
    return normalized as CourtSlotWithCourt;
  }

  /**
   * Create multiple court slots in bulk
   */
  async createMany(inputs: CreateCourtSlotInput[]): Promise<CourtSlotWithCourt[]> {
    const slots = inputs.map((input) => ({
      court_id: input.court_id,
      slot_date: input.slot_date,
      start_time: input.start_time,
      end_time: input.end_time,
      was_played: input.was_played ?? true, // Default to played
      notes: input.notes ?? null,
      player1_payment_method_id: input.player1_payment_method_id ?? null,
      player1_note: input.player1_note ?? null,
      player2_payment_method_id: input.player2_payment_method_id ?? null,
      player2_note: input.player2_note ?? null,
      player3_payment_method_id: input.player3_payment_method_id ?? null,
      player3_note: input.player3_note ?? null,
      player4_payment_method_id: input.player4_payment_method_id ?? null,
      player4_note: input.player4_note ?? null,
      user_uid: this.userId,
    }));

    const { data, error } = await this.supabase
      .from("court_slots")
      .insert(slots)
      .select(
        `
        id,
        user_uid,
        court_id,
        slot_date,
        start_time,
        end_time,
        was_played,
        notes,
        player1_payment_method_id,
        player1_note,
        player2_payment_method_id,
        player2_note,
        player3_payment_method_id,
        player3_note,
        player4_payment_method_id,
        player4_note,
        created_at,
        court:court_id (
          id,
          name
        ),
        player1_payment_method:player1_payment_method_id (
          id,
          name
        ),
        player2_payment_method:player2_payment_method_id (
          id,
          name
        ),
        player3_payment_method:player3_payment_method_id (
          id,
          name
        ),
        player4_payment_method:player4_payment_method_id (
          id,
          name
        )
      `
      );

    if (error) {
      throw new Error(`Failed to create court slots: ${error.message}`);
    }

    // Normalize relations (Supabase returns array for relations)
    return (data ?? []).map((item: any) => ({
      ...item,
      court: Array.isArray(item.court) ? (item.court[0] || null) : item.court,
      player1_payment_method: Array.isArray(item.player1_payment_method) ? (item.player1_payment_method[0] || null) : item.player1_payment_method,
      player2_payment_method: Array.isArray(item.player2_payment_method) ? (item.player2_payment_method[0] || null) : item.player2_payment_method,
      player3_payment_method: Array.isArray(item.player3_payment_method) ? (item.player3_payment_method[0] || null) : item.player3_payment_method,
      player4_payment_method: Array.isArray(item.player4_payment_method) ? (item.player4_payment_method[0] || null) : item.player4_payment_method,
    })) as CourtSlotWithCourt[];
  }

  /**
   * Update a court slot
   */
  async update(
    slotId: number,
    updates: Partial<Omit<CourtSlotDB, "id" | "user_uid" | "created_at">>
  ): Promise<CourtSlotWithCourt> {
    const { data, error } = await this.supabase
      .from("court_slots")
      .update(updates)
      .eq("id", slotId)
      .eq("user_uid", this.userId)
      .select(
        `
        id,
        user_uid,
        court_id,
        slot_date,
        start_time,
        end_time,
        was_played,
        notes,
        player1_payment_method_id,
        player1_note,
        player2_payment_method_id,
        player2_note,
        player3_payment_method_id,
        player3_note,
        player4_payment_method_id,
        player4_note,
        created_at,
        court:court_id (
          id,
          name
        ),
        player1_payment_method:player1_payment_method_id (
          id,
          name
        ),
        player2_payment_method:player2_payment_method_id (
          id,
          name
        ),
        player3_payment_method:player3_payment_method_id (
          id,
          name
        ),
        player4_payment_method:player4_payment_method_id (
          id,
          name
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to update court slot: ${error.message}`);
    }

    // Normalize relations (Supabase returns array for relations)
    const normalized = {
      ...data,
      court: Array.isArray(data.court) ? (data.court[0] || null) : data.court,
      player1_payment_method: Array.isArray(data.player1_payment_method) ? (data.player1_payment_method[0] || null) : data.player1_payment_method,
      player2_payment_method: Array.isArray(data.player2_payment_method) ? (data.player2_payment_method[0] || null) : data.player2_payment_method,
      player3_payment_method: Array.isArray(data.player3_payment_method) ? (data.player3_payment_method[0] || null) : data.player3_payment_method,
      player4_payment_method: Array.isArray(data.player4_payment_method) ? (data.player4_payment_method[0] || null) : data.player4_payment_method,
    };
    return normalized as CourtSlotWithCourt;
  }

  /**
   * Count slots for a specific date
   */
  async countByDate(date: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("court_slots")
      .select("*", { count: "exact", head: true })
      .eq("user_uid", this.userId)
      .eq("slot_date", date);

    if (error) {
      throw new Error(`Failed to count court slots: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Delete a court slot
   */
  async delete(slotId: number): Promise<void> {
    const { error } = await this.supabase
      .from("court_slots")
      .delete()
      .eq("id", slotId)
      .eq("user_uid", this.userId);

    if (error) {
      throw new Error(`Failed to delete court slot: ${error.message}`);
    }
  }

  /**
   * Generate slots for a date
   * Returns existing slots if they already exist for that date
   */
  async generateSlotsForDate(
    date: string,
    config: {
      startHour: string;
      endHour: string;
      durationMinutes: number;
    },
    courtIds: number[]
  ): Promise<CourtSlotWithCourt[]> {
    // Check if slots already exist
    const existingSlots = await this.findByDate(date);
    if (existingSlots.length > 0) {
      return existingSlots;
    }

    // Generate time slots
    const [year, month, day] = date.split('-').map(Number);
    const [startH, startM] = config.startHour.split(':').map(Number);
    const [endH, endM] = config.endHour.split(':').map(Number);

    let current = new Date(year, month - 1, day, startH, startM, 0);
    const dayEnd = new Date(year, month - 1, day, endH, endM, 0);

    const toTimeString = (d: Date) => {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const timeSlots: { start: string; end: string }[] = [];

    while (current <= dayEnd) {
      const next = new Date(current.getTime() + config.durationMinutes * 60 * 1000);
      if (next > dayEnd) {
        next.setTime(dayEnd.getTime());
      }

      timeSlots.push({
        start: toTimeString(current),
        end: toTimeString(next),
      });

      if (next >= dayEnd) break;
      current = next;
    }

    if (timeSlots.length === 0) {
      throw new Error("No time slots generated with current config");
    }

    // Create slots for each court
    const slotsToCreate: CreateCourtSlotInput[] = [];
    for (const courtId of courtIds) {
      for (const ts of timeSlots) {
        slotsToCreate.push({
          court_id: courtId,
          slot_date: date,
          start_time: ts.start,
          end_time: ts.end,
          was_played: true, // Default to played
        });
      }
    }

    return await this.createMany(slotsToCreate);
  }
}

