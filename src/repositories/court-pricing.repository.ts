import { createClient } from "@/lib/supabase/server";
import type { CourtPricingDB, CreateCourtPricingInput, UpdateCourtPricingInput } from "@/models/db/court";

export class CourtPricingRepository {
  private supabase = createClient();

  /**
   * Get all pricing rules for the current user
   */
  async findAll(): Promise<CourtPricingDB[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await this.supabase
      .from("court_pricing")
      .select("*")
      .eq("user_uid", user.id)
      .order("court_id", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Get pricing for a specific court and time
   */
  async findByCourtIdAndTime(
    courtId: number,
    time: string // TIME format "HH:MM"
  ): Promise<CourtPricingDB | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Get all pricing rules for this court and filter in memory
    const allRules = await this.findByCourtId(courtId);
    
    // Find the rule where time is between start_time and end_time
    for (const rule of allRules) {
      const startTime = rule.start_time.slice(0, 5); // HH:MM
      const endTime = rule.end_time.slice(0, 5); // HH:MM
      const checkTime = time.slice(0, 5); // HH:MM
      
      if (checkTime >= startTime && checkTime < endTime) {
        return rule;
      }
    }
    
    return null;
  }

  /**
   * Get all pricing rules for a specific court
   */
  async findByCourtId(courtId: number): Promise<CourtPricingDB[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await this.supabase
      .from("court_pricing")
      .select("*")
      .eq("user_uid", user.id)
      .eq("court_id", courtId)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Create a new pricing rule
   */
  async create(input: CreateCourtPricingInput): Promise<CourtPricingDB> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await this.supabase
      .from("court_pricing")
      .insert({
        user_uid: user.id,
        court_id: input.court_id,
        start_time: input.start_time,
        end_time: input.end_time,
        price_per_player: input.price_per_player,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a pricing rule
   */
  async update(
    id: number,
    input: UpdateCourtPricingInput
  ): Promise<CourtPricingDB> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const updateData: Partial<CourtPricingDB> = {
      updated_at: new Date().toISOString(),
    };

    if (input.start_time !== undefined) updateData.start_time = input.start_time;
    if (input.end_time !== undefined) updateData.end_time = input.end_time;
    if (input.price_per_player !== undefined)
      updateData.price_per_player = input.price_per_player;

    const { data, error } = await this.supabase
      .from("court_pricing")
      .update(updateData)
      .eq("id", id)
      .eq("user_uid", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a pricing rule
   */
  async delete(id: number): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await this.supabase
      .from("court_pricing")
      .delete()
      .eq("id", id)
      .eq("user_uid", user.id);

    if (error) throw error;
  }

  /**
   * Delete all pricing rules for a court
   */
  async deleteByCourtId(courtId: number): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await this.supabase
      .from("court_pricing")
      .delete()
      .eq("user_uid", user.id)
      .eq("court_id", courtId);

    if (error) throw error;
  }

  /**
   * Upsert multiple pricing rules (delete existing for court and create new ones)
   */
  async upsertForCourtId(
    courtId: number,
    rules: Array<{ start_time: string; end_time: string; price_per_player: number }>
  ): Promise<CourtPricingDB[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Delete existing rules for this court
    await this.deleteByCourtId(courtId);

    // Create new rules
    if (rules.length === 0) return [];

    const { data, error } = await this.supabase
      .from("court_pricing")
      .insert(
        rules.map((rule) => ({
          user_uid: user.id,
          court_id: courtId,
          start_time: rule.start_time,
          end_time: rule.end_time,
          price_per_player: rule.price_per_player,
        }))
      )
      .select();

    if (error) throw error;
    return data ?? [];
  }
}
