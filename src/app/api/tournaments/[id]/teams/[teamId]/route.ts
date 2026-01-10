export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string; teamId: string } };

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const tournamentId = Number(params.id);
    const teamId = Number(params.teamId);
    
    if (Number.isNaN(tournamentId) || Number.isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { player1_id, player2_id, display_name, seed_number, notes, display_order, is_substitute, schedule_notes } = body;

    // Check tournament exists and is in draft
    const tournament = await repos.tournaments.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot edit teams once registration is closed" },
        { status: 400 }
      );
    }

    // Check if team exists
    const existingTeams = await repos.tournamentTeams.findByTournamentId(tournamentId);
    const existingTeam = existingTeams.find(t => t.id === teamId);
    if (!existingTeam) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Prepare updates object
    const updates: any = {};
    
    if (player1_id !== undefined || player2_id !== undefined) {
      // Validate players are not already in another team (excluding current team)
      if (player1_id !== undefined && player1_id !== existingTeam.player1_id) {
        const player1InTeam = await repos.tournamentTeams.isPlayerInTournament(tournamentId, player1_id, teamId);
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
        updates.player1_id = player1_id;
      }

      if (player2_id !== undefined && player2_id !== existingTeam.player2_id) {
        const player2InTeam = await repos.tournamentTeams.isPlayerInTournament(tournamentId, player2_id, teamId);
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
        updates.player2_id = player2_id;
      }

      // Validate players are not the same
      const finalPlayer1Id = player1_id !== undefined ? player1_id : existingTeam.player1_id;
      const finalPlayer2Id = player2_id !== undefined ? player2_id : existingTeam.player2_id;
      if (finalPlayer1Id === finalPlayer2Id) {
        return NextResponse.json(
          { error: "Los jugadores deben ser diferentes" },
          { status: 400 }
        );
      }
    }

    if (display_name !== undefined) updates.display_name = display_name;
    if (seed_number !== undefined) updates.seed_number = seed_number;
    if (notes !== undefined) updates.notes = notes;
    if (display_order !== undefined) updates.display_order = display_order;
    if (is_substitute !== undefined) updates.is_substitute = is_substitute;
    if (schedule_notes !== undefined) updates.schedule_notes = schedule_notes;

    // Update team
    const updatedTeam = await repos.tournamentTeams.update(teamId, updates);

    // Fetch team with player details
    const teams = await repos.tournamentTeams.findByTournamentId(tournamentId);
    const updatedTeamWithDetails = teams.find((t) => t.id === updatedTeam.id);
    
    return NextResponse.json(updatedTeamWithDetails ?? updatedTeam);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PATCH /tournaments/:id/teams/:teamId error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
