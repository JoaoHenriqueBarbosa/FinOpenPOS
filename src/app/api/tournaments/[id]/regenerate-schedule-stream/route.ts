import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scheduleGroupMatches } from "@/lib/tournament-scheduler";
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
    const scheduleConfig: ScheduleConfig | undefined = body.days
      ? {
          days: body.days,
          matchDuration: body.matchDuration || 60,
          courtIds: body.courtIds || [],
        }
      : undefined;

    if (!scheduleConfig || !scheduleConfig.days.length || !scheduleConfig.courtIds.length) {
      return new Response(
        JSON.stringify({ error: "Configuración de horarios inválida" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Crear un stream de Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Buffer para acumular mensajes y enviarlos en lotes
        let logBuffer: Uint8Array[] = [];
        let flushScheduled = false;
        const MAX_BUFFER_SIZE = 10; // Vaciar el buffer después de 10 mensajes
        
        // Vaciar el buffer periódicamente cada 100ms para asegurar que los mensajes se envíen en tiempo real
        const flushInterval = setInterval(() => {
          if (logBuffer.length > 0) {
            flushLogs();
          }
        }, 100);
        
        const flushLogs = () => {
          if (logBuffer.length === 0) {
            flushScheduled = false;
            return;
          }
          try {
            for (const encoded of logBuffer) {
              controller.enqueue(encoded);
            }
            logBuffer = [];
            flushScheduled = false;
          } catch (error) {
            console.error("Error flushing logs:", error);
            logBuffer = [];
            flushScheduled = false;
          }
        };
        
        const sendLog = (message: string) => {
          console.log(`[Regenerate Schedule] ${message}`);
          try {
            const data = JSON.stringify({ type: "log", message });
            const encoded = encoder.encode(`data: ${data}\n\n`);
            logBuffer.push(encoded);
            
            // Si el buffer está lleno, vaciarlo inmediatamente
            if (logBuffer.length >= MAX_BUFFER_SIZE) {
              flushLogs();
            } else if (!flushScheduled) {
              // Programar el flush si no está ya programado
              flushScheduled = true;
              // Usar setImmediate para permitir que el stream procese los mensajes
              setImmediate(flushLogs);
            }
          } catch (error) {
            console.error("Error sending log:", error);
          }
        };

        const sendProgress = (progress: number, status: string) => {
          console.log(`[Regenerate Schedule] Progress: ${progress}% - ${status}`);
          const data = JSON.stringify({ type: "progress", progress, status });
          const encoded = encoder.encode(`data: ${data}\n\n`);
          logBuffer.push(encoded);
          if (!flushScheduled) {
            flushScheduled = true;
            setImmediate(flushLogs);
          }
        };

        const sendError = (error: string) => {
          console.error(`[Regenerate Schedule] Error: ${error}`);
          // Limpiar el intervalo
          clearInterval(flushInterval);
          // Flush logs pendientes antes de enviar el error
          flushLogs();
          const data = JSON.stringify({ type: "error", error });
          try {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.close();
          } catch (err) {
            console.error("Error enqueueing error:", err);
          }
        };

        const sendSuccess = (result: any) => {
          console.log(`[Regenerate Schedule] Success:`, result);
          // Limpiar el intervalo
          clearInterval(flushInterval);
          // Flush logs pendientes antes de enviar el éxito
          flushLogs();
          const data = JSON.stringify({ type: "success", result });
          try {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.close();
          } catch (error) {
            console.error("Error enqueueing success:", error);
          }
        };

        try {
          sendLog("Iniciando proceso de regeneración de horarios...");
          sendProgress(10, "Verificando torneo...");

          // 1) Verificar que el torneo existe y pertenece al usuario
          const { data: t, error: terr } = await supabase
            .from("tournaments")
            .select("id, status, user_uid, match_duration")
            .eq("id", tournamentId)
            .single();

          if (terr || !t || t.user_uid !== user.id) {
            sendError("Torneo no encontrado");
            return;
          }

          sendProgress(20, "Obteniendo partidos de fase de grupos...");

          // 2) Obtener todos los partidos de fase de grupos sin resultados
          // Un partido sin resultados es aquel donde set1_team1_games es null
          const { data: matches, error: matchesError } = await supabase
            .from("tournament_matches")
            .select(
              "id, tournament_group_id, team1_id, team2_id, match_order, status, set1_team1_games, court_id"
            )
            .eq("tournament_id", tournamentId)
            .eq("phase", "group")
            .eq("user_uid", user.id)
            .is("set1_team1_games", null); // Solo partidos sin resultados

          if (matchesError) {
            sendError("Error al obtener partidos: " + matchesError.message);
            return;
          }

          if (!matches || matches.length === 0) {
            // Verificar si hay partidos con resultados para dar un mensaje más específico
            const { data: allMatches } = await supabase
              .from("tournament_matches")
              .select("id")
              .eq("tournament_id", tournamentId)
              .eq("phase", "group")
              .eq("user_uid", user.id);
            
            if (allMatches && allMatches.length > 0) {
              sendError("Todos los partidos de fase de grupos ya tienen resultados cargados. Solo se pueden regenerar horarios de partidos sin resultados.");
            } else {
              sendError("No se encontraron partidos de fase de grupos para regenerar horarios");
            }
            return;
          }

          sendLog(`Encontrados ${matches.length} partidos sin resultados`);
          sendProgress(40, "Preparando datos para el scheduler...");

          // 3) Construir el payload para el scheduler
          sendLog("Construyendo payload de partidos...");
          const matchesPayload = matches.map((match) => ({
            tournament_id: tournamentId,
            user_uid: user.id,
            phase: "group" as const,
            tournament_group_id: match.tournament_group_id,
            team1_id: match.team1_id,
            team2_id: match.team2_id,
            match_date: null,
            start_time: null,
            end_time: null,
            match_order: match.match_order ?? undefined,
            court_id: null,
          }));
          sendLog(`Payload construido: ${matchesPayload.length} partidos`);

          // 4) Obtener restricciones de equipos
          sendLog("Obteniendo restricciones de equipos...");
          const teamIds = Array.from(
            new Set(
              matches
                .map((m) => [m.team1_id, m.team2_id])
                .flat()
                .filter((id): id is number => id !== null)
            )
          );
          sendLog(`Equipos únicos encontrados: ${teamIds.length}`);

          const { data: restrictions, error: restrictionsError } = await supabase
            .from("tournament_team_schedule_restrictions")
            .select("tournament_team_id, tournament_available_schedule_id")
            .in("tournament_team_id", teamIds.length > 0 ? teamIds : [-1]); // Usar [-1] si no hay equipos para evitar error SQL

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
            sendLog(`Restricciones cargadas para ${teamRestrictions.size} equipos`);
          } else if (restrictionsError) {
            sendLog(`⚠️ Error al obtener restricciones: ${restrictionsError.message}`);
          } else {
            sendLog("No hay restricciones de equipos configuradas");
          }

          // 5) Obtener horarios disponibles
          sendLog("Obteniendo horarios disponibles del torneo...");
          let availableSchedules: any[] | null = null;
          try {
            sendLog("Ejecutando consulta a Supabase...");
            const { data, error: schedulesError } = await supabase
              .from("tournament_available_schedules")
              .select("*")
              .eq("tournament_id", tournamentId)
              .eq("user_uid", user.id)
              .order("date", { ascending: true })
              .order("start_time", { ascending: true });

            sendLog("Consulta a Supabase completada");
            
            if (schedulesError) {
              sendLog(`⚠️ Error al obtener horarios disponibles: ${schedulesError.message}`);
            } else {
              availableSchedules = data;
              sendLog(`Horarios disponibles: ${availableSchedules?.length || 0} slots`);
            }
          } catch (error: any) {
            sendLog(`❌ Excepción al obtener horarios: ${error.message || error.toString()}`);
            sendError(`Error al obtener horarios disponibles: ${error.message || error.toString()}`);
            console.error("Error getting available schedules:", error);
            return;
          }
          
          sendLog("Continuando después de obtener horarios disponibles...");

          const matchDurationMinutes = scheduleConfig.matchDuration || 60;
          sendLog(`Duración de partidos: ${matchDurationMinutes} minutos`);
          sendLog(`Canchas seleccionadas: ${scheduleConfig.courtIds.length}`);
          sendLog(`Días configurados: ${scheduleConfig.days.length}`);

          // Validar configuración antes de llamar al scheduler
          sendLog("Validando configuración...");
          if (!scheduleConfig.days || scheduleConfig.days.length === 0) {
            sendError("No hay días configurados para generar horarios");
            return;
          }
          if (!scheduleConfig.courtIds || scheduleConfig.courtIds.length === 0) {
            sendError("No hay canchas seleccionadas para generar horarios");
            return;
          }
          sendLog("✅ Configuración válida");

          sendProgress(60, "Generando horarios con algoritmo inteligente...");

          // 6) Llamar al scheduler con callback de logging
          sendLog("Iniciando algoritmo de asignación de horarios...");
          sendLog(`Llamando a scheduleGroupMatches con ${matchesPayload.length} partidos...`);
          
          try {
            sendLog("🔍 Verificando callback antes de llamar al scheduler...");
            if (!sendLog) {
              sendError("Error: callback de logging no está definido");
              return;
            }
            sendLog("✅ Callback verificado, llamando al scheduler...");
            
            const schedulerResult = await scheduleGroupMatches(
              matchesPayload,
              scheduleConfig.days,
              matchDurationMinutes,
              scheduleConfig.courtIds,
              availableSchedules || undefined,
              teamRestrictions,
              sendLog // Callback para logs
            );

            sendLog(`Algoritmo completado. Resultado: ${schedulerResult.success ? "éxito" : "fallo"}`);

            if (!schedulerResult.success) {
              sendError(schedulerResult.error || "No se pudieron asignar horarios para todos los partidos");
              return;
            }

            sendLog(`✅ Horarios asignados exitosamente para ${matchesPayload.length} partidos`);
          } catch (schedulerError: any) {
            sendError(`Error en el scheduler: ${schedulerError.message || schedulerError.toString()}`);
            console.error("Scheduler error:", schedulerError);
            return;
          }
          sendProgress(80, "Actualizando partidos en la base de datos...");

          // 7) Actualizar los partidos en la base de datos
          const updates = matches.map((match) => {
            const payload = schedulerResult.assignments.find(
              (a) => {
                const p = matchesPayload[a.matchIdx];
                return (
                  p.tournament_group_id === match.tournament_group_id &&
                  (p.match_order ?? null) === (match.match_order ?? null) &&
                  (match.team1_id === null || match.team2_id === null
                    ? true
                    : p.team1_id === match.team1_id && p.team2_id === match.team2_id)
                );
              }
            );

            if (!payload) return null;

            return {
              id: match.id,
              match_date: payload.date,
              start_time: payload.startTime,
              end_time: payload.endTime,
              court_id: payload.courtId,
            };
          }).filter((u): u is { id: number; match_date: string; start_time: string; end_time: string; court_id: number } => 
            u !== null && u.match_date !== null && u.start_time !== null && u.end_time !== null && u.court_id !== undefined
          );

          // Actualizar todos los partidos
          let updatedCount = 0;
          for (const update of updates) {
            const { error: updateError } = await supabase
              .from("tournament_matches")
              .update({
                match_date: update.match_date,
                start_time: update.start_time,
                end_time: update.end_time,
                court_id: update.court_id,
              })
              .eq("id", update.id)
              .eq("user_uid", user.id);

            if (updateError) {
              console.error(`Error updating match ${update.id}:`, updateError);
            } else {
              updatedCount++;
            }
          }

          sendLog(`Actualizados ${updatedCount} partidos en la base de datos`);
          sendProgress(100, "¡Proceso completado!");
          sendSuccess({ ok: true, updatedCount });
        } catch (error: any) {
          console.error("Error in regenerate-schedule-stream:", error);
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
    console.error("Error in regenerate-schedule-stream:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

