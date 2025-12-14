import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tournament_teams")
    .select(
      `
      id,
      display_name,
      seed_number,
      player1:player1_id ( id, first_name, last_name ),
      player2:player2_id ( id, first_name, last_name )
    `
    )
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id)
    .order("id", { ascending: true });

  if (error) {
    console.error("GET /tournaments/:id/teams error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { player1_id, player2_id, display_name } = body;

  if (!player1_id || !player2_id || player1_id === player2_id) {
    return NextResponse.json({ error: "Invalid players" }, { status: 400 });
  }

  // opcional: chequear que el torneo siga en draft
  const { data: t, error: terr } = await supabase
    .from("tournaments")
    .select("status, user_uid")
    .eq("id", tournamentId)
    .single();

  if (terr || !t || t.user_uid !== user.id) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (t.status !== "draft") {
    return NextResponse.json(
      { error: "Cannot add teams once registration is closed" },
      { status: 400 }
    );
  }

  // Validar que los jugadores no estén ya en otro equipo del mismo torneo
  const { data: existingTeams, error: existingTeamsError } = await supabase
    .from("tournament_teams")
    .select(`
      id,
      player1_id,
      player2_id,
      player1:player1_id (id, first_name, last_name),
      player2:player2_id (id, first_name, last_name)
    `)
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id);

  if (existingTeamsError) {
    console.error("Error checking existing teams:", existingTeamsError);
    return NextResponse.json(
      { error: "Failed to validate team" },
      { status: 500 }
    );
  }

  if (existingTeams) {
    // Obtener información del jugador 1 que se está intentando agregar
    const { data: player1Data, error: player1Error } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("id", player1_id)
      .single();

    // Obtener información del jugador 2 que se está intentando agregar
    const { data: player2Data, error: player2Error } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("id", player2_id)
      .single();

    // Verificar si player1_id ya está en algún equipo
    const player1InTeam = existingTeams.find(
      (team) => team.player1_id === player1_id || team.player2_id === player1_id
    );
    if (player1InTeam) {
      const playerName = player1Data 
        ? `${player1Data.first_name} ${player1Data.last_name}`
        : "el jugador 1";
      return NextResponse.json(
        { error: `${playerName} ya está registrado en otro equipo de este torneo` },
        { status: 400 }
      );
    }

    // Verificar si player2_id ya está en algún equipo
    const player2InTeam = existingTeams.find(
      (team) => team.player1_id === player2_id || team.player2_id === player2_id
    );
    if (player2InTeam) {
      const playerName = player2Data 
        ? `${player2Data.first_name} ${player2Data.last_name}`
        : "el jugador 2";
      return NextResponse.json(
        { error: `${playerName} ya está registrado en otro equipo de este torneo` },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("tournament_teams")
    .insert({
      tournament_id: tournamentId,
      user_uid: user.id,
      player1_id,
      player2_id,
      display_name: display_name ?? null,
    })
    .select(
      `
      id,
      display_name,
      seed_number,
      player1:player1_id ( id, first_name, last_name ),
      player2:player2_id ( id, first_name, last_name )
    `
    )
    .single();

  if (error) {
    console.error("POST /tournaments/:id/teams error:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournamentId = Number(params.id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamIdParam = searchParams.get("teamId");
  const teamId = teamIdParam ? Number(teamIdParam) : NaN;
  if (!teamIdParam || Number.isNaN(teamId)) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }

  const { data: t, error: terr } = await supabase
    .from("tournaments")
    .select("status, user_uid")
    .eq("id", tournamentId)
    .single();

  if (terr || !t || t.user_uid !== user.id) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (t.status !== "draft") {
    return NextResponse.json(
      { error: "Cannot delete teams once registration is closed" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("tournament_teams")
    .delete()
    .eq("id", teamId)
    .eq("tournament_id", tournamentId)
    .eq("user_uid", user.id);

  if (error) {
    console.error("DELETE /tournaments/:id/teams error:", error);
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
