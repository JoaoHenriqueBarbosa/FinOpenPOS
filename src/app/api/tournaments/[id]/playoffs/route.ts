import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tournament_playoffs")
    .select(
      `
      id,
      round,
      bracket_pos,
      source_team1,
      source_team2,
      match:match_id (
        id,
        status,
        match_date,
        start_time,
        set1_team1_games,
        set1_team2_games,
        set2_team1_games,
        set2_team2_games,
        set3_team1_games,
        set3_team2_games,
        team1:team1_id (
          id,
          display_name,
          player1:player1_id ( first_name, last_name ),
          player2:player2_id ( first_name, last_name )
        ),
        team2:team2_id (
          id,
          display_name,
          player1:player1_id ( first_name, last_name ),
          player2:player2_id ( first_name, last_name )
        )
      )
    `
    )
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id)
    .order("round", { ascending: true })
    .order("bracket_pos", { ascending: true });

  if (error) {
    console.error("GET /tournaments/:id/playoffs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch playoffs" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Verificar que el torneo pertenece al usuario
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id")
    .eq("id", tournamentId)
    .eq("user_uid", user.id)
    .single();

  if (tournamentError || !tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Obtener todos los playoffs del torneo
  const { data: playoffs, error: playoffsError } = await supabase
    .from("tournament_playoffs")
    .select("match_id")
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id);

  if (playoffsError) {
    console.error("Error fetching playoffs:", playoffsError);
    return NextResponse.json(
      { error: "Failed to fetch playoffs" },
      { status: 500 }
    );
  }

  // Si no hay playoffs, no hay nada que eliminar
  if (!playoffs || playoffs.length === 0) {
    return NextResponse.json({ ok: true, message: "No playoffs to delete" });
  }

  // Obtener los IDs de los matches
  const matchIds = playoffs.map(p => p.match_id);

  // Eliminar los matches de playoffs
  const { error: matchesDeleteError } = await supabase
    .from("tournament_matches")
    .delete()
    .in("id", matchIds)
    .eq("tournament_id", tournamentId)
    .eq("phase", "playoff")
    .eq("user_uid", user.id);

  if (matchesDeleteError) {
    console.error("Error deleting playoff matches:", matchesDeleteError);
    return NextResponse.json(
      { error: "Failed to delete playoff matches" },
      { status: 500 }
    );
  }

  // Eliminar los registros de tournament_playoffs
  // (esto debería hacerse automáticamente por CASCADE, pero lo hacemos explícitamente por seguridad)
  const { error: playoffsDeleteError } = await supabase
    .from("tournament_playoffs")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id);

  if (playoffsDeleteError) {
    console.error("Error deleting playoffs:", playoffsDeleteError);
    return NextResponse.json(
      { error: "Failed to delete playoffs" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "Playoffs deleted successfully" });
}