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
          sendProgress(20, "Verificando grupos existentes...");

          // Verificar si ya existen grupos para este torneo
          const { data: existingGroups, error: checkError } = await supabase
            .from("tournament_groups")
            .select("id")
            .eq("tournament_id", tournamentId)
            .eq("user_uid", user.id);

          if (checkError) {
            sendLog(`⚠️ Error al verificar grupos existentes: ${checkError.message}`);
          }

          if (existingGroups && existingGroups.length > 0) {
            sendLog(`⚠️ Ya existen ${existingGroups.length} grupos para este torneo. Eliminándolos...`);
            // Eliminar grupos existentes y sus relaciones
            const { error: deleteError } = await supabase
              .from("tournament_groups")
              .delete()
              .eq("tournament_id", tournamentId)
              .eq("user_uid", user.id);
            
            if (deleteError) {
              sendError(`Error al eliminar grupos existentes: ${deleteError.message}`);
              return;
            }
            sendLog(`✅ Grupos existentes eliminados`);
          }

          sendProgress(25, "Creando grupos...");

          // Crear grupos: maximizar de 3, convertir a 4 según el resto
          const N = teamIds.length;
          let baseGroups = Math.floor(N / 3);
          const remainder = N % 3;

          if (baseGroups === 0) {
            baseGroups = 1;
          }

          const groupSizes: number[] = new Array(baseGroups).fill(3);

          if (remainder === 1 && baseGroups >= 1) {
            groupSizes[0] = 4;
          } else if (remainder === 2) {
            if (baseGroups >= 2) {
              groupSizes[0] = 4;
              groupSizes[1] = 4;
            } else if (baseGroups === 1) {
              groupSizes[0] = 4; // caso raro de N=5
            }
          }

          sendLog(`Creando ${groupSizes.length} grupos con tamaños: ${groupSizes.join(", ")}`);

          const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
          const groupsPayload = groupSizes.map((size, i) => ({
            tournament_id: tournamentId,
            user_uid: user.id,
            name: `Zona ${letters[i] ?? String(i + 1)}`,
            group_order: i + 1,
          }));

          sendLog(`Payload de grupos: ${JSON.stringify(groupsPayload)}`);

          const { data: createdGroups, error: groupError } = await supabase
            .from("tournament_groups")
            .insert(groupsPayload)
            .select("id, group_order")
            .order("group_order", { ascending: true });

          if (groupError || !createdGroups) {
            const errorMessage = groupError?.message || "Error desconocido al crear grupos";
            console.error("Error al crear grupos:", groupError);
            sendLog(`❌ Error detallado: ${errorMessage}`);
            if (groupError?.code) {
              sendLog(`   Código: ${groupError.code}`);
            }
            if (groupError?.details) {
              sendLog(`   Detalles: ${JSON.stringify(groupError.details)}`);
            }
            sendError(`Error al crear grupos: ${errorMessage}`);
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
            .select("tournament_team_id, date, start_time, end_time")
            .in("tournament_team_id", teamIds);

          const teamRestrictions = new Map<number, Array<{ date: string; start_time: string; end_time: string }>>();
          if (!restrictionsError && restrictions) {
            restrictions.forEach((r: any) => {
              const teamId = r.tournament_team_id;
              if (!teamRestrictions.has(teamId)) {
                teamRestrictions.set(teamId, []);
              }
              teamRestrictions.get(teamId)!.push({
                date: r.date,
                start_time: r.start_time,
                end_time: r.end_time,
              });
            });
          }

          const matchDurationMinutes = scheduleConfig.matchDuration || 60;

          // Llamar al scheduler con callback de logging
          sendLog("Iniciando algoritmo de asignación de horarios...");
          const schedulerResult = await scheduleGroupMatches(
            matchesPayload,
            scheduleConfig.days,
            matchDurationMinutes,
            scheduleConfig.courtIds,
            undefined, // availableSchedules ya no se usa (se generan on the fly)
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

          // Actualizar torneo a schedule_review (nueva etapa de revisión de horarios)
          const { error: upError } = await supabase
            .from("tournaments")
            .update({ status: "schedule_review" })
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

