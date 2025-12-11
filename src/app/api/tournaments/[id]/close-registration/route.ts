import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

export async function POST(_req: Request, { params }: RouteParams) {
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
