import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

export async function PATCH(req: Request, { params }: RouteParams) {
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
  const { match_date, start_time, end_time, court_id } = body as {
    match_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    court_id?: number | null;
  };

  // Verificar que el match existe y pertenece al usuario
  const { data: match, error: matchError } = await supabase
    .from("tournament_matches")
    .select("id, user_uid")
    .eq("id", matchId)
    .single();

  if (matchError || !match || match.user_uid !== user.id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Si se proporciona court_id, verificar que la cancha existe y pertenece al usuario
  if (court_id !== undefined && court_id !== null) {
    const { data: court, error: courtError } = await supabase
      .from("courts")
      .select("id, user_uid")
      .eq("id", court_id)
      .single();

    if (courtError || !court || court.user_uid !== user.id) {
      return NextResponse.json({ error: "Invalid court" }, { status: 400 });
    }
  }

  // Actualizar el match
  const updateData: {
    match_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    court_id?: number | null;
  } = {};

  if (match_date !== undefined) updateData.match_date = match_date;
  if (start_time !== undefined) updateData.start_time = start_time;
  if (end_time !== undefined) updateData.end_time = end_time;
  if (court_id !== undefined) updateData.court_id = court_id;

  const { error: updateError } = await supabase
    .from("tournament_matches")
    .update(updateData)
    .eq("id", matchId)
    .eq("user_uid", user.id);

  if (updateError) {
    console.error("Error updating match schedule:", updateError);
    return NextResponse.json(
      { error: "Failed to update match schedule" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

