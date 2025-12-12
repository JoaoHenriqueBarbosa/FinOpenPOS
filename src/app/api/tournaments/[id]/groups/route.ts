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

  // traer grupos
  const { data: groups, error: gError } = await supabase
    .from("tournament_groups")
    .select("id, name, group_order")
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id)
    .order("group_order", { ascending: true });

  if (gError) {
    console.error("GET groups error:", gError);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }

  if (!groups || groups.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  const groupIds = groups.map((g) => g.id);

  // equipos por grupo
  const { data: groupTeams, error: gtError } = await supabase
    .from("tournament_group_teams")
    .select(
      `
      id,
      tournament_group_id,
      team:team_id (
        id,
        display_name,
        player1:player1_id ( first_name, last_name ),
        player2:player2_id ( first_name, last_name )
      )
    `
    )
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id);

  if (gtError) {
    console.error("GET group_teams error:", gtError);
    return NextResponse.json(
      { error: "Failed to fetch group teams" },
      { status: 500 }
    );
  }

  // partidos de grupos
  const { data: matches, error: mError } = await supabase
    .from("tournament_matches")
    .select(
      `
      id,
      tournament_group_id,
      phase,
      status,
      match_date,
      start_time,
      end_time,
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
    `
    )
    .eq("tournament_id", tournamentId)
    .eq("phase", "group")
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id)
    .order("id", { ascending: true });

  if (mError) {
    console.error("GET group matches error:", mError);
    return NextResponse.json(
      { error: "Failed to fetch group matches" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    groups,
    groupTeams: groupTeams ?? [],
    matches: matches ?? [],
  });
}
