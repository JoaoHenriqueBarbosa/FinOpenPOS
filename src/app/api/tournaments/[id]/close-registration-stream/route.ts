import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GroupMatchPayload,
  scheduleGroupMatches,
} from "@/lib/tournament-scheduler";
import type { ScheduleConfig } from "@/models/dto/tournament";

type RouteParams = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const tournamentId = Number(params.id);
    if (Number.isNaN(tournamentId)) {
      return new Response(
        JSON.stringify({ error: "Invalid id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Obtener configuración de horarios del body
    const body = await req.json().catch(() => ({}));
    let scheduleConfig: ScheduleConfig | undefined = body.days
      ? {
          days: body.days,
          matchDuration: body.matchDuration || 60,
          courtIds: body.courtIds || [],
        }
      : undefined;
    
    // Si no hay scheduleConfig pero hay horarios disponibles del torneo, usarlos automáticamente
    if (!scheduleConfig) {
      const { data: availableSchedules, error: schedulesError } = await supabase
        .from("tournament_available_schedules")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("user_uid", user.id)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (!schedulesError && availableSchedules && availableSchedules.length > 0) {
        // Agrupar slots consecutivos de la misma fecha en rangos
        const groupedSchedules = new Map<string, { date: string; start_time: string; end_time: string }>();
        
        availableSchedules.forEach((schedule: any) => {
          const dateKey = schedule.date;
          if (!groupedSchedules.has(dateKey)) {
            groupedSchedules.set(dateKey, {
              date: schedule.date,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
            });
          } else {
            const existing = groupedSchedules.get(dateKey)!;
            // Extender el rango si el slot es consecutivo
            if (schedule.end_time > existing.end_time) {
              existing.end_time = schedule.end_time;
            }
          }
        });

        // Obtener canchas activas
        const { data: courts, error: courtsError } = await supabase
          .from("courts")
          .select("id")
          .eq("active", true)
          .eq("user_uid", user.id);

        if (!courtsError && courts && courts.length > 0) {
          scheduleConfig = {
            days: Array.from(groupedSchedules.values()).map(s => ({
              date: s.date,
              startTime: s.start_time,
              endTime: s.end_time,
            })),
            matchDuration: 60, // Default
            courtIds: courts.map(c => c.id),
          };
        }
      }
    }

    if (!scheduleConfig || !scheduleConfig.days.length || !scheduleConfig.courtIds.length) {
      return new Response(
        JSON.stringify({ error: "Configuración de horarios o canchas inválida" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Crear un stream de Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendLog = (message: string) => {
          const data = JSON.stringify({ type: "log", message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        const sendProgress = (progress: number, status: string) => {
          const data = JSON.stringify({ type: "progress", progress, status });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        const sendError = (error: string) => {
          const data = JSON.stringify({ type: "error", error });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        };

        const sendSuccess = (result: any) => {
          const data = JSON.stringify({ type: "success", result });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        };

        try {
          sendLog("Iniciando proceso de cierre de inscripción...");
          sendProgress(10, "Obteniendo equipos del torneo...");

          // Obtener equipos del torneo
          const { data: teams, error: teamsError } = await supabase
            .from("tournament_teams")
            .select("id")
            .eq("tournament_id", tournamentId)
            .eq("user_uid", user.id);

          if (teamsError || !teams || teams.length === 0) {
            sendError("No hay equipos en el torneo");
            return;
          }

          const teamIds = teams.map((t) => t.id);
          sendLog(`Encontrados ${teamIds.length} equipos`);
          sendProgress(20, "Creando grupos...");

          // Crear grupos (lógica similar a close-registration)
          const groupSizes: number[] = [];
          let remaining = teamIds.length;
          while (remaining > 0) {
            if (remaining >= 4) {
              groupSizes.push(4);
              remaining -= 4;
            } else if (remaining >= 3) {
              groupSizes.push(3);
              remaining -= 3;
            } else {
              groupSizes.push(remaining);
              remaining = 0;
            }
          }

          const groupsPayload = groupSizes.map((size, i) => ({
            tournament_id: tournamentId,
            user_uid: user.id,
            group_order: i + 1,
          }));

          const { data: createdGroups, error: groupError } = await supabase
            .from("tournament_groups")
            .insert(groupsPayload)
            .select("id, group_order")
            .order("group_order", { ascending: true });

          if (groupError || !createdGroups) {
            sendError("Error al crear grupos");
            return;
          }

          sendLog(`Creados ${createdGroups.length} grupos`);
          sendProgress(40, "Asignando equipos a grupos...");

          // Asignar equipos a grupos y crear matches
          let index = 0;
          const groupTeamsPayload: {
            tournament_group_id: number;
            team_id: number;
            user_uid: string;
          }[] = [];
          const matchesPayload: GroupMatchPayload[] = [];

          createdGroups.forEach((g, idx) => {
            const size = groupSizes[idx] ?? 3;
            const idsForGroup = teamIds.slice(index, index + size);
            index += size;

            idsForGroup.forEach((teamId) => {
              groupTeamsPayload.push({
                tournament_group_id: g.id,
                team_id: teamId,
                user_uid: user.id,
              });
            });

            // Generar partidos según el tamaño del grupo
            if (size === 3) {
              for (let i = 0; i < idsForGroup.length; i++) {
                for (let j = i + 1; j < idsForGroup.length; j++) {
                  matchesPayload.push({
                    tournament_id: tournamentId,
                    user_uid: user.id,
                    phase: "group",
                    tournament_group_id: g.id,
                    team1_id: idsForGroup[i],
                    team2_id: idsForGroup[j],
                    match_date: null,
                    start_time: null,
                    end_time: null,
                    court_id: null,
                  });
                }
              }
            } else if (size === 4) {
              matchesPayload.push(
                {
                  tournament_id: tournamentId,
                  user_uid: user.id,
                  phase: "group",
                  tournament_group_id: g.id,
                  team1_id: idsForGroup[0],
                  team2_id: idsForGroup[3],
                  match_date: null,
                  start_time: null,
                  end_time: null,
                  match_order: 1,
                  court_id: null,
                },
                {
                  tournament_id: tournamentId,
                  user_uid: user.id,
                  phase: "group",
                  tournament_group_id: g.id,
                  team1_id: idsForGroup[1],
                  team2_id: idsForGroup[2],
                  match_date: null,
                  start_time: null,
                  end_time: null,
                  match_order: 2,
                  court_id: null,
                },
                {
                  tournament_id: tournamentId,
                  user_uid: user.id,
                  phase: "group",
                  tournament_group_id: g.id,
                  team1_id: null,
                  team2_id: null,
                  match_date: null,
                  start_time: null,
                  end_time: null,
                  match_order: 3,
                  court_id: null,
                },
                {
                  tournament_id: tournamentId,
                  user_uid: user.id,
                  phase: "group",
                  tournament_group_id: g.id,
                  team1_id: null,
                  team2_id: null,
                  match_date: null,
                  start_time: null,
                  end_time: null,
                  match_order: 4,
                  court_id: null,
                }
              );
            }
          });

          const { error: gtError } = await supabase
            .from("tournament_group_teams")
            .insert(groupTeamsPayload);

          if (gtError) {
            sendError("Error al asignar equipos a grupos");
            return;
          }

          sendLog(`Creados ${matchesPayload.length} partidos`);
          sendProgress(60, "Generando horarios...");

          // Obtener restricciones de equipos
          const { data: restrictions, error: restrictionsError } = await supabase
            .from("tournament_team_schedule_restrictions")
            .select("tournament_team_id, tournament_available_schedule_id")
            .in("tournament_team_id", teamIds);

          const teamRestrictions = new Map<number, number[]>();
          if (!restrictionsError && restrictions) {
            restrictions.forEach((r: any) => {
              const teamId = r.tournament_team_id;
              const scheduleId = r.tournament_available_schedule_id;
              if (!teamRestrictions.has(teamId)) {
                teamRestrictions.set(teamId, []);
              }
              teamRestrictions.get(teamId)!.push(scheduleId);
            });
          }

          // Obtener horarios disponibles
          const { data: availableSchedules, error: schedulesError } = await supabase
            .from("tournament_available_schedules")
            .select("*")
            .eq("tournament_id", tournamentId)
            .eq("user_uid", user.id)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true });

          const matchDurationMinutes = scheduleConfig.matchDuration || 60;

          // Llamar al scheduler con callback de logging
          sendLog("Iniciando algoritmo de asignación de horarios...");
          const schedulerResult = await scheduleGroupMatches(
            matchesPayload,
            scheduleConfig.days,
            matchDurationMinutes,
            scheduleConfig.courtIds,
            availableSchedules || undefined,
            teamRestrictions,
            sendLog // Callback para logs
          );

          if (!schedulerResult.success) {
            sendLog(`⚠️ No se pudieron asignar horarios automáticamente: ${schedulerResult.error}`);
            sendLog("Los partidos se crearán sin horarios asignados");
          } else {
            sendLog(`✅ Horarios asignados exitosamente para ${matchesPayload.length} partidos`);
          }

          sendProgress(80, "Guardando partidos...");

          // Insertar matches
          if (matchesPayload.length > 0) {
            const { error: mError } = await supabase
              .from("tournament_matches")
              .insert(matchesPayload);

            if (mError) {
              sendError("Error al crear partidos");
              return;
            }
          }

          sendProgress(90, "Actualizando estado del torneo...");

          // Actualizar torneo a in_progress
          const { error: upError } = await supabase
            .from("tournaments")
            .update({ status: "in_progress" })
            .eq("id", tournamentId)
            .eq("user_uid", user.id);

          if (upError) {
            sendError("Error al actualizar estado del torneo");
            return;
          }

          sendProgress(100, "¡Proceso completado!");
          sendSuccess({ ok: true });
        } catch (error: any) {
          console.error("Error in close-registration-stream:", error);
          sendError(error instanceof Error ? error.message : "Error interno del servidor");
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error in close-registration-stream:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

