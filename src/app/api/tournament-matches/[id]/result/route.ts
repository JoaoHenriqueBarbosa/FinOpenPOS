import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateMatchSets } from "@/lib/match-validation";

type RouteParams = { params: { id: string } };

// Orden de las rondas de playoffs (de menor a mayor)
const ROUND_ORDER: Record<string, number> = {
  "16avos": 1,
  "octavos": 2,
  "cuartos": 3,
  "semifinal": 4,
  "final": 5,
};

// Obtener todas las rondas anteriores a una ronda dada
function getPreviousRounds(round: string): string[] {
  const currentOrder = ROUND_ORDER[round] || 0;
  return Object.entries(ROUND_ORDER)
    .filter(([_, order]) => order < currentOrder)
    .map(([roundName]) => roundName);
}

// Obtener todas las rondas posteriores a una ronda dada
function getNextRounds(round: string): string[] {
  const currentOrder = ROUND_ORDER[round] || 0;
  return Object.entries(ROUND_ORDER)
    .filter(([_, order]) => order > currentOrder)
    .map(([roundName]) => roundName);
}

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
  const { sets } = body as {
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

  // Obtener el match completo con información del torneo y fase
  const { data: match, error: matchError } = await supabase
    .from("tournament_matches")
    .select("id, user_uid, tournament_id, phase, team1_id, team2_id, tournament_group_id, status, set1_team1_games, set1_team2_games")
    .eq("id", matchId)
    .single();

  if (matchError || !match || match.user_uid !== user.id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const isModification = match && (
    match.status === "finished" || 
    match.set1_team1_games !== null || 
    match.set1_team2_games !== null
  );

  // Obtener torneo y verificar playoffs en paralelo
  const [tournamentResult, playoffsCheckResult] = await Promise.all([
    supabase
      .from("tournaments")
      .select("has_super_tiebreak")
      .eq("id", match.tournament_id)
      .eq("user_uid", user.id)
      .single(),
    match.phase === "group" 
      ? supabase
          .from("tournament_playoffs")
          .select("id")
          .eq("tournament_id", match.tournament_id)
          .eq("user_uid", user.id)
          .limit(1)
      : Promise.resolve({ data: null, error: null })
  ]);

  const { data: tournament, error: tournamentError } = tournamentResult;
  const { data: existingPlayoffs, error: playoffsCheckError } = playoffsCheckResult;

  if (tournamentError || !tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Validar: si es un match de zona (group) y ya hay playoffs generados, no permitir modificar
  if (match.phase === "group" && !playoffsCheckError && existingPlayoffs && existingPlayoffs.length > 0) {
    return NextResponse.json(
      { error: "No se pueden modificar los resultados de zona una vez generados los playoffs" },
      { status: 403 }
    );
  }

  // Determinar si este match debe usar super tiebreak
  // Si es fase de grupos: usar el valor del torneo
  // Si es playoffs: usar el valor del torneo EXCEPTO para cuartos, semifinal y final (siempre false)
  let hasSuperTiebreak = tournament.has_super_tiebreak;
  let playoffInfo: { round: string; bracket_pos: number } | null = null;
  
  if (match.phase === "playoff") {
    // Obtener la ronda del match
    const { data: playoffData, error: playoffInfoError } = await supabase
      .from("tournament_playoffs")
      .select("round, bracket_pos")
      .eq("match_id", matchId)
      .eq("user_uid", user.id)
      .single();

    if (playoffInfoError || !playoffData) {
      return NextResponse.json(
        { error: "Playoff information not found" },
        { status: 404 }
      );
    }

    playoffInfo = playoffData;
    const currentRound = playoffInfo.round;

    // Validaciones de playoffs - hacer consultas en paralelo cuando sea posible
    const previousRounds = getPreviousRounds(currentRound);
    const nextRounds = getNextRounds(currentRound);
    
    // Preparar consultas para validaciones
    const validationQueries: Promise<any>[] = [];
    
    // Validación 1: Verificar rondas anteriores (solo si hay rondas anteriores)
    if (previousRounds.length > 0) {
      validationQueries.push(
        supabase
          .from("tournament_playoffs")
          .select("match_id, round")
          .eq("tournament_id", match.tournament_id)
          .eq("user_uid", user.id)
          .in("round", previousRounds)
      );
    }

    // Validación 2: Verificar rondas posteriores (solo si es modificación y hay rondas posteriores)
    if (isModification && nextRounds.length > 0) {
      validationQueries.push(
        supabase
          .from("tournament_playoffs")
          .select("match_id, round")
          .eq("tournament_id", match.tournament_id)
          .eq("user_uid", user.id)
          .in("round", nextRounds)
      );
    }

    // Ejecutar validaciones en paralelo
    const validationResults = await Promise.all(validationQueries);

    // Procesar validación 1: rondas anteriores
    if (previousRounds.length > 0 && validationResults[0]) {
      const { data: previousRoundMatches, error: prevRoundsError } = validationResults[0];
      if (!prevRoundsError && previousRoundMatches && previousRoundMatches.length > 0) {
        const previousMatchIds = previousRoundMatches.map(p => p.match_id);
        const { data: previousMatches, error: prevMatchesError } = await supabase
          .from("tournament_matches")
          .select("id, status")
          .in("id", previousMatchIds)
          .eq("user_uid", user.id);

        if (!prevMatchesError && previousMatches) {
          const incompleteMatches = previousMatches.filter(m => m.status !== "finished");
          if (incompleteMatches.length > 0) {
            const incompleteRounds = new Set(
              incompleteMatches
                .map(m => {
                  const playoff = previousRoundMatches.find(p => p.match_id === m.id);
                  return playoff?.round;
                })
                .filter(Boolean)
            );
            return NextResponse.json(
              { 
                error: `No se pueden cargar resultados de ${currentRound} hasta que todas las rondas anteriores estén completas. Rondas incompletas: ${Array.from(incompleteRounds).join(", ")}` 
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // Procesar validación 2: rondas posteriores (solo si es modificación)
    if (isModification && nextRounds.length > 0) {
      const resultIndex = previousRounds.length > 0 ? 1 : 0;
      const { data: nextRoundPlayoffs, error: nextRoundsError } = validationResults[resultIndex] || { data: null, error: null };
      
      if (!nextRoundsError && nextRoundPlayoffs && nextRoundPlayoffs.length > 0) {
        const nextMatchIds = nextRoundPlayoffs.map(p => p.match_id);
        const { data: nextMatches, error: nextMatchesError } = await supabase
          .from("tournament_matches")
          .select("id, status")
          .in("id", nextMatchIds)
          .eq("user_uid", user.id);

        if (!nextMatchesError && nextMatches) {
          const completedNextMatches = nextMatches.filter(m => m.status === "finished");
          if (completedNextMatches.length > 0) {
            const completedRounds = new Set<string>();
            completedNextMatches.forEach(m => {
              const playoff = nextRoundPlayoffs.find(p => p.match_id === m.id);
              if (playoff?.round) {
                completedRounds.add(playoff.round);
              }
            });
            
            if (completedRounds.size > 0) {
              return NextResponse.json(
                { 
                  error: `No se puede modificar un resultado de ${currentRound} porque ya hay resultados cargados en rondas posteriores: ${Array.from(completedRounds).join(", ")}` 
                },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // Si es cuartos, semifinal o final, siempre false
    if (playoffInfo.round === "cuartos" || playoffInfo.round === "semifinal" || playoffInfo.round === "final") {
      hasSuperTiebreak = false;
    }
  }

  // Validar los sets antes de guardar
  const validation = validateMatchSets(
    { team1: set1_team1_games, team2: set1_team2_games },
    { team1: set2_team1_games, team2: set2_team2_games },
    { team1: set3_team1_games, team2: set3_team2_games },
    hasSuperTiebreak
  );

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || "Invalid set scores" },
      { status: 400 }
    );
  }

  // Determinar el ganador
  const winnerTeamId = team1Sets > team2Sets ? match.team1_id : match.team2_id;

  // Actualizar el match (has_super_tiebreak ya no es una columna en tournament_matches)
  const { error: updateError } = await supabase
    .from("tournament_matches")
    .update({
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

  // Si es un match de fase de grupos, recalcular standings y actualizar partidos de segunda ronda (si es zona de 4)
  if (match.phase === "group" && match.tournament_group_id) {
    // Obtener todos los matches del grupo
    const { data: groupMatches, error: groupMatchesError } = await supabase
      .from("tournament_matches")
      .select(
        "id, tournament_group_id, team1_id, team2_id, team1_sets, team2_sets, team1_games_total, team2_games_total, status"
      )
      .eq("tournament_id", match.tournament_id)
      .eq("phase", "group")
      .eq("tournament_group_id", match.tournament_group_id)
      .eq("user_uid", user.id)
      .order("id", { ascending: true });

    if (!groupMatchesError && groupMatches) {
      // Verificar si es una zona de 4 equipos (tiene 4 partidos)
      if (groupMatches.length === 4) {
        // Identificar partidos de primera ronda (tienen equipos asignados) y segunda ronda (tienen null)
        const firstRoundMatches = groupMatches.filter(m => m.team1_id && m.team2_id && m.id !== matchId);
        const secondRoundMatches = groupMatches.filter(m => !m.team1_id || !m.team2_id);
        
        // Si acabamos de terminar un partido de primera ronda, actualizar los de segunda ronda
        const justFinishedMatch = groupMatches.find(m => m.id === matchId);
        if (justFinishedMatch && justFinishedMatch.team1_id && justFinishedMatch.team2_id && justFinishedMatch.status === "finished") {
          // Este es un partido de primera ronda que acaba de terminar
          // Obtener el otro partido de primera ronda
          const otherFirstRoundMatch = firstRoundMatches.find(m => m.id !== matchId);
          
          if (otherFirstRoundMatch && otherFirstRoundMatch.status === "finished") {
            // Ambos partidos de primera ronda están terminados, actualizar los de segunda ronda
            const winner1 = (justFinishedMatch.team1_sets ?? 0) > (justFinishedMatch.team2_sets ?? 0) 
              ? justFinishedMatch.team1_id 
              : justFinishedMatch.team2_id;
            const loser1 = (justFinishedMatch.team1_sets ?? 0) > (justFinishedMatch.team2_sets ?? 0) 
              ? justFinishedMatch.team2_id 
              : justFinishedMatch.team1_id;
            
            const winner2 = (otherFirstRoundMatch.team1_sets ?? 0) > (otherFirstRoundMatch.team2_sets ?? 0) 
              ? otherFirstRoundMatch.team1_id 
              : otherFirstRoundMatch.team2_id;
            const loser2 = (otherFirstRoundMatch.team1_sets ?? 0) > (otherFirstRoundMatch.team2_sets ?? 0) 
              ? otherFirstRoundMatch.team2_id 
              : otherFirstRoundMatch.team1_id;
            
            // Partido 3: Ganador 1vs4 vs Ganador 2vs3 (ronda de ganadores)
            // Partido 4: Perdedor 1vs4 vs Perdedor 2vs3 (ronda de perdedores)
            const winnersMatch = secondRoundMatches[0]; // Primer partido de segunda ronda
            const losersMatch = secondRoundMatches[1]; // Segundo partido de segunda ronda
            
            if (winnersMatch) {
              await supabase
                .from("tournament_matches")
                .update({
                  team1_id: winner1,
                  team2_id: winner2,
                  status: "scheduled", // Asegurar que esté en scheduled si estaba en otro estado
                })
                .eq("id", winnersMatch.id)
                .eq("user_uid", user.id);
            }
            
            if (losersMatch) {
              await supabase
                .from("tournament_matches")
                .update({
                  team1_id: loser1,
                  team2_id: loser2,
                  status: "scheduled", // Asegurar que esté en scheduled si estaba en otro estado
                })
                .eq("id", losersMatch.id)
                .eq("user_uid", user.id);
            }
          }
        }
      }
      // Calcular standings
      type Stand = {
        team_id: number;
        matches_played: number;
        wins: number;
        losses: number;
        sets_won: number;
        sets_lost: number;
        games_won: number;
        games_lost: number;
        position?: number; // Para zonas de 4, posición final
      };

      const standingsMap = new Map<number, Stand>();

      const initStand = (teamId: number): Stand => ({
        team_id: teamId,
        matches_played: 0,
        wins: 0,
        losses: 0,
        sets_won: 0,
        sets_lost: 0,
        games_won: 0,
        games_lost: 0,
      });

      // Verificar si es zona de 4 y todos los partidos están terminados
      const isGroupOf4 = groupMatches.length === 4;
      const allMatchesFinished = groupMatches.every(m => m.status === "finished" && m.team1_id && m.team2_id);
      
      if (isGroupOf4 && allMatchesFinished) {
        // Lógica especial para zona de 4: posiciones basadas en segunda ronda
        const sortedMatches = [...groupMatches].sort((a, b) => a.id - b.id);
        const secondRoundMatches = sortedMatches.slice(2, 4);
        const winnersMatch = secondRoundMatches[0]; // Partido de ganadores
        const losersMatch = secondRoundMatches[1]; // Partido de perdedores
        
        if (winnersMatch && losersMatch && winnersMatch.team1_id && winnersMatch.team2_id && 
            losersMatch.team1_id && losersMatch.team2_id) {
          // Determinar posiciones finales
          const winnerOfWinners = (winnersMatch.team1_sets ?? 0) > (winnersMatch.team2_sets ?? 0) 
            ? winnersMatch.team1_id 
            : winnersMatch.team2_id;
          const loserOfWinners = (winnersMatch.team1_sets ?? 0) > (winnersMatch.team2_sets ?? 0) 
            ? winnersMatch.team2_id 
            : winnersMatch.team1_id;
          const winnerOfLosers = (losersMatch.team1_sets ?? 0) > (losersMatch.team2_sets ?? 0) 
            ? losersMatch.team1_id 
            : losersMatch.team2_id;
          const loserOfLosers = (losersMatch.team1_sets ?? 0) > (losersMatch.team2_sets ?? 0) 
            ? losersMatch.team2_id 
            : losersMatch.team1_id;
          
          // Inicializar standings con posiciones
          standingsMap.set(winnerOfWinners, { ...initStand(winnerOfWinners), position: 1 });
          standingsMap.set(loserOfWinners, { ...initStand(loserOfWinners), position: 2 });
          standingsMap.set(winnerOfLosers, { ...initStand(winnerOfLosers), position: 3 });
          standingsMap.set(loserOfLosers, { ...initStand(loserOfLosers), position: 4 });
        }
      }

      // Calcular estadísticas de todos los matches del grupo
      for (const m of groupMatches) {
        if (!m.team1_id || !m.team2_id || m.status !== "finished") continue;

        if (!standingsMap.has(m.team1_id)) {
          standingsMap.set(m.team1_id, initStand(m.team1_id));
        }
        if (!standingsMap.has(m.team2_id)) {
          standingsMap.set(m.team2_id, initStand(m.team2_id));
        }

        const s1 = standingsMap.get(m.team1_id)!;
        const s2 = standingsMap.get(m.team2_id)!;

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
        } else if (t2sets > t1sets) {
          s2.wins += 1;
          s1.losses += 1;
        }
      }

      // Obtener todos los equipos del grupo (incluso los que no han jugado)
      const { data: groupTeams, error: groupTeamsError } = await supabase
        .from("tournament_group_teams")
        .select("team_id")
        .eq("tournament_group_id", match.tournament_group_id)
        .eq("user_uid", user.id);

      if (!groupTeamsError && groupTeams) {
        // Asegurar que todos los equipos tengan standings (incluso si no han jugado)
        for (const gt of groupTeams) {
          if (!standingsMap.has(gt.team_id)) {
            standingsMap.set(gt.team_id, initStand(gt.team_id));
          }
        }

        // Ordenar standings
        // Si es zona de 4 y todos terminados, ordenar por posición
        // Si no, ordenar por: wins, diff sets, diff games
        const sortedStats = Array.from(standingsMap.values()).sort((a, b) => {
          if (isGroupOf4 && allMatchesFinished && a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
          }
          if (b.wins !== a.wins) return b.wins - a.wins;
          const aSetDiff = a.sets_won - a.sets_lost;
          const bSetDiff = b.sets_won - b.sets_lost;
          if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
          const aGameDiff = a.games_won - a.games_lost;
          const bGameDiff = b.games_won - b.games_lost;
          return bGameDiff - aGameDiff;
        });

        // Eliminar standings antiguos del grupo
        await supabase
          .from("tournament_group_standings")
          .delete()
          .eq("tournament_group_id", match.tournament_group_id)
          .eq("user_uid", user.id);

        // Insertar nuevos standings con posición
        const standingsInsert = sortedStats.map((s, index) => ({
          tournament_group_id: match.tournament_group_id,
          team_id: s.team_id,
          user_uid: user.id,
          matches_played: s.matches_played,
          wins: s.wins,
          losses: s.losses,
          sets_won: s.sets_won,
          sets_lost: s.sets_lost,
          games_won: s.games_won,
          games_lost: s.games_lost,
          position: index + 1, // Guardar la posición (1, 2, 3, ...)
        }));

        if (standingsInsert.length > 0) {
          const { error: standingsError } = await supabase
            .from("tournament_group_standings")
            .insert(standingsInsert);

          if (standingsError) {
            console.error("Error updating standings:", standingsError);
            // No fallamos el request, solo logueamos el error
          }
        }
      }
    }
  }

  // Si es un match de playoffs, avanzar el ganador a la siguiente ronda
  // Usar playoffInfo que ya se obtuvo en las validaciones anteriores
  if (match.phase === "playoff" && winnerTeamId && playoffInfo) {
    const currentRound = playoffInfo.round;
    const currentBracketPos = playoffInfo.bracket_pos;

    // Determinar la siguiente ronda
    const getNextRound = (round: string): string | null => {
      const roundOrder: Record<string, string> = {
        "16avos": "octavos",
        "octavos": "cuartos",
        "cuartos": "semifinal",
        "semifinal": "final",
      };
      return roundOrder[round] || null;
    };

    const nextRound = getNextRound(currentRound);

    if (nextRound) {
      // Buscar el match de la siguiente ronda que tiene referencia a este match
      const currentRoundLabel = currentRound.charAt(0).toUpperCase() + currentRound.slice(1);
      const sourcePattern = `Ganador ${currentRoundLabel}${currentBracketPos}`;
      
      // Buscar el match de la siguiente ronda con filtro optimizado (usar .or() para filtrar en la DB)
      const { data: nextRoundPlayoffs, error: nextRoundError } = await supabase
        .from("tournament_playoffs")
        .select("match_id, bracket_pos, source_team1, source_team2")
        .eq("tournament_id", match.tournament_id)
        .eq("round", nextRound)
        .eq("user_uid", user.id)
        .or(`source_team1.eq.${sourcePattern},source_team2.eq.${sourcePattern}`)
        .limit(1)
        .maybeSingle();

      if (!nextRoundError && nextRoundPlayoffs) {
        // Obtener el match siguiente
        const { data: nextMatch, error: nextMatchError } = await supabase
          .from("tournament_matches")
          .select("team1_id, team2_id, status")
          .eq("id", nextRoundPlayoffs.match_id)
          .eq("user_uid", user.id)
          .single();

        if (!nextMatchError && nextMatch) {
          // Determinar qué campo actualizar basado en source_team1 o source_team2
          let updateField: string;
          if (nextRoundPlayoffs.source_team1 === sourcePattern) {
            updateField = "team1_id";
          } else if (nextRoundPlayoffs.source_team2 === sourcePattern) {
            updateField = "team2_id";
          } else {
            // Fallback: usar el campo vacío
            if (!nextMatch.team1_id) {
              updateField = "team1_id";
            } else if (!nextMatch.team2_id) {
              updateField = "team2_id";
            } else {
              // Ambos llenos, no debería pasar pero usamos team2 como fallback
              updateField = "team2_id";
            }
          }

          const updateData: Record<string, any> = { [updateField]: winnerTeamId };

          // Si ahora tiene ambos equipos, actualizar el status a "scheduled"
          const willHaveBothTeams =
            (updateField === "team1_id" && nextMatch.team2_id) ||
            (updateField === "team2_id" && nextMatch.team1_id);
          
          if (willHaveBothTeams && nextMatch.status !== "scheduled") {
            updateData.status = "scheduled";
          }

          const { error: advanceError } = await supabase
            .from("tournament_matches")
            .update(updateData)
            .eq("id", nextRoundPlayoffs.match_id)
            .eq("user_uid", user.id);

          if (advanceError) {
            console.error("Error advancing winner to next round:", advanceError);
            // No fallamos el request completo, solo logueamos el error
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const matchId = Number(params.id);
  if (Number.isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Obtener el match completo con toda la información necesaria en una sola consulta
  const { data: match, error: matchError } = await supabase
    .from("tournament_matches")
    .select("id, user_uid, tournament_id, phase, team1_id, team2_id, tournament_group_id, team1_sets, team2_sets")
    .eq("id", matchId)
    .single();

  if (matchError || !match || match.user_uid !== user.id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Preparar consultas en paralelo según el tipo de match
  const parallelQueries: Promise<any>[] = [];
  
  // Si es grupo, verificar playoffs
  if (match.phase === "group") {
    parallelQueries.push(
      supabase
        .from("tournament_playoffs")
        .select("id")
        .eq("tournament_id", match.tournament_id)
        .eq("user_uid", user.id)
        .limit(1)
    );
  }

  // Si es playoff, obtener info de playoff y validar rondas posteriores
  let playoffInfo: { round: string; bracket_pos: number } | null = null;
  if (match.phase === "playoff") {
    parallelQueries.push(
      supabase
        .from("tournament_playoffs")
        .select("round, bracket_pos")
        .eq("match_id", matchId)
        .eq("user_uid", user.id)
        .single()
    );
  }

  // Ejecutar consultas en paralelo
  const results = await Promise.all(parallelQueries);

  // Procesar resultados
  if (match.phase === "group") {
    const { data: existingPlayoffs, error: playoffsCheckError } = results[0];
    if (!playoffsCheckError && existingPlayoffs && existingPlayoffs.length > 0) {
      return NextResponse.json(
        { error: "No se pueden limpiar los resultados de zona una vez generados los playoffs" },
        { status: 403 }
      );
    }
  }

  if (match.phase === "playoff") {
    const resultIndex = match.phase === "group" ? 1 : 0;
    const { data: playoffData, error: playoffInfoError } = results[resultIndex];
    
    if (playoffInfoError || !playoffData) {
      return NextResponse.json({ error: "Playoff information not found" }, { status: 404 });
    }

    playoffInfo = playoffData;
    const currentRound = playoffInfo.round;
    const nextRounds = getNextRounds(currentRound);
    
    if (nextRounds.length > 0) {
      // Verificar si hay algún resultado en rondas posteriores
      const { data: nextRoundPlayoffs, error: nextRoundsError } = await supabase
        .from("tournament_playoffs")
        .select("match_id, round")
        .eq("tournament_id", match.tournament_id)
        .eq("user_uid", user.id)
        .in("round", nextRounds);

      if (!nextRoundsError && nextRoundPlayoffs && nextRoundPlayoffs.length > 0) {
        const nextMatchIds = nextRoundPlayoffs.map(p => p.match_id);
        const { data: nextMatches, error: nextMatchesError } = await supabase
          .from("tournament_matches")
          .select("id, status")
          .in("id", nextMatchIds)
          .eq("user_uid", user.id);

        if (!nextMatchesError && nextMatches) {
          const completedNextMatches = nextMatches.filter(m => m.status === "finished");
          if (completedNextMatches.length > 0) {
            const completedRounds = new Set<string>();
            completedNextMatches.forEach(m => {
              const playoff = nextRoundPlayoffs.find(p => p.match_id === m.id);
              if (playoff?.round) {
                completedRounds.add(playoff.round);
              }
            });
            
            if (completedRounds.size > 0) {
              return NextResponse.json(
                { 
                  error: `No se puede limpiar un resultado de ${currentRound} porque ya hay resultados cargados en rondas posteriores: ${Array.from(completedRounds).join(", ")}` 
                },
                { status: 403 }
              );
            }
          }
        }
      }
    }
  }

  // Si es un match de playoffs, necesitamos revertir el avance del ganador a la siguiente ronda
  let winnerTeamIdToRemove: number | null = null;
  if (match.phase === "playoff" && playoffInfo) {
    // Calcular ganador usando los datos que ya tenemos del match
    const t1sets = match.team1_sets ?? 0;
    const t2sets = match.team2_sets ?? 0;
    if (t1sets > t2sets) {
      winnerTeamIdToRemove = match.team1_id;
    } else if (t2sets > t1sets) {
      winnerTeamIdToRemove = match.team2_id;
    }

    // Si hay un ganador, buscar y limpiar en la siguiente ronda
    if (winnerTeamIdToRemove) {
      const currentRound = playoffInfo.round;
      const currentBracketPos = playoffInfo.bracket_pos;

      // Determinar la siguiente ronda
      const getNextRound = (round: string): string | null => {
        const roundOrder: Record<string, string> = {
          "16avos": "octavos",
          "octavos": "cuartos",
          "cuartos": "semifinal",
          "semifinal": "final",
        };
        return roundOrder[round] || null;
      };

      const nextRound = getNextRound(currentRound);

      if (nextRound) {
        // Buscar el match de la siguiente ronda con filtro optimizado en la DB
        const currentRoundLabel = currentRound.charAt(0).toUpperCase() + currentRound.slice(1);
        const sourcePattern = `Ganador ${currentRoundLabel}${currentBracketPos}`;
        
        const { data: nextRoundPlayoff, error: nextRoundError } = await supabase
          .from("tournament_playoffs")
          .select("match_id, bracket_pos, source_team1, source_team2")
          .eq("tournament_id", match.tournament_id)
          .eq("round", nextRound)
          .eq("user_uid", user.id)
          .or(`source_team1.eq.${sourcePattern},source_team2.eq.${sourcePattern}`)
          .limit(1)
          .maybeSingle();

        if (!nextRoundError && nextRoundPlayoff) {
          // Obtener el match siguiente
          const { data: nextMatch, error: nextMatchError } = await supabase
            .from("tournament_matches")
            .select("team1_id, team2_id, status")
            .eq("id", nextRoundPlayoff.match_id)
            .eq("user_uid", user.id)
            .single();

          if (!nextMatchError && nextMatch) {
            // Determinar qué campo limpiar basado en source_team1 o source_team2
            let updateField: string | null = null;
            if (nextRoundPlayoff.source_team1 === sourcePattern) {
              updateField = "team1_id";
            } else if (nextRoundPlayoff.source_team2 === sourcePattern) {
              updateField = "team2_id";
            }

            if (updateField) {
              // Verificar que el team_id en ese campo sea el ganador que estamos removiendo
              const currentTeamId = updateField === "team1_id" ? nextMatch.team1_id : nextMatch.team2_id;
              
              if (currentTeamId === winnerTeamIdToRemove) {
                const updateData: Record<string, any> = { [updateField]: null };

                // Si ahora no tiene ambos equipos, cambiar el status a "scheduled"
                const willHaveBothTeams = 
                  (updateField === "team1_id" && nextMatch.team2_id) ||
                  (updateField === "team2_id" && nextMatch.team1_id);
                
                if (!willHaveBothTeams && nextMatch.status !== "scheduled") {
                  updateData.status = "scheduled";
                }

                const { error: revertError } = await supabase
                  .from("tournament_matches")
                  .update(updateData)
                  .eq("id", nextRoundPlayoff.match_id)
                  .eq("user_uid", user.id);

                if (revertError) {
                  console.error("Error reverting winner advance:", revertError);
                  // No fallamos el request completo, solo logueamos el error
                }
              }
            }
          }
        }
      }
    }
  }

  // Limpiar todos los resultados del match
  const { error: updateError } = await supabase
    .from("tournament_matches")
    .update({
      set1_team1_games: null,
      set1_team2_games: null,
      set2_team1_games: null,
      set2_team2_games: null,
      set3_team1_games: null,
      set3_team2_games: null,
      team1_sets: 0,
      team2_sets: 0,
      team1_games_total: 0,
      team2_games_total: 0,
      status: "scheduled",
    })
    .eq("id", matchId)
    .eq("user_uid", user.id);

  if (updateError) {
    console.error("Error clearing match result:", updateError);
    return NextResponse.json(
      { error: "Failed to clear match result" },
      { status: 500 }
    );
  }

  // Si es un match de fase de grupos, recalcular standings
  if (match.phase === "group" && match.tournament_group_id) {
    // Similar lógica a la del POST pero recalculando con los resultados actualizados
    const { data: groupMatches, error: groupMatchesError } = await supabase
      .from("tournament_matches")
      .select(
        "id, tournament_group_id, team1_id, team2_id, team1_sets, team2_sets, team1_games_total, team2_games_total, status"
      )
      .eq("tournament_id", match.tournament_id)
      .eq("phase", "group")
      .eq("tournament_group_id", match.tournament_group_id)
      .eq("user_uid", user.id);

    if (!groupMatchesError && groupMatches) {
      // Recalcular standings (mismo código que en POST)
      type Stand = {
        team_id: number;
        matches_played: number;
        wins: number;
        losses: number;
        sets_won: number;
        sets_lost: number;
        games_won: number;
        games_lost: number;
      };

      const standingsMap = new Map<number, Stand>();

      const initStand = (teamId: number): Stand => ({
        team_id: teamId,
        matches_played: 0,
        wins: 0,
        losses: 0,
        sets_won: 0,
        sets_lost: 0,
        games_won: 0,
        games_lost: 0,
      });

      for (const m of groupMatches) {
        if (!m.team1_id || !m.team2_id || m.status !== "finished") continue;

        if (!standingsMap.has(m.team1_id)) {
          standingsMap.set(m.team1_id, initStand(m.team1_id));
        }
        if (!standingsMap.has(m.team2_id)) {
          standingsMap.set(m.team2_id, initStand(m.team2_id));
        }

        const s1 = standingsMap.get(m.team1_id)!;
        const s2 = standingsMap.get(m.team2_id)!;

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
        } else if (t2sets > t1sets) {
          s2.wins += 1;
          s1.losses += 1;
        }
      }

      const { data: groupTeams, error: groupTeamsError } = await supabase
        .from("tournament_group_teams")
        .select("team_id")
        .eq("tournament_group_id", match.tournament_group_id)
        .eq("user_uid", user.id);

      if (!groupTeamsError && groupTeams) {
        for (const gt of groupTeams) {
          if (!standingsMap.has(gt.team_id)) {
            standingsMap.set(gt.team_id, initStand(gt.team_id));
          }
        }

        const sortedStats = Array.from(standingsMap.values()).sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          const aSetDiff = a.sets_won - a.sets_lost;
          const bSetDiff = b.sets_won - b.sets_lost;
          if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
          const aGameDiff = a.games_won - a.games_lost;
          const bGameDiff = b.games_won - b.games_lost;
          return bGameDiff - aGameDiff;
        });

        await supabase
          .from("tournament_group_standings")
          .delete()
          .eq("tournament_group_id", match.tournament_group_id)
          .eq("user_uid", user.id);

        const standingsInsert = sortedStats.map((s, index) => ({
          tournament_group_id: match.tournament_group_id,
          team_id: s.team_id,
          user_uid: user.id,
          matches_played: s.matches_played,
          wins: s.wins,
          losses: s.losses,
          sets_won: s.sets_won,
          sets_lost: s.sets_lost,
          games_won: s.games_won,
          games_lost: s.games_lost,
          position: index + 1,
        }));

        if (standingsInsert.length > 0) {
          const { error: standingsError } = await supabase
            .from("tournament_group_standings")
            .insert(standingsInsert);

          if (standingsError) {
            console.error("Error updating standings:", standingsError);
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
