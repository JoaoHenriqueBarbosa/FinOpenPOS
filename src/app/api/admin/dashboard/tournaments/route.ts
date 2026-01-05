export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

export async function GET() {
  try {
    const repos = await createRepositories();

    // Obtener todos los torneos
    const tournaments = await repos.tournaments.findAll();

    // Filtrar solo los activos (no finished ni cancelled)
    const activeTournaments = tournaments.filter(
      (t) => t.status !== "finished" && t.status !== "cancelled"
    );

    // Para cada torneo activo, obtener información adicional
    const tournamentsData = await Promise.all(
      activeTournaments.map(async (tournament) => {
        // Obtener cantidad de equipos
        const teams = await repos.tournamentTeams.findByTournamentId(tournament.id);
        const teamsCount = teams.length;

        // Mapear status a fase legible
        const statusToPhase: Record<string, string> = {
          draft: "Inscripción",
          schedule_review: "Revisión de horarios",
          in_progress: "En progreso",
          finished: "Finalizado",
          cancelled: "Cancelado",
        };

        return {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          phase: statusToPhase[tournament.status] || tournament.status,
          teamsCount,
          startDate: tournament.start_date,
          endDate: tournament.end_date,
        };
      })
    );

    return NextResponse.json({
      activeTournaments: tournamentsData,
      count: tournamentsData.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /admin/dashboard/tournaments error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

