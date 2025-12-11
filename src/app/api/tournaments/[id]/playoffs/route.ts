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
      match:match_id (
        id,
        status,
        has_super_tiebreak,
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
