export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GroupMatchPayload } from "@/lib/tournament-scheduler";

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

  // 1) traer torneo PRIMERO (necesario para match_duration)
  const { data: t, error: terr } = await supabase
    .from("tournaments")
    .select("id, status, user_uid, match_duration")
    .eq("id", tournamentId)
    .single();

  if (terr || !t) {
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

  // No se asignan horarios al cerrar la inscripción
  // Los horarios se asignarán después desde la pestaña de grupos

  // 2) traer equipos (excluyendo suplentes - las restricciones horarias se obtienen después desde tournament_team_schedule_restrictions)
  const { data: teams, error: teamsError } = await supabase
    .from("tournament_teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("is_substitute", false)  // Excluir suplentes de la generación del torneo
    .order("display_order", { ascending: true })
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

  // asignar equipos usando patrón zig-zag para balancear niveles
  const groupTeamsPayload: {
    tournament_group_id: number;
    team_id: number;
    user_uid: string;
  }[] = [];
  const matchesPayload: GroupMatchPayload[] = [];

  // Crear arrays para almacenar los equipos asignados a cada zona
  const teamsPerGroup: number[][] = createdGroups.map(() => []);
  
  const numGroups = createdGroups.length;
  let teamIndex = 0;
  let pass = 0; // Número de pasada (0 = ida, 1 = vuelta, 2 = ida, etc.)
  
  // Función para verificar si todas las zonas tienen su tamaño mínimo (3)
  const allAtMinSize = () => {
    return teamsPerGroup.every((teams, idx) => {
      const minSize = Math.min(3, groupSizes[idx] ?? 3);
      return teams.length >= minSize;
    });
  };
  
  // Función para verificar si hay zonas de 4 que aún no están completas
  const hasIncompleteFourGroups = () => {
    return groupSizes.some((size, idx) => size === 4 && teamsPerGroup[idx].length < 4);
  };
  
  // Asignar equipos en zig-zag
  while (teamIndex < teamIds.length) {
    // Si todas las zonas tienen tamaño mínimo (3) y hay zonas de 4 incompletas,
    // completar las zonas de 4 en orden A → B → C → ...
    if (allAtMinSize() && hasIncompleteFourGroups()) {
      let assignedAny = false;
      for (let gIdx = 0; gIdx < numGroups && teamIndex < teamIds.length; gIdx++) {
        const currentSize = groupSizes[gIdx] ?? 3;
        // Solo asignar a zonas de 4 que aún no están completas
        if (currentSize === 4 && teamsPerGroup[gIdx].length < 4) {
          teamsPerGroup[gIdx].push(teamIds[teamIndex]);
          teamIndex++;
          assignedAny = true;
        }
      }
      // Si no se asignó ningún equipo en esta iteración, salir
      if (!assignedAny) {
        break;
      }
      continue; // Continuar con la siguiente iteración para completar más zonas de 4 si es necesario
    }
    
    // Patrón zig-zag normal para las primeras posiciones
    const isForwardPass = pass % 2 === 0; // ida (A→B→C) o vuelta (C→B→A)
    let assignedInThisPass = false; // Para detectar si se asignó algún equipo en esta pasada
    
    if (isForwardPass) {
      // Pasada hacia adelante: A → B → C → ...
      for (let gIdx = 0; gIdx < numGroups && teamIndex < teamIds.length; gIdx++) {
        const currentSize = groupSizes[gIdx] ?? 3;
        // Solo asignar si la zona aún no está llena
        if (teamsPerGroup[gIdx].length < currentSize) {
          teamsPerGroup[gIdx].push(teamIds[teamIndex]);
          teamIndex++;
          assignedInThisPass = true;
        }
      }
    } else {
      // Pasada hacia atrás: ... → C → B → A
      for (let gIdx = numGroups - 1; gIdx >= 0 && teamIndex < teamIds.length; gIdx--) {
        const currentSize = groupSizes[gIdx] ?? 3;
        // Solo asignar si la zona aún no está llena
        if (teamsPerGroup[gIdx].length < currentSize) {
          teamsPerGroup[gIdx].push(teamIds[teamIndex]);
          teamIndex++;
          assignedInThisPass = true;
        }
      }
    }
    
    // Si no se asignó ningún equipo en esta pasada (todas las zonas están llenas), salir
    if (!assignedInThisPass) {
      break;
    }
    
    pass++;
  }

  // Ahora asignar los equipos a los grupos en el orden final
  createdGroups.forEach((g, idx) => {
    const idsForGroup = teamsPerGroup[idx] ?? [];
    const size = groupSizes[idx] ?? 3;

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

  // Los partidos se crean sin horarios asignados
  // Los horarios se asignarán después desde la pestaña de grupos

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

  // actualizar torneo a schedule_review (nueva etapa de revisión de horarios)
  const { error: upError } = await supabase
    .from("tournaments")
    .update({ status: "schedule_review" })
    .eq("id", tournamentId);

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
