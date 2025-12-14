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
    .select("id, user_uid, tournament_id, phase, team1_id, team2_id, tournament_group_id")
    .eq("id", matchId)
    .single();

  if (matchError || !match || match.user_uid !== user.id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Validar: si es un match de zona (group) y ya hay playoffs generados, no permitir modificar
  if (match.phase === "group") {
    const { data: existingPlayoffs, error: playoffsCheckError } = await supabase
      .from("tournament_playoffs")
      .select("id")
      .eq("tournament_id", match.tournament_id)
      .eq("user_uid", user.id)
      .limit(1);

    if (!playoffsCheckError && existingPlayoffs && existingPlayoffs.length > 0) {
      return NextResponse.json(
        { error: "No se pueden modificar los resultados de zona una vez generados los playoffs" },
        { status: 403 }
      );
    }
  }

  // Obtener el setting del torneo para has_super_tiebreak
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("has_super_tiebreak")
    .eq("id", match.tournament_id)
    .eq("user_uid", user.id)
    .single();

  if (tournamentError || !tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Determinar si este match debe usar super tiebreak
  // Si es fase de grupos: usar el valor del torneo
  // Si es playoffs: usar el valor del torneo EXCEPTO para cuartos, semifinal y final (siempre false)
  let hasSuperTiebreak = tournament.has_super_tiebreak;
  
  if (match.phase === "playoff") {
    // Obtener la ronda del match
    const { data: playoffInfo, error: playoffInfoError } = await supabase
      .from("tournament_playoffs")
      .select("round")
      .eq("match_id", matchId)
      .eq("user_uid", user.id)
      .single();

    if (playoffInfoError || !playoffInfo) {
      return NextResponse.json(
        { error: "Playoff information not found" },
        { status: 404 }
      );
    }

    const currentRound = playoffInfo.round;

    // Validación 1: No se pueden cargar resultados de una ronda hasta que todas las rondas anteriores estén completas
    const previousRounds = getPreviousRounds(currentRound);
    if (previousRounds.length > 0) {
      // Obtener todos los matches de las rondas anteriores
      const { data: previousRoundMatches, error: prevRoundsError } = await supabase
        .from("tournament_playoffs")
        .select("match_id, round")
        .eq("tournament_id", match.tournament_id)
        .eq("user_uid", user.id)
        .in("round", previousRounds);

      if (!prevRoundsError && previousRoundMatches && previousRoundMatches.length > 0) {
        // Obtener los matches para verificar si están completos
        const previousMatchIds = previousRoundMatches.map(p => p.match_id);
        const { data: previousMatches, error: prevMatchesError } = await supabase
          .from("tournament_matches")
          .select("id, status")
          .in("id", previousMatchIds)
          .eq("user_uid", user.id);

        if (!prevMatchesError && previousMatches) {
          // Verificar que todos los matches anteriores estén completos
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

    // Validación 2: No se puede modificar un resultado de una ronda anterior si ya hay resultados en rondas posteriores
    // Primero verificar si este match ya tiene un resultado (es una modificación)
    const { data: existingMatch } = await supabase
      .from("tournament_matches")
      .select("status, set1_team1_games, set1_team2_games")
      .eq("id", matchId)
      .eq("user_uid", user.id)
      .single();

    const isModification = existingMatch && (
      existingMatch.status === "finished" || 
      existingMatch.set1_team1_games !== null || 
      existingMatch.set1_team2_games !== null
    );

    if (isModification) {
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
            // Verificar si hay algún match completado en rondas posteriores
            const completedNextMatches = nextMatches.filter(m => m.status === "finished");
            if (completedNextMatches.length > 0) {
              // Obtener las rondas de los matches completados usando el mapa de playoffs
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

  // Si es un match de fase de grupos, recalcular standings
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
      .eq("user_uid", user.id);

    if (!groupMatchesError && groupMatches) {
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

        // Ordenar standings por: wins, diff sets, diff games
        const sortedStats = Array.from(standingsMap.values()).sort((a, b) => {
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
  if (match.phase === "playoff" && winnerTeamId) {
    // Obtener información del bracket (round y bracket_pos)
    const { data: playoffInfo, error: playoffError } = await supabase
      .from("tournament_playoffs")
      .select("round, bracket_pos")
      .eq("match_id", matchId)
      .eq("user_uid", user.id)
      .single();

    if (!playoffError && playoffInfo) {
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
        // Usamos source_team1 o source_team2 que contienen "Ganador [Round][bracket_pos]"
        const currentRoundLabel = currentRound.charAt(0).toUpperCase() + currentRound.slice(1);
        const sourcePattern = `Ganador ${currentRoundLabel}${currentBracketPos}`;
        
        // Buscar todos los matches de la siguiente ronda
        const { data: nextRoundPlayoffs, error: nextRoundError } = await supabase
          .from("tournament_playoffs")
          .select("match_id, bracket_pos, source_team1, source_team2")
          .eq("tournament_id", match.tournament_id)
          .eq("round", nextRound)
          .eq("user_uid", user.id);

        // Filtrar para encontrar el match que tiene la referencia a este match
        const nextRoundPlayoff = nextRoundPlayoffs?.find(
          (p) => p.source_team1 === sourcePattern || p.source_team2 === sourcePattern
        );

        if (!nextRoundError && nextRoundPlayoff) {
          
          // Obtener el match siguiente
          const { data: nextMatch, error: nextMatchError } = await supabase
            .from("tournament_matches")
            .select("team1_id, team2_id, status")
            .eq("id", nextRoundPlayoff.match_id)
            .eq("user_uid", user.id)
            .single();

          if (!nextMatchError && nextMatch) {
            // Determinar qué campo actualizar basado en source_team1 o source_team2
            let updateField: string;
            if (nextRoundPlayoff.source_team1 === sourcePattern) {
              updateField = "team1_id";
            } else if (nextRoundPlayoff.source_team2 === sourcePattern) {
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
              .eq("id", nextRoundPlayoff.match_id)
              .eq("user_uid", user.id);

            if (advanceError) {
              console.error("Error advancing winner to next round:", advanceError);
              // No fallamos el request completo, solo logueamos el error
            }
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

  // Obtener el match completo con información del torneo y fase
  const { data: match, error: matchError } = await supabase
    .from("tournament_matches")
    .select("id, user_uid, tournament_id, phase, team1_id, team2_id, tournament_group_id")
    .eq("id", matchId)
    .single();

  if (matchError || !match || match.user_uid !== user.id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Validar: si es un match de zona (group) y ya hay playoffs generados, no permitir limpiar
  if (match.phase === "group") {
    const { data: existingPlayoffs, error: playoffsCheckError } = await supabase
      .from("tournament_playoffs")
      .select("id")
      .eq("tournament_id", match.tournament_id)
      .eq("user_uid", user.id)
      .limit(1);

    if (!playoffsCheckError && existingPlayoffs && existingPlayoffs.length > 0) {
      return NextResponse.json(
        { error: "No se pueden limpiar los resultados de zona una vez generados los playoffs" },
        { status: 403 }
      );
    }
  }

  // Si es un match de playoffs, aplicar las mismas validaciones que al modificar
  if (match.phase === "playoff") {
    const { data: playoffInfo, error: playoffInfoError } = await supabase
      .from("tournament_playoffs")
      .select("round")
      .eq("match_id", matchId)
      .eq("user_uid", user.id)
      .single();

    if (!playoffInfoError && playoffInfo) {
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
  }

  // Si es un match de playoffs, necesitamos revertir el avance del ganador a la siguiente ronda
  let winnerTeamIdToRemove: number | null = null;
  if (match.phase === "playoff") {
    // Obtener el ganador actual antes de limpiar
    const { data: currentMatch, error: currentMatchError } = await supabase
      .from("tournament_matches")
      .select("team1_id, team2_id, team1_sets, team2_sets")
      .eq("id", matchId)
      .eq("user_uid", user.id)
      .single();

    if (!currentMatchError && currentMatch) {
      const t1sets = currentMatch.team1_sets ?? 0;
      const t2sets = currentMatch.team2_sets ?? 0;
      if (t1sets > t2sets) {
        winnerTeamIdToRemove = currentMatch.team1_id;
      } else if (t2sets > t1sets) {
        winnerTeamIdToRemove = currentMatch.team2_id;
      }

      // Si hay un ganador, buscar y limpiar en la siguiente ronda
      if (winnerTeamIdToRemove) {
        const { data: playoffInfo, error: playoffInfoError } = await supabase
          .from("tournament_playoffs")
          .select("round, bracket_pos")
          .eq("match_id", matchId)
          .eq("user_uid", user.id)
          .single();

        if (!playoffInfoError && playoffInfo) {
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
            
            // Buscar todos los matches de la siguiente ronda
            const { data: nextRoundPlayoffs, error: nextRoundError } = await supabase
              .from("tournament_playoffs")
              .select("match_id, bracket_pos, source_team1, source_team2")
              .eq("tournament_id", match.tournament_id)
              .eq("round", nextRound)
              .eq("user_uid", user.id);

            // Filtrar para encontrar el match que tiene la referencia a este match
            const nextRoundPlayoff = nextRoundPlayoffs?.find(
              (p) => p.source_team1 === sourcePattern || p.source_team2 === sourcePattern
            );

            if (nextRoundPlayoff) {
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
