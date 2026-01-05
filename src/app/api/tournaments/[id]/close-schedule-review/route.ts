export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

/**
 * Cierra la revisión de horarios y pasa el torneo a la fase de grupos (in_progress).
 * Una vez cerrada, no se pueden modificar los horarios.
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
    // Verificar que el torneo existe y está en schedule_review
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, status")
      .eq("id", tournamentId)
      .eq("user_uid", user.id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status !== "schedule_review") {
      return NextResponse.json(
        { error: "Tournament must be in schedule_review status to close review" },
        { status: 400 }
      );
    }

    // Verificar que hay grupos y matches con horarios asignados
    const { data: groups, error: groupsError } = await supabase
      .from("tournament_groups")
      .select("id")
      .eq("tournament_id", tournamentId);

    if (groupsError) {
      return NextResponse.json({ error: "Error checking groups" }, { status: 500 });
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json(
        { error: "No groups found. Please close registration first." },
        { status: 400 }
      );
    }

    const { data: matches, error: matchesError } = await supabase
      .from("tournament_matches")
      .select("id, match_date, start_time")
      .eq("tournament_id", tournamentId)
      .eq("phase", "group")
      .eq("user_uid", user.id);

    if (matchesError) {
      return NextResponse.json({ error: "Error checking matches" }, { status: 500 });
    }

    const scheduledMatches = matches?.filter(m => m.match_date && m.start_time) || [];
    
    if (scheduledMatches.length === 0) {
      return NextResponse.json(
        { error: "No matches with schedules found. Please assign schedules first." },
        { status: 400 }
      );
    }

    // Actualizar torneo a in_progress
    const { error: updateError } = await supabase
      .from("tournaments")
      .update({ status: "in_progress" })
      .eq("id", tournamentId)
      .eq("user_uid", user.id);

    if (updateError) {
      console.error("Error updating tournament status:", updateError);
      return NextResponse.json(
        { error: "Failed to update tournament status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Schedule review closed successfully" });
  } catch (error) {
    console.error("Error closing schedule review:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

