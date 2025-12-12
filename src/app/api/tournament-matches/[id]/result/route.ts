import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

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
    .select("id, user_uid, tournament_id, phase, team1_id, team2_id")
    .eq("id", matchId)
    .single();

  if (matchError || !match || match.user_uid !== user.id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
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
    const { data: playoffInfo } = await supabase
      .from("tournament_playoffs")
      .select("round")
      .eq("match_id", matchId)
      .eq("user_uid", user.id)
      .single();

    // Si es cuartos, semifinal o final, siempre false
    if (playoffInfo && (playoffInfo.round === "cuartos" || playoffInfo.round === "semifinal" || playoffInfo.round === "final")) {
      hasSuperTiebreak = false;
    }
  }

  // Determinar el ganador
  const winnerTeamId = team1Sets > team2Sets ? match.team1_id : match.team2_id;

  // Actualizar el match
  const { error: updateError } = await supabase
    .from("tournament_matches")
    .update({
      has_super_tiebreak: hasSuperTiebreak,
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
