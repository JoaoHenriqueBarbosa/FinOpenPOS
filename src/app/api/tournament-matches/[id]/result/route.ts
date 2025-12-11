import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const matchId = Number(params.id);
  if (Number.isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { hasSuperTiebreak, sets } = body as {
    hasSuperTiebreak: boolean;
    sets: { team1: number | null; team2: number | null }[];
  };

  const [s1, s2, s3] = sets ?? [];
  const set1_team1_games = s1?.team1 ?? null;
  const set1_team2_games = s1?.team2 ?? null;
  const set2_team1_games = s2?.team1 ?? null;
  const set2_team2_games = s2?.team2 ?? null;
  const set3_team1_games = s3?.team1 ?? null;
  const set3_team2_games = s3?.team2 ?? null;

  let team1Sets = 0;
  let team2Sets = 0;
  let team1GamesTotal = 0;
  let team2GamesTotal = 0;

  const addSet = (a?: number | null, b?: number | null) => {
    if (a == null || b == null) return;
    team1GamesTotal += a;
    team2GamesTotal += b;
    if (a > b) team1Sets += 1;
    else if (b > a) team2Sets += 1;
  };

  addSet(set1_team1_games, set1_team2_games);
  addSet(set2_team1_games, set2_team2_games);
  addSet(set3_team1_games, set3_team2_games);

  const { data: match, error: matchError } = await supabase
    .from("tournament_matches")
    .select("id, user_uid")
    .eq("id", matchId)
    .single();

  if (matchError || !match || match.user_uid !== user.id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("tournament_matches")
    .update({
      has_super_tiebreak: !!hasSuperTiebreak,
      set1_team1_games,
      set1_team2_games,
      set2_team1_games,
      set2_team2_games,
      set3_team1_games,
      set3_team2_games,
      team1_sets: team1Sets,
      team2_sets: team2Sets,
      team1_games_total: team1GamesTotal,
      team2_games_total: team2GamesTotal,
      status: "finished",
    })
    .eq("id", matchId)
    .eq("user_uid", user.id);

  if (updateError) {
    console.error("Error updating match result:", updateError);
    return NextResponse.json(
      { error: "Failed to update match result" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
