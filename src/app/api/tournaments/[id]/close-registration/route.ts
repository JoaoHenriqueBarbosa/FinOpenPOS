import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

type ScheduleDay = {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
};

type ScheduleConfig = {
  days: ScheduleDay[];
  matchDuration: number; // minutos entre partidos
  courtIds: number[]; // IDs de las canchas a usar
};

// Función helper para generar slots de tiempo
function generateTimeSlots(
  days: ScheduleDay[],
  matchDuration: number,
  numCourts: number
): Array<{ date: string; startTime: string; endTime: string }> {
  const slots: Array<{ date: string; startTime: string; endTime: string }> = [];

  days.forEach((day) => {
    const [startH, startM] = day.startTime.split(":").map(Number);
    const [endH, endM] = day.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let currentMinutes = startMinutes;
    while (currentMinutes + matchDuration <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60);
      const slotStartM = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + matchDuration;
      const slotEndH = Math.floor(slotEndMinutes / 60);
      const slotEndM = slotEndMinutes % 60;

      // Agregar un slot por cada cancha disponible
      for (let i = 0; i < numCourts; i++) {
        slots.push({
          date: day.date,
          startTime: `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`,
          endTime: `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`,
        });
      }

      currentMinutes += matchDuration;
    }
  });

  return slots;
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Obtener configuración de horarios del body
  const body = await req.json().catch(() => ({}));
  const scheduleConfig: ScheduleConfig | undefined = body.days
    ? {
        days: body.days,
        matchDuration: body.matchDuration || 60,
        courtIds: body.courtIds || [],
      }
    : undefined;

  // 1) traer torneo
  const { data: t, error: terr } = await supabase
    .from("tournaments")
    .select("id, status, user_uid")
    .eq("id", tournamentId)
    .single();

  if (terr || !t || t.user_uid !== user.id) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (t.status !== "draft") {
    return NextResponse.json(
      { error: "Registration already closed or tournament started" },
      { status: 400 }
    );
  }

  // Verificar si ya existen grupos
  const { data: existingGroups, error: existingGroupsError } = await supabase
    .from("tournament_groups")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id)
    .limit(1);

  if (existingGroupsError) {
    console.error("Error checking existing groups:", existingGroupsError);
    return NextResponse.json(
      { error: "Failed to check existing groups" },
      { status: 500 }
    );
  }

  if (existingGroups && existingGroups.length > 0) {
    return NextResponse.json(
      { error: "Groups already generated for this tournament" },
      { status: 400 }
    );
  }

  // 2) traer equipos
  const { data: teams, error: teamsError } = await supabase
    .from("tournament_teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id)
    .order("id", { ascending: true });

  if (teamsError) {
    console.error("Error fetching teams:", teamsError);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }

  if (!teams || teams.length < 3) {
    return NextResponse.json(
      { error: "Need at least 3 teams to create groups" },
      { status: 400 }
    );
  }

  const teamIds = teams.map((t) => t.id as number);
  const N = teamIds.length;

  // 3) calcular tamaños de grupos: maximizar de 3, convertir a 4 según tu regla
  let baseGroups = Math.floor(N / 3);
  const remainder = N % 3;

  if (baseGroups === 0) {
    baseGroups = 1;
  }

  const groupSizes: number[] = new Array(baseGroups).fill(3);

  if (remainder === 1 && baseGroups >= 1) {
    groupSizes[0] = 4;
  } else if (remainder === 2) {
    if (baseGroups >= 2) {
      groupSizes[0] = 4;
      groupSizes[1] = 4;
    } else if (baseGroups === 1) {
      groupSizes[0] = 4; // te quedará uno sin agrupar, pero es un caso raro de N=5
    }
  }

  // 4) armar grupos y asignar equipos secuencialmente
  const groupsPayload: { name: string; tournament_id: number; user_uid: string; group_order: number }[] =
    [];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  for (let i = 0; i < groupSizes.length; i++) {
    groupsPayload.push({
      name: `Zona ${letters[i] ?? String(i + 1)}`,
      tournament_id: tournamentId,
      user_uid: user.id,
      group_order: i + 1,
    });
  }

  const { data: createdGroups, error: groupError } = await supabase
    .from("tournament_groups")
    .insert(groupsPayload)
    .select("id, group_order")
    .order("group_order", { ascending: true });

  if (groupError || !createdGroups) {
    console.error("Error creating groups:", groupError);
    return NextResponse.json({ error: "Failed to create groups" }, { status: 500 });
  }

  // asignar equipos a cada grupo
  let index = 0;
  const groupTeamsPayload: { tournament_group_id: number; team_id: number; user_uid: string }[] =
    [];
  const matchesPayload: {
    tournament_id: number;
    user_uid: string;
    phase: "group";
    tournament_group_id: number;
    team1_id: number;
    team2_id: number;
    match_date: string | null;
    start_time: string | null;
    end_time: string | null;
  }[] = [];

  createdGroups.forEach((g, idx) => {
    const size = groupSizes[idx] ?? 3;
    const idsForGroup = teamIds.slice(index, index + size);
    index += size;

    // group_teams
    idsForGroup.forEach((teamId) => {
      groupTeamsPayload.push({
        tournament_group_id: g.id,
        team_id: teamId,
        user_uid: user.id,
      });
    });

    // round robin para este grupo
    for (let i = 0; i < idsForGroup.length; i++) {
      for (let j = i + 1; j < idsForGroup.length; j++) {
        matchesPayload.push({
          tournament_id: tournamentId,
          user_uid: user.id,
          phase: "group",
          tournament_group_id: g.id,
          team1_id: idsForGroup[i],
          team2_id: idsForGroup[j],
        });
      }
    }
  });

  // insertar group_teams
  if (groupTeamsPayload.length > 0) {
    const { error: gtError } = await supabase
      .from("tournament_group_teams")
      .insert(groupTeamsPayload);

    if (gtError) {
      console.error("Error inserting group teams:", gtError);
      return NextResponse.json(
        { error: "Failed to create group teams" },
        { status: 500 }
      );
    }
  }

  // Asignar fechas y horarios a los partidos si hay configuración
  if (scheduleConfig && scheduleConfig.days.length > 0) {
    // Validar que haya canchas seleccionadas
    if (!scheduleConfig.courtIds || scheduleConfig.courtIds.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar al menos una cancha" },
        { status: 400 }
      );
    }

    // Verificar que las canchas seleccionadas existan y pertenezcan al usuario
    const { data: courts, error: courtsError } = await supabase
      .from("courts")
      .select("id")
      .eq("user_uid", user.id)
      .in("id", scheduleConfig.courtIds)
      .eq("is_active", true);

    if (courtsError) {
      console.error("Error fetching courts:", courtsError);
      return NextResponse.json(
        { error: "Failed to fetch courts" },
        { status: 500 }
      );
    }

    if (!courts || courts.length === 0) {
      return NextResponse.json(
        { error: "Las canchas seleccionadas no son válidas o no están activas" },
        { status: 400 }
      );
    }

    if (courts.length !== scheduleConfig.courtIds.length) {
      return NextResponse.json(
        { error: "Algunas canchas seleccionadas no son válidas" },
        { status: 400 }
      );
    }

    // Generar slots disponibles usando solo las canchas seleccionadas
    const timeSlots = generateTimeSlots(
      scheduleConfig.days,
      scheduleConfig.matchDuration,
      courts.length
    );

    if (timeSlots.length < matchesPayload.length) {
      return NextResponse.json(
        {
          error: `Not enough time slots. Need ${matchesPayload.length} slots but only ${timeSlots.length} available.`,
        },
        { status: 400 }
      );
    }

    // Asignar slots a los partidos
    matchesPayload.forEach((match, index) => {
      const slot = timeSlots[index];
      if (slot) {
        match.match_date = slot.date;
        match.start_time = slot.startTime;
        // Calcular end_time (asumimos duración de 1.5 horas por partido)
        const [startH, startM] = slot.startTime.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = startMinutes + 90; // 1.5 horas
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        match.end_time = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
      }
    });
  }

  // insertar matches
  if (matchesPayload.length > 0) {
    const { error: mError } = await supabase
      .from("tournament_matches")
      .insert(matchesPayload);

    if (mError) {
      console.error("Error inserting group matches:", mError);
      return NextResponse.json(
        { error: "Failed to create group matches" },
        { status: 500 }
      );
    }
  }

  // actualizar torneo a in_progress
  const { error: upError } = await supabase
    .from("tournaments")
    .update({ status: "in_progress" })
    .eq("id", tournamentId)
    .eq("user_uid", user.id);

  if (upError) {
    console.error("Error updating tournament status:", upError);
    return NextResponse.json(
      { error: "Failed to update tournament status" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
