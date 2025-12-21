import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GroupMatchPayload,
  scheduleGroupMatches,
} from "@/lib/tournament-scheduler";
import type { ScheduleConfig } from "@/models/dto/tournament";

type RouteParams = { params: { id: string } };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // Si es un error de timeout o conexión, retornar un mensaje más claro
      if (authError?.message?.includes('timeout') || 
          authError?.message?.includes('fetch failed') ||
          (authError as any)?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
        return NextResponse.json(
          { error: "Error de conexión con el servidor. Por favor, intentá nuevamente." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Obtener configuración de horarios del body
  const body = await req.json().catch(() => ({}));
  let scheduleConfig: ScheduleConfig | undefined = body.days
    ? {
        days: body.days,
        matchDuration: body.matchDuration || 60,
        courtIds: body.courtIds || [],
      }
    : undefined;
  
  // Si no hay scheduleConfig pero hay horarios disponibles del torneo, usarlos automáticamente
  if (!scheduleConfig) {
    const { data: availableSchedules, error: schedulesError } = await supabase
      .from("tournament_available_schedules")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", user.id)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (!schedulesError && availableSchedules && availableSchedules.length > 0) {
      // Agrupar slots consecutivos de la misma fecha en rangos
      const groupedSchedules = new Map<string, { date: string; start_time: string; end_time: string }>();
      
      availableSchedules.forEach((schedule: any) => {
        const dateKey = schedule.date;
        if (!groupedSchedules.has(dateKey)) {
          groupedSchedules.set(dateKey, {
            date: schedule.date,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          });
        } else {
          const existing = groupedSchedules.get(dateKey)!;
          // Extender el rango si el slot es consecutivo
          if (schedule.end_time > existing.end_time) {
            existing.end_time = schedule.end_time;
          }
        }
      });

      const days = Array.from(groupedSchedules.values());
      
      if (days.length > 0) {
        // Obtener canchas activas
        const { data: courts, error: courtsError } = await supabase
          .from("courts")
          .select("id")
          .eq("user_uid", user.id)
          .eq("is_active", true);

        if (!courtsError && courts && courts.length > 0) {
          scheduleConfig = {
            days: days.map(s => ({
              date: s.date,
              startTime: s.start_time,
              endTime: s.end_time,
            })),
            matchDuration: t.match_duration ?? 60,
            courtIds: courts.map((c: any) => c.id),
          };
        }
      }
    }
  }

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

  // 2) traer equipos (las restricciones horarias se obtienen después desde tournament_team_schedule_restrictions)
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
  const groupTeamsPayload: {
    tournament_group_id: number;
    team_id: number;
    user_uid: string;
  }[] = [];
  const matchesPayload: GroupMatchPayload[] = [];

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
            court_id: null,
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
        court_id: null,
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
        court_id: null,
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
        court_id: null,
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
        court_id: null,
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

    // Obtener horarios disponibles del torneo
    const { data: availableSchedules, error: schedulesError } = await supabase
      .from("tournament_available_schedules")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", user.id)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (schedulesError) {
      console.error("Error fetching available schedules:", schedulesError);
      // Continuar sin horarios disponibles (comportamiento anterior)
    }

    // Obtener restricciones de equipos (IDs de horarios que no pueden jugar)
    const teamIds = teams.map((t: any) => t.id);
    const teamRestrictions = new Map<number, number[]>();
    
    if (teamIds.length > 0) {
      const { data: restrictions, error: restrictionsError } = await supabase
        .from("tournament_team_schedule_restrictions")
        .select("tournament_team_id, tournament_available_schedule_id")
        .in("tournament_team_id", teamIds)
        .eq("user_uid", user.id);

      if (!restrictionsError && restrictions) {
        restrictions.forEach((r: any) => {
          const teamId = r.tournament_team_id;
          const scheduleId = r.tournament_available_schedule_id;
          if (!teamRestrictions.has(teamId)) {
            teamRestrictions.set(teamId, []);
          }
          teamRestrictions.get(teamId)!.push(scheduleId);
        });
      }
    }

    const schedulerResult = await scheduleGroupMatches(
      matchesPayload,
      scheduleConfig.days,
      matchDurationMinutes,
      scheduleConfig.courtIds,
      availableSchedules || undefined,
      teamRestrictions
    );

    // Si no se pudieron asignar horarios, continuar igual pero sin horarios
    // Los partidos se crearán sin match_date, start_time, end_time
    if (!schedulerResult.success) {
      console.warn(
        `No se pudieron asignar horarios automáticamente: ${schedulerResult.error}. Los partidos se crearán sin horarios.`
      );
      // Continuar con matchesPayload sin horarios asignados
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
  } catch (error: any) {
    console.error("Error in close-registration:", error);
    
    // Si es un error de timeout o conexión, retornar un mensaje más claro
    if (
      error?.message?.includes('timeout') || 
      error?.message?.includes('fetch failed') ||
      error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      error?.message === 'Unauthorized'
    ) {
      return NextResponse.json(
        { error: "Error de conexión con el servidor. Por favor, intentá nuevamente." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
