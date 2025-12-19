import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

// Helper para convertir tiempo a minutos del día
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tournamentId = Number(params.id);
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Verificar si se quieren agrupados o individuales (por defecto: individuales para restricciones)
    const url = new URL(req.url);
    const grouped = url.searchParams.get("grouped") === "true";

    // Verificar que el torneo existe y pertenece al usuario
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, user_uid")
      .eq("id", tournamentId)
      .eq("user_uid", user.id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Obtener horarios disponibles (slots de 1 hora)
    const { data: schedules, error: schedulesError } = await supabase
      .from("tournament_available_schedules")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", user.id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (schedulesError) {
      console.error("Error fetching available schedules:", schedulesError);
      return NextResponse.json(
        { error: "Failed to fetch available schedules" },
        { status: 500 }
      );
    }

    // Si no se quieren agrupados, devolver los slots individuales directamente
    if (!grouped) {
      return NextResponse.json(schedules || []);
    }

    // Agrupar slots consecutivos del mismo día en rangos para la UI
    const groupedSchedules: any[] = [];
    if (schedules && schedules.length > 0) {
      // Agrupar por día de la semana
      const byDay = new Map<number, any[]>();
      schedules.forEach((s: any) => {
        if (!byDay.has(s.day_of_week)) {
          byDay.set(s.day_of_week, []);
        }
        byDay.get(s.day_of_week)!.push(s);
      });

      // Para cada día, agrupar slots consecutivos
      byDay.forEach((daySchedules, dayOfWeek) => {
        daySchedules.sort((a: any, b: any) => {
          const aMinutes = timeToMinutes(a.start_time);
          const bMinutes = timeToMinutes(b.start_time);
          return aMinutes - bMinutes;
        });

        interface RangeType {
          start_time: string;
          end_time: string;
          display_name: string | null;
        }
        let currentRange: RangeType | null = null;

        daySchedules.forEach((slot: any) => {
          const slotStartMinutes = timeToMinutes(slot.start_time);
          const slotEndMinutes = timeToMinutes(slot.end_time);

          if (!currentRange) {
            // Iniciar nuevo rango
            currentRange = {
              start_time: slot.start_time,
              end_time: slot.end_time,
              display_name: slot.display_name,
            };
          } else {
            const rangeEndMinutes = timeToMinutes(currentRange.end_time);
            // Si el slot es consecutivo (end_time del rango == start_time del slot)
            if (rangeEndMinutes === slotStartMinutes) {
              // Extender el rango
              currentRange.end_time = slot.end_time;
            } else {
              // Guardar rango anterior y empezar uno nuevo
              groupedSchedules.push({
                id: null, // No hay ID único para rangos agrupados
                tournament_id: tournamentId,
                day_of_week: dayOfWeek,
                start_time: currentRange.start_time,
                end_time: currentRange.end_time,
                display_name: currentRange.display_name,
              });
              currentRange = {
                start_time: slot.start_time,
                end_time: slot.end_time,
                display_name: slot.display_name,
              };
            }
          }
        });

        // Guardar último rango
        if (currentRange !== null && currentRange !== undefined) {
          const range: RangeType = currentRange;
          groupedSchedules.push({
            id: null,
            tournament_id: tournamentId,
            day_of_week: dayOfWeek,
            start_time: range.start_time,
            end_time: range.end_time,
            display_name: range.display_name,
          });
        }
      });
    }

    return NextResponse.json(groupedSchedules);
  } catch (error) {
    console.error("GET /tournaments/:id/available-schedules error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tournamentId = Number(params.id);
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { schedules } = body;

    // Validar que el torneo existe y pertenece al usuario
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, status, user_uid")
      .eq("id", tournamentId)
      .eq("user_uid", user.id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Verificar si ya hay grupos generados
    const { data: existingGroups, error: groupsError } = await supabase
      .from("tournament_groups")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", user.id)
      .limit(1);

    if (groupsError) {
      console.error("Error checking groups:", groupsError);
      return NextResponse.json(
        { error: "Failed to check tournament status" },
        { status: 500 }
      );
    }

    if (existingGroups && existingGroups.length > 0) {
      return NextResponse.json(
        { error: "No se pueden editar horarios después de generar los grupos" },
        { status: 400 }
      );
    }

    // Validar formato de schedules
    if (!Array.isArray(schedules)) {
      return NextResponse.json(
        { error: "schedules debe ser un array" },
        { status: 400 }
      );
    }

    // Validar cada schedule
    for (const schedule of schedules) {
      if (
        typeof schedule.day_of_week !== "number" ||
        schedule.day_of_week < 0 ||
        schedule.day_of_week > 6 ||
        !schedule.start_time ||
        !schedule.end_time ||
        schedule.start_time >= schedule.end_time
      ) {
        return NextResponse.json(
          { error: "Cada schedule debe tener day_of_week (0-6), start_time y end_time válidos" },
          { status: 400 }
        );
      }
    }

    // Eliminar horarios existentes
    const { error: deleteError } = await supabase
      .from("tournament_available_schedules")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("user_uid", user.id);

    if (deleteError) {
      console.error("Error deleting existing schedules:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete existing schedules" },
        { status: 500 }
      );
    }

    // Insertar nuevos horarios - dividir rangos en slots de 1 hora
    if (schedules.length > 0) {
      const schedulesToInsert: any[] = [];

      for (const schedule of schedules) {
        const [startH, startM] = schedule.start_time.split(":").map(Number);
        const [endH, endM] = schedule.end_time.split(":").map(Number);
        
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        // Generar slots de 1 hora dentro del rango
        let currentMinutes = startMinutes;
        while (currentMinutes < endMinutes) {
          const slotStartH = Math.floor(currentMinutes / 60);
          const slotStartM = currentMinutes % 60;
          const slotEndMinutes = currentMinutes + 60; // 1 hora = 60 minutos
          const slotEndH = Math.floor(slotEndMinutes / 60);
          const slotEndM = slotEndMinutes % 60;

          // Si el slot excede el rango, ajustarlo
          const actualEndMinutes = Math.min(slotEndMinutes, endMinutes);
          const actualEndH = Math.floor(actualEndMinutes / 60);
          const actualEndM = actualEndMinutes % 60;

          schedulesToInsert.push({
            tournament_id: tournamentId,
            user_uid: user.id,
            day_of_week: schedule.day_of_week,
            start_time: `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`,
            end_time: `${String(actualEndH).padStart(2, "0")}:${String(actualEndM).padStart(2, "0")}`,
            display_name: schedule.display_name || null,
          });

          currentMinutes += 60;
        }
      }

      const { error: insertError } = await supabase
        .from("tournament_available_schedules")
        .insert(schedulesToInsert);

      if (insertError) {
        console.error("Error inserting schedules:", insertError);
        return NextResponse.json(
          { error: "Failed to insert schedules" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /tournaments/:id/available-schedules error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

