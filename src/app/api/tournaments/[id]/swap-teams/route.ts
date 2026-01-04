import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

/**
 * Intercambia una pareja por otra: reemplaza todas las referencias de team1 por team2 y viceversa.
 * Esto afecta:
 * - tournament_matches: donde team1_id o team2_id sea team1 o team2
 * - tournament_group_teams: donde team_id sea team1 o team2
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
  const { team1Id, group1Id, team2Id, group2Id } = body as {
    team1Id: number;
    group1Id: number;
    team2Id: number;
    group2Id: number;
  };

  if (!team1Id || !group1Id || !team2Id || !group2Id) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  if (team1Id === team2Id && group1Id === group2Id) {
    return NextResponse.json({ error: "Cannot swap team with itself" }, { status: 400 });
  }

  try {
    // Verificar que el torneo existe
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id")
      .eq("id", tournamentId)
      .eq("user_uid", user.id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Verificar que los grupos pertenecen al torneo
    // Si ambos equipos están en la misma zona, group1Id === group2Id, así que solo necesitamos 1 grupo
    const uniqueGroupIds = group1Id === group2Id ? [group1Id] : [group1Id, group2Id];
    const { data: groups, error: groupsError } = await supabase
      .from("tournament_groups")
      .select("id, tournament_id")
      .in("id", uniqueGroupIds)
      .eq("tournament_id", tournamentId);

    if (groupsError || !groups || groups.length !== uniqueGroupIds.length) {
      return NextResponse.json({ error: "Groups not found or invalid" }, { status: 404 });
    }

    // Verificar que los equipos pertenecen al torneo
    const { data: teams, error: teamsError } = await supabase
      .from("tournament_teams")
      .select("id, tournament_id")
      .in("id", [team1Id, team2Id])
      .eq("tournament_id", tournamentId);

    if (teamsError || !teams || teams.length !== 2) {
      return NextResponse.json({ error: "Teams not found or invalid" }, { status: 404 });
    }

    // Verificar que los equipos están en los grupos correctos
    const { data: groupTeams, error: groupTeamsError } = await supabase
      .from("tournament_group_teams")
      .select("team_id, tournament_group_id")
      .in("team_id", [team1Id, team2Id])
      .in("tournament_group_id", uniqueGroupIds);

    if (groupTeamsError || !groupTeams) {
      return NextResponse.json({ error: "Error verifying team-group assignments" }, { status: 500 });
    }

    const team1InGroup1 = groupTeams.some(gt => gt.team_id === team1Id && gt.tournament_group_id === group1Id);
    const team2InGroup2 = groupTeams.some(gt => gt.team_id === team2Id && gt.tournament_group_id === group2Id);

    if (!team1InGroup1 || !team2InGroup2) {
      return NextResponse.json(
        { error: "Teams are not in the specified groups" },
        { status: 400 }
      );
    }

    // Obtener todos los matches donde participa team1 o team2 (en cualquier grupo)
    const { data: allMatches, error: matchesError } = await supabase
      .from("tournament_matches")
      .select("id, team1_id, team2_id")
      .eq("phase", "group")
      .eq("user_uid", user.id)
      .or(`team1_id.eq.${team1Id},team2_id.eq.${team1Id},team1_id.eq.${team2Id},team2_id.eq.${team2Id}`);

    if (matchesError) {
      return NextResponse.json({ error: "Error fetching matches" }, { status: 500 });
    }

    if (!allMatches) {
      return NextResponse.json({ error: "Matches not found" }, { status: 404 });
    }

    const updates: Promise<any>[] = [];

    // Intercambiar referencias en tournament_matches
    // Donde team1_id o team2_id sea team1Id, reemplazar con team2Id
    // Donde team1_id o team2_id sea team2Id, reemplazar con team1Id
    for (const match of allMatches) {
      const newTeam1Id = match.team1_id === team1Id ? team2Id : (match.team1_id === team2Id ? team1Id : match.team1_id);
      const newTeam2Id = match.team2_id === team1Id ? team2Id : (match.team2_id === team2Id ? team1Id : match.team2_id);

      // Solo actualizar si hay cambios
      if (newTeam1Id !== match.team1_id || newTeam2Id !== match.team2_id) {
        updates.push(
          (async () => {
            const result = await supabase
              .from("tournament_matches")
              .update({
                team1_id: newTeam1Id,
                team2_id: newTeam2Id,
              })
              .eq("id", match.id)
              .eq("user_uid", user.id);
            return result;
          })()
        );
      }
    }

    // Intercambiar referencias en tournament_group_teams
    // Solo si los equipos están en grupos diferentes
    if (group1Id !== group2Id) {
      // Remover team1 de group1 y agregarlo a group2
      // Remover team2 de group2 y agregarlo a group1
      updates.push(
        (async () => {
          const result = await supabase
            .from("tournament_group_teams")
            .delete()
            .eq("team_id", team1Id)
            .eq("tournament_group_id", group1Id);
          return result;
        })()
      );

      updates.push(
        (async () => {
          const result = await supabase
            .from("tournament_group_teams")
            .delete()
            .eq("team_id", team2Id)
            .eq("tournament_group_id", group2Id);
          return result;
        })()
      );

      updates.push(
        (async () => {
          const result = await supabase
            .from("tournament_group_teams")
            .insert({
              team_id: team1Id,
              tournament_group_id: group2Id,
              user_uid: user.id,
            });
          return result;
        })()
      );

      updates.push(
        (async () => {
          const result = await supabase
            .from("tournament_group_teams")
            .insert({
              team_id: team2Id,
              tournament_group_id: group1Id,
              user_uid: user.id,
            });
          return result;
        })()
      );
    }
    // Si ambos equipos están en el mismo grupo, no necesitamos cambiar tournament_group_teams

    await Promise.all(updates);

    return NextResponse.json({ ok: true, message: "Teams swapped successfully" });
  } catch (error) {
    console.error("Error swapping teams:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

