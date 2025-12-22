import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

/**
 * Vuelve el torneo a la etapa de revisión de horarios (schedule_review).
 * Solo funciona si no hay ningún resultado de ningún partido cargado.
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

  try {
    // Verificar que el torneo existe y está en in_progress
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, status")
      .eq("id", tournamentId)
      .eq("user_uid", user.id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status !== "in_progress") {
      return NextResponse.json(
        { error: "Tournament must be in_progress to reopen schedule review" },
        { status: 400 }
      );
    }

    // Verificar que no haya resultados cargados en ningún partido
    const { data: matches, error: matchesError } = await supabase
      .from("tournament_matches")
      .select("id, set1_team1_games, set1_team2_games, status")
      .eq("tournament_id", tournamentId)
      .eq("phase", "group")
      .eq("user_uid", user.id);

    if (matchesError) {
      return NextResponse.json({ error: "Error checking matches" }, { status: 500 });
    }

    // Verificar si hay algún partido con resultados cargados
    const hasResults = matches?.some(m => 
      m.set1_team1_games !== null || 
      m.set1_team2_games !== null ||
      m.status === "finished" ||
      m.status === "in_progress"
    );

    if (hasResults) {
      return NextResponse.json(
        { error: "No se puede volver a revisión de horarios porque hay partidos con resultados cargados" },
        { status: 400 }
      );
    }

    // Actualizar torneo a schedule_review
    const { error: updateError } = await supabase
      .from("tournaments")
      .update({ status: "schedule_review" })
      .eq("id", tournamentId)
      .eq("user_uid", user.id);

    if (updateError) {
      console.error("Error updating tournament status:", updateError);
      return NextResponse.json(
        { error: "Failed to update tournament status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Tournament reopened for schedule review" });
  } catch (error) {
    console.error("Error reopening schedule review:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

