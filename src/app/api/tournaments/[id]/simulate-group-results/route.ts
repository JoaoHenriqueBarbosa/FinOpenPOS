export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

/**
 * Simula resultados para todos los partidos de grupo de un torneo
 * Genera resultados realistas con sets y games
 * Llama al endpoint de resultados para cada match para que se actualicen los standings
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
    // Obtener todos los matches de grupo del torneo que no estén finalizados
    const { data: matches, error: matchesError } = await supabase
      .from("tournament_matches")
      .select("id, team1_id, team2_id, has_super_tiebreak")
      .eq("tournament_id", tournamentId)
      .eq("phase", "group")
      .eq("user_uid", user.id)
      .neq("status", "finished")
      .not("team1_id", "is", null)
      .not("team2_id", "is", null);

    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
      return NextResponse.json(
        { error: "Failed to fetch matches" },
        { status: 500 }
      );
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json(
        { error: "No matches found to simulate" },
        { status: 400 }
      );
    }

    // Obtener el token de sesión para las llamadas internas
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    // Construir la URL base desde el request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Función para generar un resultado de set normal válido
    // Scores válidos: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6
    const generateNormalSetScore = (): { team1: number; team2: number } => {
      const validScores = [
        [6, 0], [6, 1], [6, 2], [6, 3], [6, 4],
        [7, 5], [7, 6]
      ];
      const randomIndex = Math.floor(Math.random() * validScores.length);
      return { team1: validScores[randomIndex][0], team2: validScores[randomIndex][1] };
    }

    // Función para generar un resultado de super tiebreak válido
    // Scores válidos: 11-0 a 11-9, 12-10, 13-11, 14-12, etc.
    const generateSuperTiebreakScore = (): { team1: number; team2: number } => {
      // Probabilidad de 70% para scores simples (11-0 a 11-9)
      if (Math.random() < 0.7) {
        const loserGames = Math.floor(Math.random() * 10); // 0-9
        return { team1: 11, team2: loserGames };
      }
      // 30% para scores extendidos (12-10, 13-11, 14-12, etc.)
      const extension = Math.floor(Math.random() * 3) + 1; // 1-3 extensiones
      return { team1: 11 + extension, team2: 9 + extension };
    }

    // Simular resultados para cada match
    const results = [];
    const errors = [];

    for (const match of matches) {
      try {
        // Decidir aleatoriamente quién gana (50/50)
        const team1Wins = Math.random() < 0.5;
        
        // Generar sets normales (set1 y set2)
        const set1 = generateNormalSetScore();
        const set2 = generateNormalSetScore();
        
        // Asegurar que el ganador gane al menos 2 sets
        if (team1Wins) {
          // Team1 gana: asegurar que gane set1 y set2
          if (set1.team1 < set1.team2) {
            [set1.team1, set1.team2] = [set1.team2, set1.team1];
          }
          if (set2.team1 < set2.team2) {
            [set2.team1, set2.team2] = [set2.team2, set2.team1];
          }
        } else {
          // Team2 gana: asegurar que gane set1 y set2
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
          // Generar tercer set según el tipo de match
          if (match.has_super_tiebreak) {
            set3 = generateSuperTiebreakScore();
          } else {
            set3 = generateNormalSetScore();
          }
          
          if (team1Wins) {
            // Asegurar que team1 gane el set3
            if (set3.team1 < set3.team2) {
              [set3.team1, set3.team2] = [set3.team2, set3.team1];
            }
            team1Sets++;
          } else {
            // Asegurar que team2 gane el set3
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
            // También pasar las cookies del request original
            Cookie: req.headers.get("Cookie") || "",
          },
          body: JSON.stringify({ sets }),
        });

        if (!resultRes.ok) {
          const errorData = await resultRes.json();
          console.error(`Error simulating match ${match.id}:`, errorData);
          errors.push({
            matchId: match.id,
            error: errorData.error || "Unknown error",
          });
          continue;
        }

        results.push({
          matchId: match.id,
          result: `${team1Sets}-${team2Sets}`,
        });
      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error);
        errors.push({
          matchId: match.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Se simularon ${results.length} partidos${errors.length > 0 ? `, ${errors.length} con errores` : ""}`,
      results,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    console.error("Error simulating group results:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

