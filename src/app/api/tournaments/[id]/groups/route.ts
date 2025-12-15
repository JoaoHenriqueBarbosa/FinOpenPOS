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
        seed_number,
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

  // standings por grupo
  const { data: standings, error: sError } = await supabase
    .from("tournament_group_standings")
    .select(
      `
      id,
      tournament_group_id,
      team_id,
      position,
      matches_played,
      wins,
      losses,
      sets_won,
      sets_lost,
      games_won,
      games_lost
    `
    )
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id)
    .order("tournament_group_id", { ascending: true })
    .order("position", { ascending: true });

  if (sError) {
    console.error("GET standings error:", sError);
    // No fallamos el request, solo logueamos el error
  }

  return NextResponse.json({
    groups,
    groupTeams: groupTeams ?? [],
    matches: matches ?? [],
    standings: standings ?? [],
  });
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

  // Validar: no se pueden eliminar grupos si ya hay playoffs generados
  const { data: existingPlayoffs, error: playoffsCheckError } = await supabase
    .from("tournament_playoffs")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id)
    .limit(1);

  if (playoffsCheckError) {
    console.error("Error checking playoffs:", playoffsCheckError);
    return NextResponse.json(
      { error: "Failed to check playoffs" },
      { status: 500 }
    );
  }

  if (existingPlayoffs && existingPlayoffs.length > 0) {
    return NextResponse.json(
      { error: "No se pueden eliminar los grupos si ya hay playoffs generados. Eliminá primero los playoffs." },
      { status: 403 }
    );
  }

  // Obtener todos los grupos del torneo
  const { data: groups, error: groupsError } = await supabase
    .from("tournament_groups")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id);

  if (groupsError) {
    console.error("Error fetching groups:", groupsError);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }

  // Si no hay grupos, no hay nada que eliminar
  if (!groups || groups.length === 0) {
    return NextResponse.json({ ok: true, message: "No groups to delete" });
  }

  const groupIds = groups.map(g => g.id);

  // Eliminar standings primero (dependen de grupos)
  const { error: standingsDeleteError } = await supabase
    .from("tournament_group_standings")
    .delete()
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id);

  if (standingsDeleteError) {
    console.error("Error deleting standings:", standingsDeleteError);
    return NextResponse.json(
      { error: "Failed to delete group standings" },
      { status: 500 }
    );
  }

  // Eliminar los matches de grupos
  const { error: matchesDeleteError } = await supabase
    .from("tournament_matches")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("phase", "group")
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id);

  if (matchesDeleteError) {
    console.error("Error deleting group matches:", matchesDeleteError);
    return NextResponse.json(
      { error: "Failed to delete group matches" },
      { status: 500 }
    );
  }

  // Eliminar las asignaciones de equipos a grupos
  const { error: groupTeamsDeleteError } = await supabase
    .from("tournament_group_teams")
    .delete()
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id);

  if (groupTeamsDeleteError) {
    console.error("Error deleting group teams:", groupTeamsDeleteError);
    return NextResponse.json(
      { error: "Failed to delete group teams" },
      { status: 500 }
    );
  }

  // Eliminar los grupos
  const { error: groupsDeleteError } = await supabase
    .from("tournament_groups")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id);

  if (groupsDeleteError) {
    console.error("Error deleting groups:", groupsDeleteError);
    return NextResponse.json(
      { error: "Failed to delete groups" },
      { status: 500 }
    );
  }

  // Cambiar el estado del torneo a "draft"
  const { error: tournamentUpdateError } = await supabase
    .from("tournaments")
    .update({ status: "draft" })
    .eq("id", tournamentId)
    .eq("user_uid", user.id);

  if (tournamentUpdateError) {
    console.error("Error updating tournament status:", tournamentUpdateError);
    // No fallamos el request completo, solo logueamos el error
    // Los grupos ya fueron eliminados, así que continuamos
  }

  return NextResponse.json({ ok: true, message: "Groups phase deleted successfully" });
}