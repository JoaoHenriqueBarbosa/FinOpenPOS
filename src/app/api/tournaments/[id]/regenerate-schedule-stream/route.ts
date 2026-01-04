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
          sendProgress(30, "Limpiando horarios previos...");

          // 3) Limpiar horarios de TODOS los partidos de fase de grupos antes de regenerar
          sendLog("Limpiando horarios previos de todos los partidos de fase de grupos...");
          const { error: clearError } = await supabase
            .from("tournament_matches")
            .update({
              match_date: null,
              start_time: null,
              end_time: null,
              court_id: null,
            })
            .eq("tournament_id", tournamentId)
            .eq("phase", "group")
            .eq("user_uid", user.id);
            // Nota: Limpiamos TODOS los horarios, no solo los de partidos sin resultados
            // para empezar desde cero al regenerar

          if (clearError) {
            sendError(`Error al limpiar horarios previos: ${clearError.message}`);
            return;
          }

          sendLog("✅ Horarios previos limpiados correctamente");

          sendLog(`✅ Horarios previos limpiados para ${matches.length} partidos`);
          sendProgress(40, "Preparando datos para el scheduler...");

          // 4) Construir el payload para el scheduler
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

          // 5) Obtener restricciones de equipos
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
            .select("tournament_team_id, date, start_time, end_time")
            .in("tournament_team_id", teamIds.length > 0 ? teamIds : [-1]); // Usar [-1] si no hay equipos para evitar error SQL

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
            sendLog(`Restricciones cargadas para ${teamRestrictions.size} equipos`);
          } else if (restrictionsError) {
            sendLog(`⚠️ Error al obtener restricciones: ${restrictionsError.message}`);
          } else {
            sendLog("No hay restricciones de equipos configuradas");
          }

          // 6) Horarios disponibles: ahora se generan en memoria desde la configuración recibida
          sendLog("Horarios disponibles: se generan en memoria a partir de la configuración de días/canchas");
          const availableSchedules = undefined;

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

          // 7) Llamar al scheduler con callback de logging
          sendLog("Iniciando algoritmo de asignación de horarios...");
          sendLog(`Llamando a scheduleGroupMatches con ${matchesPayload.length} partidos...`);
          
          let schedulerResult;
          try {
            sendLog("🔍 Verificando callback antes de llamar al scheduler...");
            if (!sendLog) {
              sendError("Error: callback de logging no está definido");
              return;
            }
            sendLog("✅ Callback verificado, llamando al scheduler...");
            
            schedulerResult = await scheduleGroupMatches(
              matchesPayload,
              scheduleConfig.days,
              matchDurationMinutes,
              scheduleConfig.courtIds,
              availableSchedules || undefined,
              teamRestrictions,
              sendLog // Callback para logs
            );

            sendLog(`Algoritmo completado. Resultado: ${schedulerResult.success ? "éxito completo" : "parcial"}`);
            sendLog(`Matches asignados: ${schedulerResult.assignments.length}/${matchesPayload.length}`);

            if (schedulerResult.assignments.length === 0) {
              sendError(schedulerResult.error || "No se pudieron asignar horarios para ningún partido");
              return;
            }

            if (!schedulerResult.success) {
              sendLog(`⚠️ Solución parcial: ${schedulerResult.assignments.length}/${matchesPayload.length} partidos asignados`);
              sendLog(`⚠️ ${schedulerResult.error || "Algunos partidos no pudieron ser asignados"}`);
            } else {
              sendLog(`✅ Horarios asignados exitosamente para todos los ${matchesPayload.length} partidos`);
            }
          } catch (schedulerError: any) {
            sendError(`Error en el scheduler: ${schedulerError.message || schedulerError.toString()}`);
            console.error("Scheduler error:", schedulerError);
            return;
          }

          // Verificar que schedulerResult está definido y tiene asignaciones
          if (!schedulerResult || schedulerResult.assignments.length === 0) {
            sendError("Error: No se pudo obtener resultado del scheduler o no hay asignaciones");
            return;
          }

          sendProgress(80, "Actualizando partidos en la base de datos...");

          // 8) Actualizar los partidos en la base de datos
          sendLog(`Total de assignments del scheduler: ${schedulerResult.assignments.length}`);
          sendLog(`Total de matches en la base de datos: ${matches.length}`);
          sendLog(`Total de matchesPayload: ${matchesPayload.length}`);

          // Crear un mapa de assignments por matchIdx para acceso rápido
          const assignmentsByMatchIdx = new Map<number, typeof schedulerResult.assignments[0]>();
          for (const assignment of schedulerResult.assignments) {
            assignmentsByMatchIdx.set(assignment.matchIdx, assignment);
          }

          sendLog(`📊 Assignments disponibles: ${schedulerResult.assignments.length}`);
          sendLog(`📊 Match indices con assignment: ${Array.from(assignmentsByMatchIdx.keys()).sort((a, b) => a - b).join(", ")}`);
          
          // Mostrar detalles de los assignments
          for (const [matchIdx, assignment] of Array.from(assignmentsByMatchIdx.entries())) {
            sendLog(`  Assignment matchIdx ${matchIdx}: ${assignment.date} ${assignment.startTime}-${assignment.endTime} (Cancha ${assignment.courtId})`);
          }

          const updates = matches.map((match, matchIdx) => {
            // Buscar el assignment correspondiente usando el índice directamente
            const assignment = assignmentsByMatchIdx.get(matchIdx);

            if (!assignment) {
              sendLog(`⚠️ No se encontró assignment para match ${match.id} (índice ${matchIdx}, grupo ${match.tournament_group_id})`);
              
              // Intentar matching alternativo por características del match
              // Buscar en todos los assignments disponibles
              for (const [assignedMatchIdx, fallbackAssignment] of Array.from(assignmentsByMatchIdx.entries())) {
                const p = matchesPayload[assignedMatchIdx];
                
                // Verificar si este assignment corresponde a este match
                const groupMatch = p.tournament_group_id === match.tournament_group_id;
                const orderMatch = (p.match_order ?? null) === (match.match_order ?? null);
                const teamsMatch = match.team1_id === null || match.team2_id === null
                  ? true // Si el match original tiene equipos null, cualquier payload con mismo grupo y orden sirve
                  : (p.team1_id === match.team1_id && p.team2_id === match.team2_id) ||
                    (p.team1_id === match.team2_id && p.team2_id === match.team1_id); // También verificar orden inverso
                
                if (groupMatch && orderMatch && teamsMatch) {
                  sendLog(`✅ Encontrado assignment alternativo para match ${match.id} (usando assignment del matchIdx ${assignedMatchIdx})`);
                  return {
                    id: match.id,
                    match_date: fallbackAssignment.date,
                    start_time: fallbackAssignment.startTime,
                    end_time: fallbackAssignment.endTime,
                    court_id: fallbackAssignment.courtId,
                  };
                }
              }
              
              sendLog(`❌ No se encontró assignment alternativo para match ${match.id}`);
              return null;
            }

            // Verificar que el assignment tenga todos los valores necesarios
            if (!assignment.date || !assignment.startTime || !assignment.endTime || assignment.courtId === undefined) {
              sendLog(`⚠️ Assignment para match ${match.id} tiene valores incompletos: date=${assignment.date}, startTime=${assignment.startTime}, endTime=${assignment.endTime}, courtId=${assignment.courtId}`);
              return null;
            }

            sendLog(`✅ Assignment encontrado para match ${match.id} (índice ${matchIdx}): ${assignment.date} ${assignment.startTime} (Cancha ${assignment.courtId})`);

            return {
              id: match.id,
              match_date: assignment.date,
              start_time: assignment.startTime,
              end_time: assignment.endTime,
              court_id: assignment.courtId,
            };
          }).filter((u): u is { id: number; match_date: string; start_time: string; end_time: string; court_id: number } => {
            if (u === null) return false;
            const valid = u.match_date !== null && u.match_date !== undefined &&
                         u.start_time !== null && u.start_time !== undefined &&
                         u.end_time !== null && u.end_time !== undefined &&
                         u.court_id !== null && u.court_id !== undefined;
            if (!valid) {
              sendLog(`⚠️ Update filtrado para match ${u.id}: valores inválidos`);
            }
            return valid;
          });

          sendLog(`Matches con assignment encontrado: ${updates.length} de ${matches.length}`);
          if (updates.length < matches.length) {
            const missing = matches.length - updates.length;
            sendLog(`⚠️ ADVERTENCIA: ${missing} partidos no tienen assignment y no se actualizarán`);
          }

          if (updates.length === 0) {
            sendError("No hay matches para actualizar. Verifica que el scheduler haya asignado horarios correctamente.");
            return;
          }

          // Actualizar todos los partidos
          let updatedCount = 0;
          let errorCount = 0;
          
          sendLog(`🔄 Iniciando actualización de ${updates.length} partidos en la base de datos...`);
          
          // Mostrar resumen de lo que se va a actualizar
          for (const update of updates) {
            sendLog(`  📝 Match ${update.id} → ${update.match_date} ${update.start_time}-${update.end_time} (Cancha ${update.court_id})`);
          }
          
          for (const update of updates) {
            // Validar que todos los valores estén presentes antes de actualizar
            if (!update.match_date || !update.start_time || !update.end_time || update.court_id === undefined || update.court_id === null) {
              sendLog(`  ❌ Match ${update.id} tiene valores inválidos: date=${update.match_date}, start=${update.start_time}, end=${update.end_time}, court=${update.court_id}`);
              errorCount++;
              continue;
            }
            
            sendLog(`  🔄 Actualizando match ${update.id}...`);
            
            // Convertir "24:00" a "00:00" del día siguiente si es necesario
            let endTime = update.end_time;
            if (endTime === "24:00") {
              endTime = "00:00";
            }
            
            const updatePayload = {
              match_date: update.match_date,
              start_time: update.start_time,
              end_time: endTime,
              court_id: update.court_id,
            };
            
            sendLog(`  📤 Payload: ${JSON.stringify(updatePayload)}`);
            
            // Hacer el update con count para verificar que realmente se actualizó
            const { error: updateError, count } = await supabase
              .from("tournament_matches")
              .update(updatePayload)
              .eq("id", update.id)
              .eq("user_uid", user.id);
            
            if (updateError) {
              console.error(`Error updating match ${update.id}:`, updateError);
              sendLog(`  ❌ Error actualizando match ${update.id}: ${updateError.message}`);
              errorCount++;
            } else if (count === 0) {
              sendLog(`  ⚠️ Match ${update.id}: Update ejecutado pero 0 filas afectadas (posiblemente no se encontró el match o RLS bloqueó)`);
              errorCount++;
            } else {
              // Si no hay error y count > 0, se guardó correctamente
              sendLog(`  ✅ Match ${update.id} actualizado (${count} fila(s)): ${update.match_date} ${update.start_time} (Cancha ${update.court_id})`);
              updatedCount++;
            }
          }

          sendLog(`✅ Actualización completada: ${updatedCount} partidos actualizados, ${errorCount} errores`);
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

