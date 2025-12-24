import type { CourtSlotDTO } from "@/models/dto/court";
import type { CourtPricingDB, CreateCourtPricingInput, UpdateCourtPricingInput } from "@/models/db/court";

export interface GenerateCourtSlotsInput {
  date: string;
}

export interface UpdateCourtSlotInput {
  was_played?: boolean;
  notes?: string | null;
  player1_payment_method_id?: number | null;
  player1_note?: string | null;
  player2_payment_method_id?: number | null;
  player2_note?: string | null;
  player3_payment_method_id?: number | null;
  player3_note?: string | null;
  player4_payment_method_id?: number | null;
  player4_note?: string | null;
}

class CourtSlotsService {
  private baseUrl = "/api/court-slots";

  async getByDate(date: string): Promise<CourtSlotDTO[]> {
    const response = await fetch(`${this.baseUrl}?date=${date}`);
    if (!response.ok) {
      throw new Error("Failed to fetch court slots");
    }
    return response.json();
  }

  async getById(id: number): Promise<CourtSlotDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch court slot");
    }
    return response.json();
  }

  async generate(input: GenerateCourtSlotsInput): Promise<CourtSlotDTO[]> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Error generando turnos");
    }
    return response.json();
  }

  async update(id: number, input: UpdateCourtSlotInput): Promise<CourtSlotDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error updating court slot");
    }
    return response.json();
  }

  async getTodaySlotsCount(): Promise<number> {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const response = await fetch(`${this.baseUrl}?date=${dateStr}`);
    if (!response.ok) {
      return 0;
    }
    const slots: CourtSlotDTO[] = await response.json();
    return slots.length;
  }

  // Pricing methods
  async getPricing(): Promise<CourtPricingDB[]> {
    const response = await fetch(`${this.baseUrl}/pricing`);
    if (!response.ok) {
      throw new Error("Failed to fetch pricing");
    }
    return response.json();
  }

  async upsertPricingForCourtId(
    courtId: number,
    rules: Array<{ start_time: string; end_time: string; price_per_player: number }>
  ): Promise<CourtPricingDB[]> {
    const response = await fetch(`${this.baseUrl}/pricing/${courtId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rules }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Error updating pricing");
    }
    return response.json();
  }
}

export const courtSlotsService = new CourtSlotsService();

