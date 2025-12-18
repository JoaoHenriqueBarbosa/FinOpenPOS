export interface CourtSlotDayNoteDTO {
  id: number;
  slot_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateCourtSlotDayNoteInput {
  notes: string | null;
}

class CourtSlotDayNotesService {
  private baseUrl = "/api/court-slot-day-notes";

  async getByDate(date: string): Promise<CourtSlotDayNoteDTO | null> {
    const response = await fetch(`${this.baseUrl}?date=${date}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch day notes");
    }
    return response.json();
  }

  async upsert(date: string, notes: string | null): Promise<CourtSlotDayNoteDTO> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ date, notes }),
    });
    if (!response.ok) {
      throw new Error("Error saving day notes");
    }
    return response.json();
  }
}

export const courtSlotDayNotesService = new CourtSlotDayNotesService();

