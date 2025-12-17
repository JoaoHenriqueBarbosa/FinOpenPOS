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
  // Asegurar que la fecha se interprete correctamente en zona horaria local
  let slotDate: string;
  if (body.date) {
    slotDate = body.date;
  } else {
    // Crear fecha en zona horaria local, no UTC
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    slotDate = `${year}-${month}-${day}`;
  }
  
  console.log('[generate] Received date:', body.date, 'Using slotDate:', slotDate);

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

  // 2) Ver si ya existen slots para ese día+usuario
  const { data: existingSlots, error: existingError } = await supabase
    .from("court_slots")
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
    )
    .eq("user_uid", user.id)
    .eq("slot_date", slotDate);

  if (existingError) {
    console.error("Error fetching existing court_slots:", existingError);
    return NextResponse.json(
      { error: "Error checking existing court slots" },
      { status: 500 }
    );
  }

  // Si ya hay slots, no generamos nada nuevo
  if (existingSlots && existingSlots.length > 0) {
    return NextResponse.json(existingSlots);
    // O si preferís indicar explícitamente:
    // return NextResponse.json(
    //   { message: "Slots already exist for this date", data: existingSlots },
    //   { status: 200 }
    // );
  }

  // 3) Definir rango horario y duración de slots
  const slotConfig = {
    startHour: "13:00",      // Start time for slots (HH:MM)
    endHour: "23:30",        // End time for slots (HH:MM)
    durationMinutes: 90      // Duration of each slot in minutes
  };

  const startHour = slotConfig.startHour;
  const endHour = slotConfig.endHour;
  const durationMinutes = slotConfig.durationMinutes;

  const timeSlots: { start: string; end: string }[] = [];
  
  // Crear fechas en zona horaria local para evitar problemas de UTC
  const [year, month, day] = slotDate.split('-').map(Number);
  const [startH, startM] = startHour.split(':').map(Number);
  const [endH, endM] = endHour.split(':').map(Number);
  
  console.log('[generate] Parsed date components - year:', year, 'month:', month, 'day:', day);
  console.log('[generate] Time range - start:', startHour, 'end:', endHour);
  
  let current = new Date(year, month - 1, day, startH, startM, 0);
  const dayEnd = new Date(year, month - 1, day, endH, endM, 0);
  
  console.log('[generate] Created Date objects - current:', current.toISOString(), 'dayEnd:', dayEnd.toISOString());
  console.log('[generate] Local date string - current:', current.toLocaleDateString(), 'dayEnd:', dayEnd.toLocaleDateString());

  const toTimeString = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

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
    // 4) Insertar nuevos slots por cada cancha activa (solo si no existían)
    console.log('[generate] Generated', timeSlots.length, 'time slots');
    if (timeSlots.length > 0) {
      console.log('[generate] First slot:', timeSlots[0], 'Last slot:', timeSlots[timeSlots.length - 1]);
    }
    
    const payload = courts.flatMap((court) =>
      timeSlots.map((ts) => ({
        user_uid: user.id,
        court_id: court.id,
        slot_date: slotDate, // Usar la fecha original sin conversiones
        start_time: ts.start,
        end_time: ts.end,
        was_played: true,
      }))
    );
    
    console.log('[generate] Inserting', payload.length, 'slots for', courts.length, 'courts');
    if (payload.length > 0) {
      console.log('[generate] Sample payload - slot_date:', payload[0]?.slot_date, 'start_time:', payload[0]?.start_time);
    }

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
