export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const tournamentId = Number(params.id);
    
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const teams = await repos.tournamentTeams.findByTournamentId(tournamentId);
    return NextResponse.json(teams);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /tournaments/:id/teams error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const tournamentId = Number(params.id);
    
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { player1_id, player2_id, display_name } = body;

    if (!player1_id || !player2_id || player1_id === player2_id) {
      return NextResponse.json({ error: "Invalid players" }, { status: 400 });
    }

    // Check tournament exists and is in draft
    const tournament = await repos.tournaments.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot add teams once registration is closed" },
        { status: 400 }
      );
    }

    // Validate players are not already in another team
    const player1InTeam = await repos.tournamentTeams.isPlayerInTournament(tournamentId, player1_id);
    if (player1InTeam) {
      const player1 = await repos.players.findById(player1_id);
      const playerName = player1 
        ? `${player1.first_name} ${player1.last_name}`
        : "el jugador 1";
      return NextResponse.json(
        { error: `${playerName} ya está registrado en otro equipo de este torneo` },
        { status: 400 }
      );
    }

    const player2InTeam = await repos.tournamentTeams.isPlayerInTournament(tournamentId, player2_id);
    if (player2InTeam) {
      const player2 = await repos.players.findById(player2_id);
      const playerName = player2 
        ? `${player2.first_name} ${player2.last_name}`
        : "el jugador 2";
      return NextResponse.json(
        { error: `${playerName} ya está registrado en otro equipo de este torneo` },
        { status: 400 }
      );
    }

    // Create team
    const team = await repos.tournamentTeams.create({
      tournament_id: tournamentId,
      player1_id,
      player2_id,
      display_name: display_name ?? null,
    });

    // Fetch team with player details
    const teams = await repos.tournamentTeams.findByTournamentId(tournamentId);
    const createdTeam = teams.find((t) => t.id === team.id);
    
    return NextResponse.json(createdTeam ?? team);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("POST /tournaments/:id/teams error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const tournamentId = Number(params.id);
    
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Try to get teamId from body first, then from query params (for backwards compatibility)
    const body = await req.json().catch(() => ({}));
    const teamIdFromBody = body.team_id ?? body.teamId;
    
    const { searchParams } = new URL(req.url);
    const teamIdFromQuery = searchParams.get("teamId");
    
    const teamId = teamIdFromBody 
      ? Number(teamIdFromBody)
      : teamIdFromQuery 
        ? Number(teamIdFromQuery)
        : NaN;
    
    if (Number.isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
    }

    // Check tournament exists and is in draft
    const tournament = await repos.tournaments.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot delete teams once registration is closed" },
        { status: 400 }
      );
    }

    // Delete team
    await repos.tournamentTeams.delete(teamId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("DELETE /tournaments/:id/teams error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const tournamentId = Number(params.id);
    
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { team_orders } = body; // Array de { teamId: number, display_order: number }

    if (!Array.isArray(team_orders)) {
      return NextResponse.json({ error: "team_orders debe ser un array" }, { status: 400 });
    }

    // Check tournament exists and is in draft
    const tournament = await repos.tournaments.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot reorder teams once registration is closed" },
        { status: 400 }
      );
    }

    // Validar que todos los equipos pertenezcan al torneo
    const existingTeams = await repos.tournamentTeams.findByTournamentId(tournamentId);
    const existingTeamIds = new Set(existingTeams.map(t => t.id));
    
    for (const order of team_orders) {
      if (!order.teamId || !Number.isInteger(order.display_order) || order.display_order < 0) {
        return NextResponse.json(
          { error: "Cada orden debe tener teamId (número) y display_order (entero >= 0)" },
          { status: 400 }
        );
      }
      if (!existingTeamIds.has(order.teamId)) {
        return NextResponse.json(
          { error: `El equipo con ID ${order.teamId} no pertenece a este torneo` },
          { status: 400 }
        );
      }
    }

    // Actualizar el orden de todos los equipos
    await Promise.all(
      team_orders.map(({ teamId, display_order }) =>
        repos.tournamentTeams.update(teamId, { display_order })
      )
    );

    // Fetch updated teams
    const updatedTeams = await repos.tournamentTeams.findByTournamentId(tournamentId);
    return NextResponse.json(updatedTeams);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PATCH /tournaments/:id/teams error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}