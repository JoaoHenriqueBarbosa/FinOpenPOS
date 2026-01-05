export const dynamic = 'force-dynamic'
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

  // Traer grupos
  const { data: groups, error: gError } = await supabase
    .from("tournament_groups")
    .select("id, name, group_order")
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id)
    .order("group_order", { ascending: true });

  if (gError) {
    console.error("GET standings groups error:", gError);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }

  if (!groups || groups.length === 0) {
    return NextResponse.json({ groups: [], standings: [], matches: [] });
  }

  const groupIds = groups.map((g) => g.id);

  // Traer standings
  const { data: standings, error: sError } = await supabase
    .from("tournament_group_standings")
    .select(
      `
      id,
      tournament_group_id,
      matches_played,
      wins,
      losses,
      sets_won,
      sets_lost,
      games_won,
      games_lost,
      position,
      team:team_id (
        id,
        display_name,
        player1:player1_id ( first_name, last_name ),
        player2:player2_id ( first_name, last_name )
      )
    `
    )
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id)
    .order("position", { ascending: true });

  if (sError) {
    console.error("GET standings error:", sError);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }

  // Traer matches con resultados
  const { data: matches, error: mError } = await supabase
    .from("tournament_matches")
    .select(
      `
      id,
      tournament_group_id,
      status,
      match_date,
      start_time,
      match_order,
      court_id,
      set1_team1_games,
      set1_team2_games,
      set2_team1_games,
      set2_team2_games,
      set3_team1_games,
      set3_team2_games,
      team1_sets,
      team2_sets,
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
    .order("match_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (mError) {
    console.error("GET standings matches error:", mError);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }

  // Traer equipos por grupo (para mostrar cuando no hay standings)
  const { data: groupTeams, error: gtError } = await supabase
    .from("tournament_group_teams")
    .select(
      `
      id,
      tournament_group_id,
      team:team_id (
        id,
        display_name,
        seed_number,
        player1:player1_id ( first_name, last_name ),
        player2:player2_id ( first_name, last_name )
      )
    `
    )
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id);

  if (gtError) {
    console.error("GET standings groupTeams error:", gtError);
    // No fallamos el request, solo logueamos el error
  }

  return NextResponse.json({
    groups: groups ?? [],
    standings: standings ?? [],
    matches: matches ?? [],
    groupTeams: groupTeams ?? [],
  });
}

