import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GenerateBody = {
  date?: string; // YYYY-MM-DD
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as GenerateBody;
  const slotDate = body.date || new Date().toISOString().slice(0, 10);

  // 1) Buscar canchas activas del usuario
  const { data: courts, error: courtsError } = await supabase
    .from("courts")
    .select("id, name")
    .eq("user_uid", user.id)
    .eq("is_active", true);

  if (courtsError) {
    console.error("Error fetching courts:", courtsError);
    return NextResponse.json(
      { error: "Error fetching courts" },
      { status: 500 }
    );
  }

  if (!courts || courts.length === 0) {
    return NextResponse.json(
      { error: "No active courts found" },
      { status: 400 }
    );
  }

  // 2) Definir rango horario y duración de slots
  /**
   * Configuration for slot generation.
   * - startHour: Start time for slots (HH:MM, 24h format)
   * - endHour: End time for slots (HH:MM, 24h format)
   * - durationMinutes: Duration of each slot in minutes
   * 
   * To change slot generation times, update these values.
   */
  const slotConfig = {
    startHour: "13:00",      // Start time for slots (HH:MM)
    endHour: "23:30",        // End time for slots (HH:MM)
    durationMinutes: 90      // Duration of each slot in minutes
  };

  const startHour = slotConfig.startHour;
  const endHour = slotConfig.endHour;
  const durationMinutes = slotConfig.durationMinutes;

  const timeSlots: { start: string; end: string }[] = [];
  let current = new Date(
    `${slotDate}T${startHour}:00`
  );
  const dayEnd = new Date(
    `${slotDate}T${endHour}:00`
  );

  const toTimeString = (d: Date) => d.toTimeString().slice(0, 5); // HH:MM

  while (current <= dayEnd) {
    const next = new Date(current.getTime() + durationMinutes * 60 * 1000);
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
    return NextResponse.json(
      { error: "No time slots generated with current config" },
      { status: 400 }
    );
  }

  try {
    // 3) Borrar slots anteriores de ese día+usuario
    const { error: deleteError } = await supabase
      .from("court_slots")
      .delete()
      .eq("user_uid", user.id)
      .eq("slot_date", slotDate);

    if (deleteError) {
      console.error("Error deleting existing court_slots:", deleteError);
      return NextResponse.json(
        { error: "Error regenerating court slots" },
        { status: 500 }
      );
    }

    // 4) Insertar nuevos slots por cada cancha activa
    const payload = courts.flatMap((court) =>
      timeSlots.map((ts) => ({
        user_uid: user.id,
        court_id: court.id,
        slot_date: slotDate,
        start_time: ts.start,
        end_time: ts.end,
        was_played: true
        // player*_paid: true (defaults)
      }))
    );

    const { data, error: insertError } = await supabase
      .from("court_slots")
      .insert(payload)
      .select(
        `
        id,
        user_uid,
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
        )
      `
      );

    if (insertError) {
      console.error("Error inserting court_slots:", insertError);
      return NextResponse.json(
        { error: "Error generating court slots" },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("POST /court-slots/generate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
