import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

/**
 * Intercambia los horarios de todos los matches de una zona por otra.
 * Solo funciona si ambas zonas tienen la misma cantidad de equipos.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 });
  }

  const body = await req.json();
  const { group1Id, group2Id } = body as {
    group1Id: number;
    group2Id: number;
  };

  if (!group1Id || !group2Id || group1Id === group2Id) {
    return NextResponse.json({ error: "Invalid group ids" }, { status: 400 });
  }

  try {
    // Verificar que el torneo existe y pertenece al usuario
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournament_groups")
      .select("tournament_id")
      .eq("tournament_id", tournamentId)
      .eq("id", group1Id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournament or group not found" }, { status: 404 });
    }

    // Verificar que ambas zonas pertenecen al mismo torneo
    const { data: group2, error: group2Error } = await supabase
      .from("tournament_groups")
      .select("tournament_id")
      .eq("tournament_id", tournamentId)
      .eq("id", group2Id)
      .single();

    if (group2Error || !group2) {
      return NextResponse.json({ error: "Group 2 not found" }, { status: 404 });
    }

    // Contar equipos en cada zona
    const { data: teams1, error: teams1Error } = await supabase
      .from("tournament_group_teams")
      .select("id")
      .eq("tournament_group_id", group1Id);

    const { data: teams2, error: teams2Error } = await supabase
      .from("tournament_group_teams")
      .select("id")
      .eq("tournament_group_id", group2Id);

    if (teams1Error || teams2Error) {
      return NextResponse.json({ error: "Error counting teams" }, { status: 500 });
    }

    if (!teams1 || !teams2 || teams1.length !== teams2.length) {
      return NextResponse.json(
        { error: "Both groups must have the same number of teams" },
        { status: 400 }
      );
    }

    // Obtener todos los matches de ambas zonas
    const { data: matches1, error: matches1Error } = await supabase
      .from("tournament_matches")
      .select("id, match_date, start_time, end_time, court_id")
      .eq("tournament_group_id", group1Id)
      .eq("phase", "group")
      .eq("user_uid", user.id);

    const { data: matches2, error: matches2Error } = await supabase
      .from("tournament_matches")
      .select("id, match_date, start_time, end_time, court_id")
      .eq("tournament_group_id", group2Id)
      .eq("phase", "group")
      .eq("user_uid", user.id);

    if (matches1Error || matches2Error) {
      return NextResponse.json({ error: "Error fetching matches" }, { status: 500 });
    }

    if (!matches1 || !matches2) {
      return NextResponse.json({ error: "Matches not found" }, { status: 404 });
    }

    if (matches1.length !== matches2.length) {
      return NextResponse.json(
        { error: "Both groups must have the same number of matches" },
        { status: 400 }
      );
    }

    // Ordenar matches por match_order para asegurar correspondencia
    const sortedMatches1 = [...matches1].sort((a, b) => {
      const orderA = a.match_order ?? 0;
      const orderB = b.match_order ?? 0;
      return orderA - orderB;
    });

    const sortedMatches2 = [...matches2].sort((a, b) => {
      const orderA = a.match_order ?? 0;
      const orderB = b.match_order ?? 0;
      return orderA - orderB;
    });

    // Intercambiar horarios
    const updates: Promise<any>[] = [];

    for (let i = 0; i < sortedMatches1.length; i++) {
      const match1 = sortedMatches1[i];
      const match2 = sortedMatches2[i];

      // Intercambiar horarios: match1 obtiene horarios de match2 y viceversa
      updates.push(
        supabase
          .from("tournament_matches")
          .update({
            match_date: match2.match_date,
            start_time: match2.start_time,
            end_time: match2.end_time,
            court_id: match2.court_id,
          })
          .eq("id", match1.id)
          .eq("user_uid", user.id)
      );

      updates.push(
        supabase
          .from("tournament_matches")
          .update({
            match_date: match1.match_date,
            start_time: match1.start_time,
            end_time: match1.end_time,
            court_id: match1.court_id,
          })
          .eq("id", match2.id)
          .eq("user_uid", user.id)
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ ok: true, message: "Groups schedules swapped successfully" });
  } catch (error) {
    console.error("Error swapping group schedules:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

