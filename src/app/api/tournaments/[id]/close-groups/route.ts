import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

type MatchRow = {
  id: number;
  tournament_group_id: number | null;
  team1_id: number;
  team2_id: number;
  team1_sets: number | null;
  team2_sets: number | null;
  team1_games_total: number | null;
  team2_games_total: number | null;
  status: string;
};

export async function POST(_req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // 1) torneo
  const { data: t, error: terr } = await supabase
    .from("tournaments")
    .select("id, status, user_uid")
    .eq("id", tournamentId)
    .single();

  if (terr || !t || t.user_uid !== user.id) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (t.status !== "in_progress") {
    return NextResponse.json(
      { error: "Tournament must be in_progress to close groups" },
      { status: 400 }
    );
  }

  // 2) grupos
  const { data: groups, error: gError } = await supabase
    .from("tournament_groups")
    .select("id, name")
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id)
    .order("group_order", { ascending: true });

  if (gError || !groups || groups.length === 0) {
    return NextResponse.json({ error: "No groups found" }, { status: 400 });
  }

  const groupIds = groups.map((g) => g.id);

  // 3) group_teams -> para saber tamaño de cada grupo
  const { data: groupTeams, error: gtError } = await supabase
    .from("tournament_group_teams")
    .select("tournament_group_id, team_id")
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id);

  if (gtError || !groupTeams) {
    console.error("Error fetching group_teams:", gtError);
    return NextResponse.json(
      { error: "Failed to fetch group teams" },
      { status: 500 }
    );
  }

  // 4) partidos de grupos ya jugados
  const { data: matches, error: mError } = await supabase
    .from("tournament_matches")
    .select(
      "id, tournament_group_id, team1_id, team2_id, team1_sets, team2_sets, team1_games_total, team2_games_total, status"
    )
    .eq("tournament_id", tournamentId)
    .eq("phase", "group")
    .eq("user_uid", user.id);

  if (mError || !matches) {
    console.error("Error fetching matches:", mError);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }

  // chequear que todos los partidos estén finished
  const unplayed = (matches as MatchRow[]).filter(
    (m) => m.status !== "finished"
  );
  if (unplayed.length > 0) {
    return NextResponse.json(
      { error: "There are group matches not finished yet" },
      { status: 400 }
    );
  }

  // 5) calcular standings por grupo
  type Stand = {
    team_id: number;
    matches_played: number;
    wins: number;
    losses: number;
    sets_won: number;
    sets_lost: number;
    games_won: number;
    games_lost: number;
    points: number;
  };

  const standingsMap = new Map<number, Map<number, Stand>>();
  // group_id -> (team_id -> stat)

  const initStand = (teamId: number): Stand => ({
    team_id: teamId,
    matches_played: 0,
    wins: 0,
    losses: 0,
    sets_won: 0,
    sets_lost: 0,
    games_won: 0,
    games_lost: 0,
    points: 0,
  });

  for (const m of matches as MatchRow[]) {
    const gid = m.tournament_group_id;
    if (!gid) continue;

    if (!standingsMap.has(gid)) {
      standingsMap.set(gid, new Map());
    }
    const map = standingsMap.get(gid)!;

    if (!map.has(m.team1_id)) map.set(m.team1_id, initStand(m.team1_id));
    if (!map.has(m.team2_id)) map.set(m.team2_id, initStand(m.team2_id));

    const s1 = map.get(m.team1_id)!;
    const s2 = map.get(m.team2_id)!;

    s1.matches_played += 1;
    s2.matches_played += 1;

    const t1sets = m.team1_sets ?? 0;
    const t2sets = m.team2_sets ?? 0;
    const t1games = m.team1_games_total ?? 0;
    const t2games = m.team2_games_total ?? 0;

    s1.sets_won += t1sets;
    s1.sets_lost += t2sets;
    s2.sets_won += t2sets;
    s2.sets_lost += t1sets;

    s1.games_won += t1games;
    s1.games_lost += t2games;
    s2.games_won += t2games;
    s2.games_lost += t1games;

    if (t1sets > t2sets) {
      s1.wins += 1;
      s2.losses += 1;
      s1.points += 2;
    } else if (t2sets > t1sets) {
      s2.wins += 1;
      s1.losses += 1;
      s2.points += 2;
    }
  }

  // 6) guardar standings en tabla tournament_group_standings (reemplazar)
  await supabase
    .from("tournament_group_standings")
    .delete()
    .in("tournament_group_id", groupIds)
    .eq("user_uid", user.id);

  const standingsInsert: any[] = [];
  const qualifiedTeams: { team_id: number; from_group_id: number; pos: number }[] =
    [];

  for (const g of groups) {
    const gid = g.id;
    const map = standingsMap.get(gid) ?? new Map<number, Stand>();

    const groupTeamIds = groupTeams
      .filter((gt) => gt.tournament_group_id === gid)
      .map((gt) => gt.team_id);

    const stats: Stand[] = groupTeamIds.map(
      (tid) => map.get(tid) ?? initStand(tid)
    );

    stats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aSetDiff = a.sets_won - a.sets_lost;
      const bSetDiff = b.sets_won - b.sets_lost;
      if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
      const aGameDiff = a.games_won - a.games_lost;
      const bGameDiff = b.games_won - b.games_lost;
      return bGameDiff - aGameDiff;
    });

    // insertar standings
    stats.forEach((s) =>
      standingsInsert.push({
        tournament_group_id: gid,
        team_id: s.team_id,
        user_uid: user.id,
        matches_played: s.matches_played,
        wins: s.wins,
        losses: s.losses,
        sets_won: s.sets_won,
        sets_lost: s.sets_lost,
        games_won: s.games_won,
        games_lost: s.games_lost,
        points: s.points,
      })
    );

    // determinar cuántos clasifican por tamaño del grupo
    const size = groupTeamIds.length;
    let qualifiersCount = 2;
    if (size === 4) qualifiersCount = 3;

    stats.slice(0, qualifiersCount).forEach((s, index) => {
      qualifiedTeams.push({
        team_id: s.team_id,
        from_group_id: gid,
        pos: index + 1,
      });
    });
  }

  if (standingsInsert.length > 0) {
    const { error: siError } = await supabase
      .from("tournament_group_standings")
      .insert(standingsInsert);
    if (siError) {
      console.error("Error inserting standings:", siError);
      return NextResponse.json(
        { error: "Failed to save standings" },
        { status: 500 }
      );
    }
  }

  // 7) generar playoffs: bracket simple con todos los clasificados en orden
  if (qualifiedTeams.length < 2) {
    return NextResponse.json(
      { error: "Not enough qualified teams for playoffs" },
      { status: 400 }
    );
  }

  // ordenar: por grupo, luego posición (1°,2°,3°)
  qualifiedTeams.sort((a, b) => {
    if (a.from_group_id !== b.from_group_id) {
      return a.from_group_id - b.from_group_id;
    }
    return a.pos - b.pos;
  });

  // armamos parejas 1 vs último, 2 vs penúltimo, etc.
  const pairs: { team1_id: number; team2_id: number; round: string }[] = [];
  const roundsLabel = (nPairs: number): string => {
    if (nPairs === 8) return "octavos";
    if (nPairs === 4) return "cuartos";
    if (nPairs === 2) return "semifinal";
    if (nPairs === 1) return "final";
    return "cuartos"; // fallback
  };

  const n = qualifiedTeams.length;
  const nPairs = Math.floor(n / 2);
  const roundName = roundsLabel(nPairs);

  for (let i = 0; i < nPairs; i++) {
    const t1 = qualifiedTeams[i];
    const t2 = qualifiedTeams[n - 1 - i];
    pairs.push({ team1_id: t1.team_id, team2_id: t2.team_id, round: roundName });
  }

  const playoffMatchesPayload: any[] = [];
  pairs.forEach((p, idx) => {
    playoffMatchesPayload.push({
      tournament_id: tournamentId,
      user_uid: user.id,
      phase: "playoff",
      tournament_group_id: null,
      team1_id: p.team1_id,
      team2_id: p.team2_id,
      status: "scheduled",
    });
  });

  const { data: createdMatches, error: cmError } = await supabase
    .from("tournament_matches")
    .insert(playoffMatchesPayload)
    .select("id");

  if (cmError || !createdMatches) {
    console.error("Error creating playoff matches:", cmError);
    return NextResponse.json(
      { error: "Failed to create playoff matches" },
      { status: 500 }
    );
  }

  const playoffRows: any[] = createdMatches.map((m, idx) => ({
    tournament_id: tournamentId,
    user_uid: user.id,
    match_id: m.id,
    round: roundName,
    bracket_pos: idx + 1,
    source_team1: null,
    source_team2: null,
  }));

  const { error: tpError } = await supabase
    .from("tournament_playoffs")
    .insert(playoffRows);

  if (tpError) {
    console.error("Error inserting tournament_playoffs:", tpError);
    return NextResponse.json(
      { error: "Failed to create playoff metadata" },
      { status: 500 }
    );
  }

  // actualizar torneo, opcional: podrías agregar un flag tipo group_phase_closed
  const { error: upError } = await supabase
    .from("tournaments")
    .update({ status: "in_progress" }) // sigue en progreso pero grupos cerrados
    .eq("id", tournamentId)
    .eq("user_uid", user.id);

  if (upError) {
    console.error("Error updating tournament:", upError);
    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
