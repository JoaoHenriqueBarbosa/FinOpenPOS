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

    const groupsData = await repos.tournamentGroups.getGroupsData(tournamentId);
    return NextResponse.json(groupsData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /tournaments/:id/groups error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const tournamentId = Number(params.id);
    
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Verificar que el torneo existe
    const tournament = await repos.tournaments.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Validar: no se pueden eliminar grupos si ya hay playoffs generados
    const hasPlayoffs = await repos.tournamentPlayoffs.existsForTournament(tournamentId);
    if (hasPlayoffs) {
      return NextResponse.json(
        { error: "No se pueden eliminar los grupos si ya hay playoffs generados. Eliminá primero los playoffs." },
        { status: 403 }
      );
    }

    // Eliminar grupos (esto elimina standings, matches, group_teams y groups)
    await repos.tournamentGroups.deleteByTournamentId(tournamentId);

    // Cambiar el estado del torneo a "draft"
    try {
      await repos.tournaments.update(tournamentId, { status: "draft" });
    } catch (error) {
      // No fallamos el request completo, solo logueamos el error
      console.error("Error updating tournament status:", error);
    }

    return NextResponse.json({ ok: true, message: "Groups phase deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("DELETE /tournaments/:id/groups error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}