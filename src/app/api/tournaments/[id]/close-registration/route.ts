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
    .select("id, status, user_uid, match_duration")
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
    team1_id: number | null;
    team2_id: number | null;
    match_date: string | null;
    start_time: string | null;
    end_time: string | null;
    match_order?: number; // Para ordenar: 1-2 primera ronda, 3-4 segunda ronda
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

    // Generar partidos según el tamaño del grupo
    if (size === 3) {
      // Round robin para grupos de 3 equipos (todos contra todos = 3 partidos)
      for (let i = 0; i < idsForGroup.length; i++) {
        for (let j = i + 1; j < idsForGroup.length; j++) {
          matchesPayload.push({
            tournament_id: tournamentId,
            user_uid: user.id,
            phase: "group",
            tournament_group_id: g.id,
            team1_id: idsForGroup[i],
            team2_id: idsForGroup[j],
            match_date: null,
            start_time: null,
            end_time: null,
          });
        }
      }
    } else if (size === 4) {
      // Formato especial para grupos de 4 equipos (4 partidos)
      // Primera ronda (match_order 1-2):
      // - Partido 1: 1 vs 4
      // - Partido 2: 2 vs 3
      matchesPayload.push({
        tournament_id: tournamentId,
        user_uid: user.id,
        phase: "group",
        tournament_group_id: g.id,
        team1_id: idsForGroup[0], // 1
        team2_id: idsForGroup[3], // 4
        match_date: null,
        start_time: null,
        end_time: null,
        match_order: 1,
      });
      matchesPayload.push({
        tournament_id: tournamentId,
        user_uid: user.id,
        phase: "group",
        tournament_group_id: g.id,
        team1_id: idsForGroup[1], // 2
        team2_id: idsForGroup[2], // 3
        match_date: null,
        start_time: null,
        end_time: null,
        match_order: 2,
      });
      
      // Segunda ronda (match_order 3-4):
      // - Partido 3: Ganador 1vs4 vs Ganador 2vs3 (ronda de ganadores) -> 1ro y 2do
      // - Partido 4: Perdedor 1vs4 vs Perdedor 2vs3 (ronda de perdedores) -> 3ro
      // Estos partidos se crearán sin equipos asignados (null) y se actualizarán cuando se jueguen los de primera ronda
      matchesPayload.push({
        tournament_id: tournamentId,
        user_uid: user.id,
        phase: "group",
        tournament_group_id: g.id,
        team1_id: null, // Se asignará cuando se juegue el partido 1
        team2_id: null, // Se asignará cuando se juegue el partido 2
        match_date: null,
        start_time: null,
        end_time: null,
        match_order: 3,
      });
      matchesPayload.push({
        tournament_id: tournamentId,
        user_uid: user.id,
        phase: "group",
        tournament_group_id: g.id,
        team1_id: null, // Se asignará cuando se juegue el partido 1
        team2_id: null, // Se asignará cuando se juegue el partido 2
        match_date: null,
        start_time: null,
        end_time: null,
        match_order: 4,
      });
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

    // Duración del partido del torneo (setting del torneo)
    const matchDurationMinutes = t.match_duration ?? 60;

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

    // Asignar slots a los partidos considerando que un team no puede jugar 2 partidos seguidos
    // Idealmente: 1 partido, descanso de 1 hora, siguiente partido
    
    // Crear un mapa de partidos por team
    const matchesByTeam = new Map<number, typeof matchesPayload>();
    matchesPayload.forEach((match) => {
      [match.team1_id, match.team2_id].forEach((teamId) => {
        if (teamId !== null) {
          if (!matchesByTeam.has(teamId)) {
            matchesByTeam.set(teamId, []);
          }
          matchesByTeam.get(teamId)!.push(match);
        }
      });
    });

    // Función para convertir tiempo a minutos del día (0-1440)
    const timeToMinutesOfDay = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Función para verificar si un slot es válido para un match
    // Regla simple: si un equipo juega a las 15:00 y la duración es 60 min, puede volver a jugar a las 17:00 (15:00 + 2x60)
    const isValidSlot = (
      match: typeof matchesPayload[0],
      slot: { date: string; startTime: string; endTime: string },
      assignedMatches: Map<typeof matchesPayload[0], { date: string; startTime: string; endTime: string; slotIndex: number }>
    ): boolean => {
      const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
      const minTimeBetweenMatches = matchDurationMinutes * 2; // 2 partidos de duración

      // Verificar conflictos con otros partidos del mismo team
      for (const [assignedMatch, assignedSlot] of Array.from(assignedMatches.entries())) {
        // Si el match asignado involucra al mismo team
        const sharedTeam = 
          assignedMatch.team1_id === match.team1_id ||
          assignedMatch.team1_id === match.team2_id ||
          assignedMatch.team2_id === match.team1_id ||
          assignedMatch.team2_id === match.team2_id;

        if (sharedTeam) {
          // Si es el mismo día, verificar tiempo mínimo
          if (slot.date === assignedSlot.date) {
            const assignedStartMinutes = timeToMinutesOfDay(assignedSlot.startTime);
            
            // Calcular diferencia de tiempo
            const timeDifference = Math.abs(slotStartMinutes - assignedStartMinutes);
            
            // Debe haber al menos 2x duración del partido entre partidos del mismo equipo
            if (timeDifference < minTimeBetweenMatches) {
              return false;
            }
          }
        }
      }
      return true;
    };

    // Asignar slots de manera inteligente
    const assignedMatches = new Map<typeof matchesPayload[0], { date: string; startTime: string; endTime: string; slotIndex: number }>();
    const usedSlots = new Set<number>();

    // Función helper para calcular end_time
    const calculateEndTime = (startTime: string): string => {
      const [startH, startM] = startTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = startMinutes + matchDurationMinutes;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    };


    // Función para intentar asignar todos los matches y retornar el resultado
    const tryAssignMatches = (matchesOrder: (typeof matchesPayload[0])[]): {
      success: boolean;
      assignments: Map<number, { date: string; startTime: string; endTime: string; slotIndex: number }>; // key: índice en matchesPayload
      score: number;
    } => {
      const testAssignedMatches = new Map<number, { date: string; startTime: string; endTime: string; slotIndex: number }>();
      const testUsedSlots = new Set<number>();
      const matchIndices = matchesOrder.map(m => matchesPayload.indexOf(m)).filter(idx => idx !== -1);

      for (let orderIdx = 0; orderIdx < matchesOrder.length; orderIdx++) {
        const match = matchesOrder[orderIdx];
        const originalIdx = matchesPayload.indexOf(match);
        if (originalIdx === -1) continue;
        let assigned = false;

        // Intentar encontrar un slot válido
        for (let i = 0; i < timeSlots.length; i++) {
          if (testUsedSlots.has(i)) continue;

          const slot = timeSlots[i];
          const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
          const minTimeBetweenMatches = matchDurationMinutes * 2;

          // Verificar si es válido
          let isValid = true;
          for (const [assignedMatchIdx, assignedSlot] of Array.from(testAssignedMatches.entries())) {
            const assignedMatch = matchesPayload[assignedMatchIdx];
            if (!assignedMatch) continue;
            
            const sharedTeam =
              assignedMatch.team1_id === match.team1_id ||
              assignedMatch.team1_id === match.team2_id ||
              assignedMatch.team2_id === match.team1_id ||
              assignedMatch.team2_id === match.team2_id;

            if (sharedTeam && slot.date === assignedSlot.date) {
              const assignedStartMinutes = timeToMinutesOfDay(assignedSlot.startTime);
              const timeDifference = Math.abs(slotStartMinutes - assignedStartMinutes);
              if (timeDifference < minTimeBetweenMatches) {
                isValid = false;
                break;
              }
            }
          }

          if (isValid) {
            testAssignedMatches.set(originalIdx, {
              date: slot.date,
              startTime: slot.startTime,
              endTime: calculateEndTime(slot.startTime),
              slotIndex: i,
            });
            testUsedSlots.add(i);
            assigned = true;
            break;
          }
        }

        // Si no se pudo asignar con restricciones, NO asignar (la restricción es innegociable)
        if (!assigned) {
          return { success: false, assignments: testAssignedMatches, score: Infinity };
        }
      }

      // Calcular score basado en las asignaciones
      const score = calculateAssignmentScoreFromIndices(testAssignedMatches);
      return { success: true, assignments: testAssignedMatches, score };
    };

    // Función para calcular score desde índices
    const calculateAssignmentScoreFromIndices = (
      assignments: Map<number, { date: string; startTime: string; endTime: string; slotIndex: number }>
    ): number => {
      let totalGap = 0;
      const teamMatches = new Map<number, Array<{ date: string; startTime: string }>>();

      // Agrupar partidos por equipo
      for (const [matchIdx, slot] of Array.from(assignments.entries())) {
        const match = matchesPayload[matchIdx];
        if (!match) continue;
        [match.team1_id, match.team2_id].forEach((teamId) => {
          if (teamId !== null) {
            if (!teamMatches.has(teamId)) {
              teamMatches.set(teamId, []);
            }
            teamMatches.get(teamId)!.push({ date: slot.date, startTime: slot.startTime });
          }
        });
      }

      // Calcular espacios entre partidos del mismo equipo
      for (const [teamId, matches] of Array.from(teamMatches.entries())) {
        if (matches.length < 2) continue;

        // Ordenar por fecha y hora
        const sorted = [...matches].sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return timeToMinutesOfDay(a.startTime) - timeToMinutesOfDay(b.startTime);
        });

        // Sumar espacios entre partidos consecutivos del mismo día
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].date === sorted[i - 1].date) {
            const gap = timeToMinutesOfDay(sorted[i].startTime) - timeToMinutesOfDay(sorted[i - 1].startTime);
            totalGap += gap;
          }
        }
      }

      return totalGap;
    };

    // Generar diferentes órdenes de asignación para probar
    // Priorizar partidos de primera ronda (match_order 1-2) antes que segunda ronda (match_order 3-4)
    const baseOrder = [...matchesPayload].sort((a, b) => {
      // Primero ordenar por match_order (si existe) - primera ronda antes que segunda ronda
      if (a.match_order !== undefined && b.match_order !== undefined) {
        return a.match_order - b.match_order;
      }
      // Si uno tiene match_order y el otro no, el que tiene match_order va primero
      if (a.match_order !== undefined) return -1;
      if (b.match_order !== undefined) return 1;
      // Si ninguno tiene match_order, usar la lógica original
      const aTeam1Matches = matchesByTeam.get(a.team1_id ?? 0)?.length || 0;
      const aTeam2Matches = matchesByTeam.get(a.team2_id ?? 0)?.length || 0;
      const bTeam1Matches = matchesByTeam.get(b.team1_id ?? 0)?.length || 0;
      const bTeam2Matches = matchesByTeam.get(b.team2_id ?? 0)?.length || 0;
      const aMax = Math.max(aTeam1Matches, aTeam2Matches);
      const bMax = Math.max(bTeam1Matches, bTeam2Matches);
      return bMax - aMax;
    });

    // Probar diferentes órdenes (hasta 5 variaciones)
    const ordersToTry = [
      baseOrder,
      [...baseOrder].reverse(),
      [...baseOrder].sort(() => Math.random() - 0.5),
      [...baseOrder].sort(() => Math.random() - 0.5),
      [...baseOrder].sort(() => Math.random() - 0.5),
    ];

    let bestResult: { success: boolean; assignments: Map<number, { date: string; startTime: string; endTime: string; slotIndex: number }>; score: number } | null = null;

    for (const order of ordersToTry) {
      const result = tryAssignMatches(order);
      if (result.success && (!bestResult || result.score < bestResult.score)) {
        bestResult = result;
      }
    }

    // Si no se encontró ninguna asignación válida, usar la primera que se pudo completar
    if (!bestResult) {
      const result = tryAssignMatches(baseOrder);
      bestResult = result;
    }

    // Aplicar la mejor asignación encontrada
    if (bestResult && bestResult.success) {
      for (const [matchIdx, slot] of Array.from(bestResult.assignments.entries())) {
        const match = matchesPayload[matchIdx];
        if (match) {
          match.match_date = slot.date;
          match.start_time = slot.startTime;
          match.end_time = slot.endTime;
        }
      }
    } else {
      // Si no se pudo encontrar ninguna asignación válida que respete las restricciones, retornar error
      // La restricción de no jugar 2 partidos seguidos es INNEGOCIABLE
      return NextResponse.json(
        {
          error: `No se pudo asignar horarios para todos los partidos respetando la restricción de que un equipo no puede jugar 2 partidos seguidos. Intenta con más días/horarios disponibles o más canchas.`,
        },
        { status: 400 }
      );
    }
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
