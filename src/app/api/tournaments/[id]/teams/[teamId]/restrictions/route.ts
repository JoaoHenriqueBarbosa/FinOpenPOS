import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { restricted_schedule_ids } = body;

    // Validar que el equipo existe y pertenece al usuario y torneo
    const { data: team, error: teamError } = await supabase
      .from("tournament_teams")
      .select("id, tournament_id, user_uid")
      .eq("id", teamId)
      .eq("tournament_id", tournamentId)
      .eq("user_uid", user.id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Verificar si ya hay grupos generados
    const { data: existingGroups, error: groupsError } = await supabase
      .from("tournament_groups")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_uid", user.id)
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

    // Validar formato de restricted_schedule_ids
    if (!Array.isArray(restricted_schedule_ids)) {
      return NextResponse.json(
        { error: "restricted_schedule_ids debe ser un array" },
        { status: 400 }
      );
    }

    // Validar que todos los schedule_ids existen y pertenecen al torneo
    if (restricted_schedule_ids.length > 0) {
      const { data: schedules, error: schedulesError } = await supabase
        .from("tournament_available_schedules")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("user_uid", user.id)
        .in("id", restricted_schedule_ids);

      if (schedulesError) {
        console.error("Error validating schedules:", schedulesError);
        return NextResponse.json(
          { error: "Failed to validate schedule IDs" },
          { status: 500 }
        );
      }

      if (schedules.length !== restricted_schedule_ids.length) {
        return NextResponse.json(
          { error: "Algunos horarios no existen o no pertenecen a este torneo" },
          { status: 400 }
        );
      }
    }

    // Eliminar restricciones existentes
    const { error: deleteError } = await supabase
      .from("tournament_team_schedule_restrictions")
      .delete()
      .eq("tournament_team_id", teamId)
      .eq("user_uid", user.id);

    if (deleteError) {
      console.error("Error deleting existing restrictions:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete existing restrictions" },
        { status: 500 }
      );
    }

    // Insertar nuevas restricciones
    if (restricted_schedule_ids.length > 0) {
      const restrictionsToInsert = restricted_schedule_ids.map((scheduleId: number) => ({
        tournament_team_id: teamId,
        tournament_available_schedule_id: scheduleId,
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /tournaments/:id/teams/:teamId/restrictions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
