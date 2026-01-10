export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string; teamId: string } };

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tournamentId = Number(params.id);
    const teamId = Number(params.teamId);
    
    if (Number.isNaN(tournamentId) || Number.isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { restricted_schedules, schedule_notes } = body; // Array de { date, start_time, end_time } y notas opcionales

    // Validar que el equipo existe y pertenece al usuario y torneo
    const { data: team, error: teamError } = await supabase
      .from("tournament_teams")
      .select("id, tournament_id, user_uid")
      .eq("id", teamId)
      .eq("tournament_id", tournamentId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Verificar si ya hay grupos generados
    const { data: existingGroups, error: groupsError } = await supabase
      .from("tournament_groups")
      .select("id")
      .eq("tournament_id", tournamentId)
      .limit(1);

    if (groupsError) {
      console.error("Error checking groups:", groupsError);
      return NextResponse.json(
        { error: "Failed to check tournament status" },
        { status: 500 }
      );
    }

    if (existingGroups && existingGroups.length > 0) {
      return NextResponse.json(
        { error: "No se pueden editar restricciones después de generar los grupos" },
        { status: 400 }
      );
    }

    // Validar formato de restricted_schedules
    if (!Array.isArray(restricted_schedules)) {
      return NextResponse.json(
        { error: "restricted_schedules debe ser un array" },
        { status: 400 }
      );
    }

    // Validar cada restricción
    for (const schedule of restricted_schedules) {
      if (!schedule.date || !schedule.start_time || !schedule.end_time) {
        return NextResponse.json(
          { error: "Cada restricción debe tener date, start_time y end_time" },
          { status: 400 }
        );
      }
      
      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(schedule.date)) {
        return NextResponse.json(
          { error: "El formato de fecha debe ser YYYY-MM-DD" },
          { status: 400 }
        );
      }
    }

    // Eliminar restricciones existentes
    const { error: deleteError } = await supabase
      .from("tournament_team_schedule_restrictions")
      .delete()
      .eq("tournament_team_id", teamId);

    if (deleteError) {
      console.error("Error deleting existing restrictions:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete existing restrictions" },
        { status: 500 }
      );
    }

    // Insertar nuevas restricciones
    if (restricted_schedules.length > 0) {
      const restrictionsToInsert = restricted_schedules.map((schedule: { date: string; start_time: string; end_time: string }) => ({
        tournament_team_id: teamId,
        date: schedule.date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        user_uid: user.id,
      }));

      const { error: insertError } = await supabase
        .from("tournament_team_schedule_restrictions")
        .insert(restrictionsToInsert);

      if (insertError) {
        console.error("Error inserting restrictions:", insertError);
        return NextResponse.json(
          { error: "Failed to insert restrictions" },
          { status: 500 }
        );
      }
    }

    // Actualizar schedule_notes si se proporcionó
    if (schedule_notes !== undefined) {
      const repos = await createRepositories();
      await repos.tournamentTeams.update(teamId, { schedule_notes: schedule_notes || null });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /tournaments/:id/teams/:teamId/restrictions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
