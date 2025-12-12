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

  // Verificar si ya existen playoffs
  const { data: existingPlayoffs, error: existingPlayoffsError } = await supabase
    .from("tournament_playoffs")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id)
    .limit(1);

  if (existingPlayoffsError) {
    console.error("Error checking existing playoffs:", existingPlayoffsError);
    return NextResponse.json(
      { error: "Failed to check existing playoffs" },
      { status: 500 }
    );
  }

  if (existingPlayoffs && existingPlayoffs.length > 0) {
    return NextResponse.json(
      { error: "Playoffs already generated for this tournament" },
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

  // 7) generar playoffs: bracket completo con todas las rondas
  if (qualifiedTeams.length < 2) {
    return NextResponse.json(
      { error: "Not enough qualified teams for playoffs" },
      { status: 400 }
    );
  }

  // ordenar: primero por posición (1°, 2°, 3°), luego por grupo
  // Esto asegura que los primeros de cada zona estén al principio y pasen directo cuando hay byes
  qualifiedTeams.sort((a, b) => {
    if (a.pos !== b.pos) {
      return a.pos - b.pos; // Primero todos los 1°, luego 2°, luego 3°
    }
    return a.from_group_id - b.from_group_id; // Dentro de la misma posición, por grupo
  });

  const n = qualifiedTeams.length;

  // Calcular cuántos equipos deben jugar en la primera ronda
  // La idea es que la siguiente ronda tenga un número par de equipos (preferiblemente potencia de 2)
  const calculateFirstRound = (totalTeams: number): {
    firstRoundName: string;
    teamsPlaying: number;
    teamsWithBye: number;
    nextRoundSize: number;
  } => {
    if (totalTeams <= 2) {
      return { firstRoundName: "final", teamsPlaying: totalTeams, teamsWithBye: 0, nextRoundSize: 2 };
    }

    // Determinar el tamaño objetivo de la siguiente ronda
    // Queremos la potencia de 2 más cercana que sea >= totalTeams/2
    let nextRoundSize = 2;
    if (totalTeams > 16) nextRoundSize = 16;
    else if (totalTeams > 8) nextRoundSize = 8;
    else if (totalTeams > 4) nextRoundSize = 4;
    else nextRoundSize = 2;

    // Calcular cuántos equipos deben jugar para llenar la siguiente ronda
    // Estrategia: queremos que la siguiente ronda tenga nextRoundSize equipos
    // Si totalTeams > nextRoundSize: algunos pasan directo
    // Si totalTeams <= nextRoundSize: todos juegan
    
    let teamsPlaying: number;
    let teamsWithBye: number;

    if (totalTeams > nextRoundSize) {
      // Algunos pasan directo
      // Queremos: teamsPlaying/2 + teamsWithBye = nextRoundSize
      // Donde: teamsWithBye = totalTeams - teamsPlaying
      // Resolviendo: teamsPlaying = 2 * (totalTeams - nextRoundSize)
      teamsPlaying = 2 * (totalTeams - nextRoundSize);
      teamsWithBye = totalTeams - teamsPlaying;
      
      // Validar que teamsPlaying sea par y positivo
      if (teamsPlaying <= 0 || teamsPlaying % 2 !== 0) {
        // Si la fórmula no funciona, usar una estrategia alternativa:
        // Hacer que el máximo número par de equipos juegue
        teamsPlaying = totalTeams % 2 === 0 ? totalTeams : totalTeams - 1;
        teamsWithBye = totalTeams - teamsPlaying;
        
        // Ajustar nextRoundSize si es necesario
        const actualNextRoundSize = Math.floor(teamsPlaying / 2) + teamsWithBye;
        if (actualNextRoundSize !== nextRoundSize && actualNextRoundSize > 0) {
          // Ajustar el nombre de la ronda si cambió el tamaño
          if (actualNextRoundSize === 2) {
            nextRoundSize = 2;
          } else if (actualNextRoundSize <= 4) {
            nextRoundSize = 4;
          } else if (actualNextRoundSize <= 8) {
            nextRoundSize = 8;
          }
        }
      }
    } else {
      // Todos juegan en la primera ronda
      teamsPlaying = totalTeams;
      teamsWithBye = 0;
    }

    // Determinar el nombre de la primera ronda
    let firstRoundName = "cuartos";
    if (nextRoundSize === 16) firstRoundName = "16avos";
    else if (nextRoundSize === 8) firstRoundName = "octavos";
    else if (nextRoundSize === 4) firstRoundName = "cuartos";
    else if (nextRoundSize === 2) firstRoundName = "semifinal";

    return { firstRoundName, teamsPlaying, teamsWithBye, nextRoundSize };
  };

  const { firstRoundName, teamsPlaying, teamsWithBye, nextRoundSize } = calculateFirstRound(n);
  const firstRoundMatches = Math.floor(teamsPlaying / 2);
  const teamsAdvancing = firstRoundMatches + teamsWithBye;

  // Generar todas las rondas necesarias
  type RoundInfo = {
    name: string;
    matches: number;
    teamsIn: number;
  };

  const rounds: RoundInfo[] = [{
    name: firstRoundName,
    matches: firstRoundMatches,
    teamsIn: teamsPlaying,
  }];

  // Calcular rondas siguientes
  let currentTeams = teamsAdvancing;
  while (currentTeams > 1) {
    const nextMatches = Math.ceil(currentTeams / 2);
    let nextRoundName = "";
    
    if (nextMatches === 1) {
      nextRoundName = "final";
    } else if (currentTeams <= 4) {
      nextRoundName = "semifinal";
    } else if (currentTeams <= 8) {
      nextRoundName = "cuartos";
    } else if (currentTeams <= 16) {
      nextRoundName = "octavos";
    } else {
      nextRoundName = "16avos";
    }

    // Evitar duplicar rondas con el mismo nombre y número de matches
    const alreadyExists = rounds.some(
      r => r.name === nextRoundName && r.matches === nextMatches
    );
    if (alreadyExists) break;

    rounds.push({
      name: nextRoundName,
      matches: nextMatches,
      teamsIn: currentTeams,
    });
    
    currentTeams = nextMatches;
  }

  // Crear todos los partidos de todas las rondas
  const allMatches: Array<{
    round: string;
    bracket_pos: number;
    team1_id: number | null;
    team2_id: number | null;
    source_team1: string | null;
    source_team2: string | null;
  }> = [];

  // Primera ronda: los mejores seeds pasan directo, los restantes juegan
  // Ejemplo con 6 equipos: seeds 1-2 pasan directo, seeds 3-6 juegan cuartos
  const teamsPlayingInFirstRound = qualifiedTeams.slice(teamsWithBye);
  const teamsWithByeList = qualifiedTeams.slice(0, teamsWithBye);
  
  // Crear matches de la primera ronda con los equipos que juegan
  for (let i = 0; i < firstRoundMatches; i++) {
    const t1 = teamsPlayingInFirstRound[i];
    const t2 = teamsPlayingInFirstRound[teamsPlayingInFirstRound.length - 1 - i];
    allMatches.push({
      round: firstRoundName,
      bracket_pos: i + 1,
      team1_id: t1.team_id,
      team2_id: t2.team_id,
      source_team1: null,
      source_team2: null,
    });
  }

  // Generar rondas siguientes
  for (let r = 1; r < rounds.length; r++) {
    const round = rounds[r];
    const prevRound = rounds[r - 1];
    const prevRoundLabel = prevRound.name.charAt(0).toUpperCase() + prevRound.name.slice(1);

    // Si es la primera ronda después de la inicial, asignar los equipos con bye
    if (r === 1 && teamsWithBye > 0) {
      // Distribuir los equipos con bye en diferentes matches (uno por match)
      // Luego completar con ganadores de la primera ronda
      let byeIndex = 0;
      let winnerIndex = 0;

      for (let i = 0; i < round.matches; i++) {
        const matchNum = i + 1;
        let team1Id: number | null = null;
        let team2Id: number | null = null;
        let source1: string | null = null;
        let source2: string | null = null;

        // Estrategia: distribuir un bye por match (si hay disponibles)
        // Esto asegura que los primeros de cada zona estén en diferentes cruces
        if (byeIndex < teamsWithBye) {
          // Asignar un bye a team1 de este match
          team1Id = teamsWithByeList[byeIndex].team_id;
          source1 = null;
          byeIndex++;
          
          // El segundo equipo es un ganador de la ronda anterior
          source2 = `Ganador ${prevRoundLabel}${winnerIndex + 1}`;
          winnerIndex++;
        } else {
          // Ya no hay más byes, ambos equipos son ganadores
          source1 = `Ganador ${prevRoundLabel}${winnerIndex + 1}`;
          source2 = `Ganador ${prevRoundLabel}${winnerIndex + 2}`;
          winnerIndex += 2;
        }

        allMatches.push({
          round: round.name,
          bracket_pos: matchNum,
          team1_id: team1Id,
          team2_id: team2Id,
          source_team1: source1,
          source_team2: source2,
        });
      }
    } else {
      // Rondas normales: solo ganadores avanzan
      for (let i = 0; i < round.matches; i++) {
        const matchNum = i + 1;
        const prevMatch1 = i * 2 + 1;
        const prevMatch2 = i * 2 + 2;

        allMatches.push({
          round: round.name,
          bracket_pos: matchNum,
          team1_id: null,
          team2_id: null,
          source_team1: `Ganador ${prevRoundLabel}${prevMatch1}`,
          source_team2: `Ganador ${prevRoundLabel}${prevMatch2}`,
        });
      }
    }
  }

  // Insertar todos los partidos en la base de datos
  const playoffMatchesPayload: any[] = allMatches.map((m) => ({
    tournament_id: tournamentId,
    user_uid: user.id,
    phase: "playoff",
    tournament_group_id: null,
    team1_id: m.team1_id,
    team2_id: m.team2_id,
    status: "scheduled",
  }));

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

  // Crear las filas de tournament_playoffs con referencias correctas
  const playoffRows: any[] = allMatches.map((m, idx) => ({
    tournament_id: tournamentId,
    user_uid: user.id,
    match_id: createdMatches[idx].id,
    round: m.round,
    bracket_pos: m.bracket_pos,
    source_team1: m.source_team1,
    source_team2: m.source_team2,
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
