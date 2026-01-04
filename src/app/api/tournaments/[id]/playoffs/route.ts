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

    const playoffs = await repos.tournamentPlayoffs.findByTournamentId(tournamentId);
    return NextResponse.json(playoffs);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /tournaments/:id/playoffs error:", error);
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

    // Eliminar playoffs (esto elimina matches y playoffs)
    await repos.tournamentPlayoffs.deleteByTournamentId(tournamentId);

    return NextResponse.json({ ok: true, message: "Playoffs deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("DELETE /tournaments/:id/playoffs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}