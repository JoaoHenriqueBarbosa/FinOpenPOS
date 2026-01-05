export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

/**
 * Simula resultados para todos los partidos de playoffs de un torneo
 * Genera resultados realistas con sets y games
 * Procesa los partidos en orden de ronda (16avos -> octavos -> cuartos -> semifinal -> final)
 * Llama al endpoint de resultados para cada match para que se actualicen los ganadores
 */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    // Obtener todos los matches de playoffs del torneo
    const { data: playoffRows, error: playoffError } = await supabase
      .from("tournament_playoffs")
      .select(`
        id,
        round,
        bracket_pos,
        source_team1,
        source_team2,
        match:tournament_matches!inner(
          id,
          team1_id,
          team2_id,
          status,
          has_super_tiebreak
        )
      `)
      .eq("tournament_id", tournamentId)
      .order("round", { ascending: true })
      .order("bracket_pos", { ascending: true });

    if (playoffError) {
      console.error("Error fetching playoff matches:", playoffError);
      return NextResponse.json(
        { error: "Failed to fetch playoff matches" },
        { status: 500 }
      );
    }

    if (!playoffRows || playoffRows.length === 0) {
      return NextResponse.json(
        { error: "No playoff matches found to simulate" },
        { status: 400 }
      );
    }

    // Ordenar por ronda (orden específico)
    const roundOrder: Record<string, number> = {
      "16avos": 1,
      "octavos": 2,
      "cuartos": 3,
      "semifinal": 4,
      "final": 5,
    };

    const sortedRows = [...playoffRows].sort((a, b) => {
      const roundA = roundOrder[a.round] || 99;
      const roundB = roundOrder[b.round] || 99;
      if (roundA !== roundB) return roundA - roundB;
      return (a.bracket_pos || 0) - (b.bracket_pos || 0);
    });

    // Obtener el token de sesión para las llamadas internas
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    // Construir la URL base desde el request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Función para generar un resultado de set normal válido
    const generateNormalSetScore = (): { team1: number; team2: number } => {
      const validScores = [
        [6, 0], [6, 1], [6, 2], [6, 3], [6, 4],
        [7, 5], [7, 6]
      ];
      const randomIndex = Math.floor(Math.random() * validScores.length);
      return { team1: validScores[randomIndex][0], team2: validScores[randomIndex][1] };
    }

    // Función para generar un resultado de super tiebreak válido
    const generateSuperTiebreakScore = (): { team1: number; team2: number } => {
      if (Math.random() < 0.7) {
        const loserGames = Math.floor(Math.random() * 10);
        return { team1: 11, team2: loserGames };
      }
      const extension = Math.floor(Math.random() * 3) + 1;
      return { team1: 11 + extension, team2: 9 + extension };
    }

    // Función para verificar si un match está completado
    const isMatchCompleted = async (matchId: number): Promise<boolean> => {
      const { data: match } = await supabase
        .from("tournament_matches")
        .select("status")
        .eq("id", matchId)
        .single();
      return match?.status === "finished";
    }

    // Función para obtener el match ID desde source_team1 o source_team2
    // source_team1/source_team2 tienen formato: "Ganador Cuartos1", "Ganador Semifinal2", etc.
    const getMatchIdFromSource = async (source: string | null, round: string, tournamentId: number): Promise<number | null> => {
      if (!source) return null;
      
      // Extraer el número del bracket_pos del source (ej: "Ganador Cuartos1" -> 1)
      const match = source.match(/(\d+)$/);
      if (!match) return null;
      
      const bracketPos = Number(match[1]);
      if (Number.isNaN(bracketPos)) return null;

      // Obtener el match_id del playoff correspondiente
      const { data: playoff } = await supabase
        .from("tournament_playoffs")
        .select("match_id")
        .eq("tournament_id", tournamentId)
        .eq("round", round)
        .eq("bracket_pos", bracketPos)
        .single();

      return playoff?.match_id || null;
    };

    // Simular resultados para cada match en orden
    const results = [];
    const errors = [];
    const skipped = [];

    for (const row of sortedRows) {
      // match puede ser un array o un objeto único dependiendo de la query de Supabase
      const match = Array.isArray(row.match) ? row.match[0] : row.match;
      if (!match) continue;

      try {
        // Si el match ya está finalizado, saltarlo
        if (match.status === "finished") {
          skipped.push({
            matchId: match.id,
            reason: "Ya está finalizado",
          });
          continue;
        }

        // Si el match no tiene ambos equipos, verificar si depende de matches anteriores
        if (!match.team1_id || !match.team2_id) {
          // Si tiene source_team1 o source_team2, verificar que el match anterior esté completado
          if (row.source_team1 || row.source_team2) {
            // Determinar qué ronda anterior necesitamos verificar
            const previousRoundMap: Record<string, string> = {
              "octavos": "16avos",
              "cuartos": "octavos",
              "semifinal": "cuartos",
              "final": "semifinal",
            };
            const previousRound = previousRoundMap[row.round];
            
            if (previousRound) {
              // Verificar ambos source matches
              const source1MatchId = await getMatchIdFromSource(row.source_team1, previousRound, tournamentId);
              const source2MatchId = await getMatchIdFromSource(row.source_team2, previousRound, tournamentId);
              
              let canProceed = true;
              if (source1MatchId && !(await isMatchCompleted(source1MatchId))) {
                canProceed = false;
              }
              if (source2MatchId && !(await isMatchCompleted(source2MatchId))) {
                canProceed = false;
              }
              
              if (!canProceed) {
                skipped.push({
                  matchId: match.id,
                  reason: "Esperando que se completen los matches anteriores",
                });
                continue;
              }
            }
          } else {
            // No tiene equipos y no tiene source, es un bye o no está listo
            skipped.push({
              matchId: match.id,
              reason: "No tiene ambos equipos asignados",
            });
            continue;
          }
        }

        // Si aún no tiene ambos equipos después de verificar sources, saltarlo
        if (!match.team1_id || !match.team2_id) {
          skipped.push({
            matchId: match.id,
            reason: "No tiene ambos equipos asignados",
          });
          continue;
        }

        // Decidir aleatoriamente quién gana (50/50)
        const team1Wins = Math.random() < 0.5;
        
        // Generar sets normales (set1 y set2)
        const set1 = generateNormalSetScore();
        const set2 = generateNormalSetScore();
        
        // Asegurar que el ganador gane al menos 2 sets
        if (team1Wins) {
          if (set1.team1 < set1.team2) {
            [set1.team1, set1.team2] = [set1.team2, set1.team1];
          }
          if (set2.team1 < set2.team2) {
            [set2.team1, set2.team2] = [set2.team2, set2.team1];
          }
        } else {
          if (set1.team1 > set1.team2) {
            [set1.team1, set1.team2] = [set1.team2, set1.team1];
          }
          if (set2.team1 > set2.team2) {
            [set2.team1, set2.team2] = [set2.team2, set2.team1];
          }
        }

        // Calcular sets ganados
        let team1Sets = 0;
        let team2Sets = 0;

        if (set1.team1 > set1.team2) {
          team1Sets++;
        } else {
          team2Sets++;
        }

        if (set2.team1 > set2.team2) {
          team1Sets++;
        } else {
          team2Sets++;
        }

        // Si hay empate en sets, generar un tercer set
        let set3: { team1: number; team2: number } | null = null;
        if (team1Sets === 1 && team2Sets === 1) {
          // En playoffs, cuartos, semifinal y final NO usan super tiebreak
          const isSuperTiebreak = !["cuartos", "semifinal", "final"].includes(row.round) && match.has_super_tiebreak;
          
          if (isSuperTiebreak) {
            set3 = generateSuperTiebreakScore();
          } else {
            set3 = generateNormalSetScore();
          }
          
          if (team1Wins) {
            if (set3.team1 < set3.team2) {
              [set3.team1, set3.team2] = [set3.team2, set3.team1];
            }
            team1Sets++;
          } else {
            if (set3.team1 > set3.team2) {
              [set3.team1, set3.team2] = [set3.team2, set3.team1];
            }
            team2Sets++;
          }
        }

        // Preparar los sets para el endpoint
        const sets = [
          { team1: set1.team1, team2: set1.team2 },
          { team1: set2.team1, team2: set2.team2 },
        ];
        if (set3) {
          sets.push({ team1: set3.team1, team2: set3.team2 });
        }

        // Llamar al endpoint de resultados
        const resultUrl = `${baseUrl}/api/tournament-matches/${match.id}/result`;
        const resultRes = await fetch(resultUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
            Cookie: req.headers.get("Cookie") || "",
          },
          body: JSON.stringify({ sets }),
        });

        if (!resultRes.ok) {
          const errorData = await resultRes.json();
          console.error(`Error simulating match ${match.id}:`, errorData);
          errors.push({
            matchId: match.id,
            round: row.round,
            bracketPos: row.bracket_pos,
            error: errorData.error || "Unknown error",
          });
          continue;
        }

        results.push({
          matchId: match.id,
          round: row.round,
          bracketPos: row.bracket_pos,
          result: `${team1Sets}-${team2Sets}`,
        });
      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error);
        errors.push({
          matchId: match.id,
          round: row.round,
          bracketPos: row.bracket_pos,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Se simularon ${results.length} partidos${errors.length > 0 ? `, ${errors.length} con errores` : ""}${skipped.length > 0 ? `, ${skipped.length} omitidos` : ""}`,
      results,
      ...(errors.length > 0 && { errors }),
      ...(skipped.length > 0 && { skipped }),
    });
  } catch (error) {
    console.error("Error simulating playoff results:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

