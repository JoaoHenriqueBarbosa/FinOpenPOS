// Helper para asignar fechas y horarios a partidos de fase de grupos
// siguiendo la heurística acordada:
// - Respeto de orden deportivo (match_order en grupos de 4)
// - Descanso mínimo por equipo (no dos turnos seguidos el mismo día)
// - Partidos de un mismo equipo en un día lo más compactos posible

import type { ScheduleDay, ScheduleConfig, AvailableSchedule } from "@/models/dto/tournament";

export type GroupMatchPayload = {
  tournament_id: number;
  user_uid: string;
  phase: "group";
  tournament_group_id: number;
  team1_id: number | null;
  team2_id: number | null;
  match_date: string | null;
  start_time: string | null;
  end_time: string | null;
  match_order?: number;
  court_id?: number | null;
};

export type TimeSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

// Verificar si un slot coincide con un horario disponible
function slotMatchesAvailableSchedule(
  slot: TimeSlot,
  availableSchedule: AvailableSchedule
): boolean {
  // Comparar fechas directamente (formato YYYY-MM-DD)
  if (slot.date !== availableSchedule.date) return false;

  const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
  const slotEndMinutes = timeToMinutesOfDay(slot.endTime);
  const scheduleStartMinutes = timeToMinutesOfDay(availableSchedule.start_time);
  const scheduleEndMinutes = timeToMinutesOfDay(availableSchedule.end_time);

  // El slot debe estar completamente dentro del rango del horario disponible
  return (
    slotStartMinutes >= scheduleStartMinutes &&
    slotEndMinutes <= scheduleEndMinutes
  );
}

// Generar slots de tiempo a partir de días, duración y cantidad de canchas
// Filtra slots según horarios disponibles del torneo
export function generateTimeSlots(
  days: ScheduleDay[],
  matchDuration: number,
  numCourts: number,
  availableSchedules?: AvailableSchedule[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  days.forEach((day) => {
    const [startH, startM] = day.startTime.split(":").map(Number);
    const [endH, endM] = day.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    // Si la hora de fin es 00:00, interpretarla como 24:00 (fin del día)
    const endMinutes = (endH === 0 && endM === 0) ? 24 * 60 : endH * 60 + endM;

    let currentMinutes = startMinutes;
    while (currentMinutes + matchDuration <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60);
      const slotStartM = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + matchDuration;
      
      // Si el slot termina después de medianoche, ajustar a 24:00
      let slotEndH: number;
      let slotEndM: number;
      if (slotEndMinutes >= 24 * 60) {
        slotEndH = 0;
        slotEndM = 0;
      } else {
        slotEndH = Math.floor(slotEndMinutes / 60);
        slotEndM = slotEndMinutes % 60;
      }

      // Crear un identificador único para el slot físico (sin incluir la fecha)
      // Esto permite identificar slots que representan el mismo tiempo físico en diferentes días
      const physicalSlotKey = `${slotStartH.toString().padStart(2, "0")}:${slotStartM.toString().padStart(2, "0")}-${slotEndH.toString().padStart(2, "0")}:${slotEndM.toString().padStart(2, "0")}`;
      
      const slot: TimeSlot = {
        date: day.date,
        startTime: `${String(slotStartH).padStart(2, "0")}:${String(
          slotStartM
        ).padStart(2, "0")}`,
        endTime: `${String(slotEndH).padStart(2, "0")}:${String(
          slotEndM
        ).padStart(2, "0")}`,
        physicalSlotId: physicalSlotKey,
      };

      // Si hay horarios disponibles configurados, filtrar slots que no coincidan
      if (availableSchedules && availableSchedules.length > 0) {
        // Para slots que terminan a las 00:00, verificar tanto el día actual como el siguiente
        let matchesSchedule = false;
        if (slotEndH === 0 && slotEndM === 0) {
          // Slot que termina a medianoche: puede coincidir con horarios del día actual o del siguiente
          const nextDay = new Date(day.date + "T00:00:00");
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayDate = nextDay.toISOString().split("T")[0];
          
          matchesSchedule = availableSchedules.some((schedule) => {
            // Verificar si coincide con el día actual (el horario disponible termina a las 00:00)
            if (schedule.date === day.date && slotMatchesAvailableSchedule(slot, schedule)) {
              return true;
            }
            // Verificar si coincide con el día siguiente (slot que empieza el día anterior y termina a las 00:00)
            if (schedule.date === nextDayDate) {
              const scheduleStartMinutes = timeToMinutesOfDay(schedule.start_time);
              const scheduleEndMinutes = timeToMinutesOfDay(schedule.end_time);
              // Si el horario disponible del día siguiente empieza a las 00:00, acepta slots que terminan a medianoche
              // del día anterior (cualquier hora del día anterior es válida si termina a las 00:00)
              if (scheduleStartMinutes === 0 || scheduleStartMinutes === 24 * 60) {
                return true; // Acepta cualquier slot que termine a medianoche del día anterior
              }
              // Si el horario disponible no empieza a medianoche, el slot debe empezar dentro del rango
              // pero como el slot termina a las 00:00, solo es válido si el horario disponible incluye medianoche
              return scheduleEndMinutes >= 24 * 60; // El horario disponible debe incluir medianoche
            }
            return false;
          });
        } else {
          matchesSchedule = availableSchedules.some((schedule) =>
            slotMatchesAvailableSchedule(slot, schedule)
          );
        }
        
        if (!matchesSchedule) {
          currentMinutes += matchDuration;
          continue;
        }
      }

      // Un slot por cada cancha disponible
      for (let i = 0; i < numCourts; i++) {
        slots.push(slot);
      }

      // Si el slot termina a las 00:00, también crear una versión para el día siguiente
      // Esto permite que el slot pueda ser usado tanto para el día actual como para el siguiente
      // Es similar a cómo un slot de 7-8 y otro de 8-9 comparten la hora 8:00
      // Aquí, un slot que termina a las 00:00 puede ser compartido entre el día actual y el siguiente
      if (slotEndH === 0 && slotEndM === 0) {
        const nextDay = new Date(day.date + "T00:00:00");
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayDate = nextDay.toISOString().split("T")[0];
        
        // Verificar si el día siguiente tiene horarios disponibles que acepten este slot
        let shouldAddNextDaySlot = false;
        if (availableSchedules && availableSchedules.length > 0) {
          shouldAddNextDaySlot = availableSchedules.some((schedule) => {
            if (schedule.date === nextDayDate) {
              const scheduleStartMinutes = timeToMinutesOfDay(schedule.start_time);
              const scheduleEndMinutes = timeToMinutesOfDay(schedule.end_time);
              // Si el horario disponible del día siguiente empieza a las 00:00, acepta slots que terminan a medianoche
              // del día anterior (cualquier hora del día anterior es válida si termina a las 00:00)
              if (scheduleStartMinutes === 0 || scheduleStartMinutes === 24 * 60) {
                return true; // Acepta cualquier slot que termine a medianoche del día anterior
              }
              // Si el horario disponible no empieza a medianoche, el slot debe empezar dentro del rango
              // pero como el slot termina a las 00:00, solo es válido si el horario disponible incluye medianoche
              return scheduleEndMinutes >= 24 * 60; // El horario disponible debe incluir medianoche
            }
            return false;
          });
        } else {
          // Si no hay horarios disponibles configurados, agregar el slot del día siguiente de todas formas
          shouldAddNextDaySlot = true;
        }

        if (shouldAddNextDaySlot) {
          const nextDaySlot: TimeSlot = {
            date: nextDayDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            physicalSlotId: physicalSlotKey, // Mismo identificador físico que el slot del día anterior
          };
          // Un slot por cada cancha disponible para el día siguiente también
          // Estos representan el mismo slot físico que puede ser usado en cualquiera de los dos días
          for (let i = 0; i < numCourts; i++) {
            slots.push(nextDaySlot);
          }
        }
      }

      currentMinutes += matchDuration;
    }
  });

  return slots;
}

function timeToMinutesOfDay(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  // Si la hora es 00:00, interpretarla como 24:00 (fin del día)
  if (hours === 0 && minutes === 0) {
    return 24 * 60; // 1440 minutos
  }
  return hours * 60 + minutes;
}

function calculateEndTime(startTime: string, matchDurationMinutes: number): string {
  const [startH, startM] = startTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = startMinutes + matchDurationMinutes;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

type Assignment = {
  matchIdx: number;
  date: string;
  startTime: string;
  endTime: string;
  slotIndex: number;
  courtId: number;
};

type SchedulerResult =
  | { success: true; assignments: Assignment[] }
  | { success: false; error: string };

// Verificar si un slot viola alguna restricción de un equipo
// Verificar si un slot viola las restricciones de un equipo
// restrictions es un array de IDs de horarios disponibles que el equipo NO puede jugar
function slotViolatesRestriction(
  slot: TimeSlot,
  restrictedScheduleIds: number[] | undefined,
  availableSchedules: AvailableSchedule[]
): boolean {
  if (!restrictedScheduleIds || restrictedScheduleIds.length === 0) return false;
  if (!availableSchedules || availableSchedules.length === 0) return false;

  // Encontrar TODOS los horarios disponibles que coinciden con este slot
  // Un slot puede coincidir con múltiples horarios disponibles (por ejemplo, si hay slots de 1 hora que se agrupan)
  const matchingSchedules = availableSchedules.filter((schedule) =>
    slotMatchesAvailableSchedule(slot, schedule)
  );

  if (matchingSchedules.length === 0) return false;

  // Si CUALQUIERA de los horarios que coinciden está en las restricciones, el slot está prohibido
  // Esto es importante porque un slot puede estar dentro de múltiples horarios disponibles
  return matchingSchedules.some((schedule) => restrictedScheduleIds.includes(schedule.id));
}

// Asigna horarios directamente sobre el arreglo de matches (modificándolo)
export async function scheduleGroupMatches(
  matchesPayload: GroupMatchPayload[],
  days: ScheduleDay[],
  matchDurationMinutes: number,
  courtIds: number[],
  availableSchedules?: AvailableSchedule[],
  teamRestrictions?: Map<number, number[]>, // teamId -> restrictedScheduleIds[]
  onLog?: (message: string) => void // Callback para logs en tiempo real
): Promise<SchedulerResult> {
  // Debug: verificar que el callback esté disponible
  if (onLog) {
    onLog("🔍 Scheduler: callback de logging recibido correctamente");
  }
  if (!days.length || !courtIds.length) {
    return {
      success: false,
      error: "Configuración de horarios o canchas inválida",
    };
  }

  const timeSlots = generateTimeSlots(days, matchDurationMinutes, courtIds.length, availableSchedules);

  if (timeSlots.length < matchesPayload.length) {
    return {
      success: false,
      error: `Not enough time slots. Need ${matchesPayload.length} slots but only ${timeSlots.length} available.`,
    };
  }

  // 1) Crear mapa de partidos por team (para conocer cuántos partidos tiene cada uno)
  const matchesByTeam = new Map<number, GroupMatchPayload[]>();
  matchesPayload.forEach((match) => {
    [match.team1_id, match.team2_id].forEach((teamId) => {
      if (teamId !== null) {
        if (!matchesByTeam.has(teamId)) {
          matchesByTeam.set(teamId, []);
        }
        matchesByTeam.get(teamId)!.push(match);
      }
    });
  });

  // Función auxiliar para calcular el "nivel de restricción" de un partido
  // Partidos con equipos que tienen más restricciones tienen mayor prioridad
  const getMatchRestrictionLevel = (match: GroupMatchPayload): number => {
    const teams = [match.team1_id, match.team2_id].filter((id): id is number => id !== null);
    if (teams.length === 0) return 0;
    
    const totalRestrictions = teams.reduce((sum, teamId) => {
      return sum + (teamRestrictions?.get(teamId)?.length || 0);
    }, 0);
    
    return totalRestrictions;
  };

  // 2) Separar partidos con match_order (grupos de 4) de los que no lo tienen (grupos de 3)
  const matchesWithOrder = matchesPayload.filter((m) => m.match_order !== undefined);
  const matchesWithoutOrder = matchesPayload.filter(
    (m) => m.match_order === undefined
  );

  // 3) Para grupos de 4, separar por fase:
  // - Fase 1: Partidos 1 y 2 (primera ronda) - se asignan primero
  // - Fase 2: Partidos 3 y 4 (segunda ronda) - se asignan después, respetando el slot libre después del partido 2
  const matchesOrder1_2 = matchesWithOrder.filter((m) => m.match_order === 1 || m.match_order === 2);
  const matchesOrder3_4 = matchesWithOrder.filter((m) => m.match_order === 3 || m.match_order === 4);

  // Ordenar partidos 1-2: primero por nivel de restricción (mayor primero), luego por grupo y match_order
  const orderedMatches1_2 = [...matchesOrder1_2].sort((a, b) => {
    const aRestrictions = getMatchRestrictionLevel(a);
    const bRestrictions = getMatchRestrictionLevel(b);
    if (aRestrictions !== bRestrictions) {
      return bRestrictions - aRestrictions; // Mayor restricción primero
    }
    if (a.tournament_group_id !== b.tournament_group_id) {
      return a.tournament_group_id - b.tournament_group_id;
    }
    return (a.match_order ?? 0) - (b.match_order ?? 0);
  });

  // Ordenar partidos 3-4: primero por nivel de restricción (mayor primero), luego por grupo y match_order
  const orderedMatches3_4 = [...matchesOrder3_4].sort((a, b) => {
    const aRestrictions = getMatchRestrictionLevel(a);
    const bRestrictions = getMatchRestrictionLevel(b);
    if (aRestrictions !== bRestrictions) {
      return bRestrictions - aRestrictions; // Mayor restricción primero
    }
    if (a.tournament_group_id !== b.tournament_group_id) {
      return a.tournament_group_id - b.tournament_group_id;
    }
    return (a.match_order ?? 0) - (b.match_order ?? 0);
  });

  // 4) Ordenar partidos sin match_order (grupos de 3): primero por restricciones, luego por cantidad de partidos
  const orderedMatchesWithoutOrder = [...matchesWithoutOrder].sort((a, b) => {
    // Primero priorizar por restricciones
    const aRestrictions = getMatchRestrictionLevel(a);
    const bRestrictions = getMatchRestrictionLevel(b);
    if (aRestrictions !== bRestrictions) {
      return bRestrictions - aRestrictions; // Mayor restricción primero
    }
    
    // Si tienen las mismas restricciones, ordenar por cantidad de partidos
    const aTeam1Matches = matchesByTeam.get(a.team1_id ?? 0)?.length || 0;
    const aTeam2Matches = matchesByTeam.get(a.team2_id ?? 0)?.length || 0;
    const bTeam1Matches = matchesByTeam.get(b.team1_id ?? 0)?.length || 0;
    const bTeam2Matches = matchesByTeam.get(b.team2_id ?? 0)?.length || 0;
    const aMax = Math.max(aTeam1Matches, aTeam2Matches);
    const bMax = Math.max(bTeam1Matches, bTeam2Matches);
    return bMax - aMax;
  });

  // 5) Generar diferentes ordenaciones para probar
  // MEJORA: Ordenar por "restricción" (MRV - Minimum Remaining Values)
  // Partidos con más restricciones (menos opciones) primero
  const calculateMatchFlexibility = (match: GroupMatchPayload): number => {
    const teams = [match.team1_id, match.team2_id].filter((id): id is number => id !== null);
    if (teams.length === 0) return timeSlots.length; // Sin equipos = más flexible
    
    let validSlots = 0;
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      
      // Verificar restricciones básicas
      let valid = true;
      if (teamRestrictions && availableSchedules && availableSchedules.length > 0) {
        for (const teamId of teams) {
          const restrictedScheduleIds = teamRestrictions.get(teamId);
          if (slotViolatesRestriction(slot, restrictedScheduleIds, availableSchedules)) {
            valid = false;
            break;
          }
        }
      }
      if (valid) validSlots++;
    }
    
    return validSlots;
  };
  
  // Ordenar por flexibilidad (menos flexible = más restricciones = primero)
  // Pero mantener el orden deportivo para grupos de 4
  const sortedMatches1_2 = [...orderedMatches1_2].sort((a, b) => {
    const flexA = calculateMatchFlexibility(a);
    const flexB = calculateMatchFlexibility(b);
    if (Math.abs(flexA - flexB) > 5) {
      return flexA - flexB; // Si hay diferencia significativa, ordenar por flexibilidad
    }
    // Si son similares, mantener orden original (grupo, luego match_order)
    if (a.tournament_group_id !== b.tournament_group_id) {
      return a.tournament_group_id - b.tournament_group_id;
    }
    return (a.match_order ?? 0) - (b.match_order ?? 0);
  });
  
  const sortedMatches3_4 = [...orderedMatches3_4].sort((a, b) => {
    const flexA = calculateMatchFlexibility(a);
    const flexB = calculateMatchFlexibility(b);
    if (Math.abs(flexA - flexB) > 5) {
      return flexA - flexB;
    }
    if (a.tournament_group_id !== b.tournament_group_id) {
      return a.tournament_group_id - b.tournament_group_id;
    }
    return (a.match_order ?? 0) - (b.match_order ?? 0);
  });
  
  const sortedMatchesWithoutOrder = [...orderedMatchesWithoutOrder].sort((a, b) => {
    return calculateMatchFlexibility(a) - calculateMatchFlexibility(b);
  });
  
  const baseOrder: GroupMatchPayload[] = [
    ...sortedMatches1_2,  // Primero todos los partidos 1 y 2 (ordenados por restricciones)
    ...sortedMatches3_4,  // Luego todos los partidos 3 y 4 (ordenados por restricciones)
    ...sortedMatchesWithoutOrder,  // Finalmente grupos de 3 (ordenados por restricciones)
  ];

  // Generar variaciones de orden para grupos de 3 (los de match_order deben mantener su orden)
  const ordersToTry: GroupMatchPayload[][] = [
    baseOrder, // Orden original
  ];

  // Variaciones: solo variar el orden de los grupos de 3 (mantener orden de grupos de 4)
  if (orderedMatchesWithoutOrder.length > 0) {
    // Variación 1: reverso
    ordersToTry.push([
      ...orderedMatches1_2,
      ...orderedMatches3_4,
      ...orderedMatchesWithoutOrder.reverse(),
    ]);

    // Variación 2: orden aleatorio (pero determinístico)
    const shuffled = [...orderedMatchesWithoutOrder].sort(() => Math.random() - 0.5);
    ordersToTry.push([
      ...orderedMatches1_2,
      ...orderedMatches3_4,
      ...shuffled,
    ]);

    // Variación 3: ordenado por grupo (si hay múltiples grupos de 3)
    const sortedByGroup = [...orderedMatchesWithoutOrder].sort((a, b) => {
      return a.tournament_group_id - b.tournament_group_id;
    });
    if (JSON.stringify(sortedByGroup) !== JSON.stringify(orderedMatchesWithoutOrder)) {
      ordersToTry.push([
        ...orderedMatches1_2,
        ...orderedMatches3_4,
        ...sortedByGroup,
      ]);
    }
  }

  // Constante para descanso mínimo
  const minSlotsBetweenMatches = 1; // Siempre mantener descanso mínimo

  // 6) Función de backtracking más inteligente que prueba múltiples candidatos
  // Agregar límite de iteraciones para evitar loops infinitos
  let backtrackIterations = 0;
  const MAX_BACKTRACK_ITERATIONS = 200000; // Aumentar límite de iteraciones
  
  const tryAssignWithBacktracking = async (
    order: GroupMatchPayload[],
    relaxOrderRestrictions: boolean = false,
    maxDepth: number = 5, // Aumentar profundidad máxima de backtracking
    beamWidth: number = 10, // Aumentar número de candidatos a explorar en cada nivel
    logCallback?: (message: string) => void // Callback para logs
  ): Promise<{ success: boolean; assignments: Map<number, Assignment>; totalScore: number }> => {
    backtrackIterations = 0; // Resetear contador para cada intento
    // Usar el callback de log si está disponible, sino usar console.log
    // Hacer que cada log ceda el control al event loop para que los mensajes se envíen en tiempo real
    const log = logCallback ? async (msg: string) => {
      try {
        logCallback(msg);
        // Ceder control después de cada log para que el stream pueda procesar
        await new Promise(resolve => setImmediate(resolve));
      } catch (error) {
        console.error("Error in log callback:", error);
        console.log(msg);
      }
    } : (onLog ? async (msg: string) => {
      try {
        onLog(msg);
        // Ceder control después de cada log para que el stream pueda procesar
        await new Promise(resolve => setImmediate(resolve));
      } catch (error) {
        console.error("Error in log callback:", error);
        console.log(msg);
      }
    } : console.log);
    type State = {
      assignments: Map<number, Assignment>;
      usedSlots: Set<number>;
      usedPhysicalSlots: Set<string>; // Rastrear slots físicos usados
      teamAssignments: Map<number, Array<{ date: string; startTime: string }>>;
      matchIndex: number;
      score: number;
    };

    const backtrack = async (state: State, depth: number): Promise<State | null> => {
      backtrackIterations++;
      if (backtrackIterations > MAX_BACKTRACK_ITERATIONS) {
        if (backtrackIterations === MAX_BACKTRACK_ITERATIONS + 1) {
          log(`⚠️ Límite de iteraciones alcanzado (${MAX_BACKTRACK_ITERATIONS})`);
        }
        return null; // Límite de iteraciones alcanzado
      }
      
      // Log periódico del progreso y ceder control al event loop
      // Aumentar el intervalo para reducir la cantidad de logs
      if (backtrackIterations % 10000 === 0) {
        log(`🔄 Procesando... ${backtrackIterations} iteraciones, ${state.matchIndex}/${order.length} partidos asignados`);
        // Ceder control al event loop para que el stream pueda procesar mensajes
        // Usar un pequeño delay para asegurar que el stream procese los mensajes
        await new Promise(resolve => setImmediate(resolve));
      }
      
      if (state.matchIndex >= order.length) {
        return state; // Solución encontrada
      }

      // No limitar por profundidad si aún hay partidos por asignar
      // La profundidad solo se usa para limitar el beam search, no para detener la búsqueda

      const match = order[state.matchIndex];
      const matchIdx = matchesPayload.indexOf(match);
      if (matchIdx === -1) {
        return await backtrack({ ...state, matchIndex: state.matchIndex + 1 }, depth);
      }

      const teamsInMatch = [match.team1_id, match.team2_id].filter(
        (id): id is number => id !== null
      );

      // Encontrar todos los candidatos válidos
      const validCandidates: Array<{
        slotIndex: number;
        score: number;
        slot: TimeSlot;
      }> = [];

      for (let i = 0; i < timeSlots.length; i++) {
        if (state.usedSlots.has(i)) continue;

        const slot = timeSlots[i];
        
        // Verificar si el slot físico ya está usado
        // Los slots se generan en grupos de numCourts, así que el índice de la cancha es i % numCourts
        // Pero necesitamos calcular esto correctamente considerando que los slots están organizados
        // en bloques de numCourts para cada slot físico
        if (slot.physicalSlotId) {
          // Calcular el índice de la cancha: los slots están organizados en bloques de numCourts
          // Para encontrar el bloque, necesitamos saber cuántos bloques de numCourts hay antes de este slot
          // Pero como los slots se generan secuencialmente (todos los slots del día1, luego todos los del día2),
          // y cada slot físico tiene numCourts copias consecutivas, podemos usar i % numCourts
          const courtIndex = i % courtIds.length;
          const physicalSlotKey = `${slot.physicalSlotId}-court${courtIndex}`;
          if (state.usedPhysicalSlots.has(physicalSlotKey)) continue;
        }
        
        let valid = true;

        // Validar restricciones horarias de los equipos
        if (teamRestrictions && availableSchedules && availableSchedules.length > 0 && teamsInMatch.length > 0) {
          for (const teamId of teamsInMatch) {
            const restrictedScheduleIds = teamRestrictions.get(teamId);
            if (slotViolatesRestriction(slot, restrictedScheduleIds, availableSchedules)) {
              valid = false;
              break;
            }
          }
        }

        if (!valid) continue;

        // Validaciones estrictas: no permitir partidos consecutivos del mismo equipo
        // IMPORTANTE: Comparar tiempos reales, no índices de slots, porque con múltiples canchas
        // los índices consecutivos pueden ser del mismo tiempo en diferentes canchas
        if (teamsInMatch.length > 0) {
          for (const teamId of teamsInMatch) {
            const assignedForTeam = state.teamAssignments.get(teamId) || [];
            for (const prev of assignedForTeam) {
              if (prev.date !== slot.date) continue;
              
              // Comparar tiempos reales, no índices
              const prevStartMinutes = timeToMinutesOfDay(prev.startTime);
              const currentStartMinutes = timeToMinutesOfDay(slot.startTime);
              
              // Calcular la diferencia en minutos
              const timeDiffMinutes = Math.abs(currentStartMinutes - prevStartMinutes);
              
              // Convertir minSlotsBetweenMatches a minutos (cada slot tiene matchDurationMinutes de duración)
              // minSlotsBetweenMatches = 1 significa que debe haber al menos 1 slot de diferencia
              // Un slot de diferencia = matchDurationMinutes minutos
              const minGapMinutes = minSlotsBetweenMatches * matchDurationMinutes;
              
              if (timeDiffMinutes <= minGapMinutes) {
                valid = false;
                break;
              }
            }
            if (!valid) break;
          }
        }

        if (!valid) continue;

        // Validaciones especiales para grupos de 4
        let orderPenalty = 0;
        if (match.match_order === 3) {
          const match2 = matchesPayload.find(
            (m) =>
              m.tournament_group_id === match.tournament_group_id &&
              m.match_order === 2
          );
          if (match2) {
            const match2Idx = matchesPayload.indexOf(match2);
            const match2Assignment = state.assignments.get(match2Idx);
            if (match2Assignment && slot.date === match2Assignment.date) {
              const match2StartMinutes = timeToMinutesOfDay(match2Assignment.startTime);
              const match2EndMinutes = match2StartMinutes + matchDurationMinutes;
              const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
              const minGapMinutes = matchDurationMinutes;
              const gapMinutes = slotStartMinutes - match2EndMinutes;
              if (gapMinutes < minGapMinutes) {
                if (relaxOrderRestrictions) {
                  orderPenalty += 10000 * (minGapMinutes - gapMinutes);
                } else {
                  valid = false;
                }
              }
            }
          }
        }

        if (match.match_order === 4) {
          const match3 = matchesPayload.find(
            (m) =>
              m.tournament_group_id === match.tournament_group_id &&
              m.match_order === 3
          );
          if (match3) {
            const match3Idx = matchesPayload.indexOf(match3);
            const match3Assignment = state.assignments.get(match3Idx);
            if (match3Assignment) {
              if (slot.date === match3Assignment.date) {
                const match3StartMinutes = timeToMinutesOfDay(match3Assignment.startTime);
                const match3EndMinutes = match3StartMinutes + matchDurationMinutes;
                const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
                if (slotStartMinutes < match3EndMinutes) {
                  if (relaxOrderRestrictions) {
                    orderPenalty += 15000;
                  } else {
                    valid = false;
                  }
                }
              } else if (slot.date < match3Assignment.date) {
                if (relaxOrderRestrictions) {
                  orderPenalty += 20000;
                } else {
                  valid = false;
                }
              }
            } else {
              if (!relaxOrderRestrictions) {
                valid = false;
              } else {
                orderPenalty += 25000;
              }
            }
          }
        }

        if (!valid) continue;

        // Calcular score con heurísticas más inteligentes
        let score = 0;
        score -= orderPenalty;

        // HEURÍSTICA 1: Forward Checking optimizado - Calcular cuántas opciones quedan para otros partidos
        // después de asignar este slot (Least Constraining Value)
        // OPTIMIZACIÓN: Solo verificar los próximos 5 partidos para no hacer el cálculo muy costoso
        let remainingOptionsForOthers = 0;
        const remainingMatches = order.slice(state.matchIndex + 1, state.matchIndex + 6); // Solo próximos 5
        
        // Pre-calcular qué slots físicos se usarían
        const testUsedPhysicalSlots = new Set(state.usedPhysicalSlots);
        if (slot.physicalSlotId) {
          const courtIndex = i % courtIds.length;
          const physicalSlotKey = `${slot.physicalSlotId}-court${courtIndex}`;
          testUsedPhysicalSlots.add(physicalSlotKey);
        }
        
        // Pre-calcular asignaciones de equipos simuladas
        const testTeamAssignments = new Map(state.teamAssignments);
        for (const teamId of teamsInMatch) {
          if (teamId === null) continue;
          if (!testTeamAssignments.has(teamId)) {
            testTeamAssignments.set(teamId, []);
          }
          testTeamAssignments.get(teamId)!.push({
            date: slot.date,
            startTime: slot.startTime,
          });
        }
        
        for (const futureMatch of remainingMatches) {
          const futureMatchIdx = matchesPayload.indexOf(futureMatch);
          if (futureMatchIdx === -1) continue;
          
          const futureTeams = [futureMatch.team1_id, futureMatch.team2_id].filter(
            (id): id is number => id !== null
          );
          
          // Contar slots válidos para futureMatch después de esta asignación
          let validSlotsForFuture = 0;
          for (let j = 0; j < timeSlots.length; j++) {
            if (state.usedSlots.has(j) || j === i) continue; // Ya usado o es el slot actual
            
            const futureSlot = timeSlots[j];
            
            // Verificar slot físico
            if (futureSlot.physicalSlotId) {
              const courtIndex = j % courtIds.length;
              const physicalSlotKey = `${futureSlot.physicalSlotId}-court${courtIndex}`;
              if (testUsedPhysicalSlots.has(physicalSlotKey)) continue;
            }
            
            // Verificar restricciones
            let futureValid = true;
            if (teamRestrictions && availableSchedules && availableSchedules.length > 0 && futureTeams.length > 0) {
              for (const teamId of futureTeams) {
                const restrictedScheduleIds = teamRestrictions.get(teamId);
                if (slotViolatesRestriction(futureSlot, restrictedScheduleIds, availableSchedules)) {
                  futureValid = false;
                  break;
                }
              }
            }
            if (!futureValid) continue;
            
            // Verificar consecutivos
            if (futureTeams.length > 0) {
              for (const teamId of futureTeams) {
                const assignedForTeam = testTeamAssignments.get(teamId) || [];
                for (const prev of assignedForTeam) {
                  if (prev.date !== futureSlot.date) continue;
                  const prevStartMinutes = timeToMinutesOfDay(prev.startTime);
                  const currentStartMinutes = timeToMinutesOfDay(futureSlot.startTime);
                  const timeDiffMinutes = Math.abs(currentStartMinutes - prevStartMinutes);
                  const minGapMinutes = minSlotsBetweenMatches * matchDurationMinutes;
                  if (timeDiffMinutes <= minGapMinutes) {
                    futureValid = false;
                    break;
                  }
                }
                if (!futureValid) break;
              }
            }
            
            if (futureValid) validSlotsForFuture++;
          }
          
          // Bonus mayor si el partido futuro tiene pocas opciones (priorizar slots que no eliminen opciones críticas)
          const baseOptions = calculateMatchFlexibility(futureMatch);
          if (baseOptions < 10 && validSlotsForFuture > 0) {
            remainingOptionsForOthers += validSlotsForFuture * 20; // Bonus extra para partidos restrictivos
          } else {
            remainingOptionsForOthers += validSlotsForFuture;
          }
        }
        
        // Bonus por dejar más opciones para otros partidos (Least Constraining Value)
        score += remainingOptionsForOthers * 15;

        const slotIndex = i;
        const totalSlots = timeSlots.length;
        if (slotIndex < totalSlots / 2) {
          score += 100;
        }

        // Bonus para match_order 2
        if (match.match_order === 2) {
          const match3 = matchesPayload.find(
            (m) =>
              m.tournament_group_id === match.tournament_group_id &&
              m.match_order === 3
          );
          if (match3) {
            const matchEndMinutes = timeToMinutesOfDay(slot.startTime) + matchDurationMinutes;
            const nextSlotStartMinutes = matchEndMinutes + matchDurationMinutes;
            const availableSlotsAfter = timeSlots.filter(
              (s, idx) =>
                !state.usedSlots.has(idx) &&
                s.date === slot.date &&
                timeToMinutesOfDay(s.startTime) >= nextSlotStartMinutes
            );
            if (availableSlotsAfter.length > 0) {
              score += 10000;
            }
          }
        }

        // Bonus para match_order 3
        if (match.match_order === 3) {
          const match2 = matchesPayload.find(
            (m) =>
              m.tournament_group_id === match.tournament_group_id &&
              m.match_order === 2
          );
          if (match2) {
            const match2Idx = matchesPayload.indexOf(match2);
            const match2Assignment = state.assignments.get(match2Idx);
            if (match2Assignment && slot.date === match2Assignment.date) {
              const match2StartMinutes = timeToMinutesOfDay(match2Assignment.startTime);
              const match2EndMinutes = match2StartMinutes + matchDurationMinutes;
              const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
              const gapMinutes = slotStartMinutes - match2EndMinutes;
              const idealGap = matchDurationMinutes;
              if (gapMinutes === idealGap) {
                score += 5000;
              } else if (gapMinutes > idealGap && gapMinutes < idealGap * 3) {
                score += 2000;
              }
            }
          }
        }

        // Bonus para match_order 4
        if (match.match_order === 4) {
          const match3 = matchesPayload.find(
            (m) =>
              m.tournament_group_id === match.tournament_group_id &&
              m.match_order === 3
          );
          if (match3) {
            const match3Idx = matchesPayload.indexOf(match3);
            const match3Assignment = state.assignments.get(match3Idx);
            if (match3Assignment && slot.date === match3Assignment.date) {
              const match3StartMinutes = timeToMinutesOfDay(match3Assignment.startTime);
              const match3EndMinutes = match3StartMinutes + matchDurationMinutes;
              const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
              const gapMinutes = slotStartMinutes - match3EndMinutes;
              if (gapMinutes >= 0 && gapMinutes < matchDurationMinutes * 2) {
                score += 3000;
              }
            }
          }
        }

        // Score de compactación
        if (teamsInMatch.length > 0) {
          for (const teamId of teamsInMatch) {
            const assignedForTeam = state.teamAssignments.get(teamId) || [];
            const sameDayAssignments = assignedForTeam.filter(
              (a) => a.date === slot.date
            );
            if (sameDayAssignments.length > 0) {
              let bestDistanceMinutes = Infinity;
              for (const a of sameDayAssignments) {
                const refMinutes = timeToMinutesOfDay(a.startTime);
                const currentMinutes = timeToMinutesOfDay(slot.startTime);
                const diff = Math.abs(currentMinutes - refMinutes);
                if (diff < bestDistanceMinutes) {
                  bestDistanceMinutes = diff;
                }
              }
              const reasonableGap = 3 * 60;
              if (bestDistanceMinutes <= reasonableGap) {
                const normalized = reasonableGap - bestDistanceMinutes;
                score += normalized * 0.5;
              }
            }
          }
        }

        validCandidates.push({ slotIndex: i, score, slot });
      }

      if (validCandidates.length === 0) {
        // Debug: mostrar por qué no hay candidatos válidos (solo para los primeros partidos)
        if (state.matchIndex < 3) {
          log(`[DEBUG] No hay candidatos válidos para partido ${state.matchIndex + 1}/${order.length}`);
          log(`  Equipos: ${teamsInMatch.join(', ')}`);
          log(`  Slots usados: ${state.usedSlots.size}/${timeSlots.length}`);
          log(`  Slots físicos usados: ${state.usedPhysicalSlots.size}`);
          if (teamRestrictions && teamsInMatch.length > 0) {
            teamsInMatch.forEach(teamId => {
              const restrictions = teamRestrictions.get(teamId);
              if (restrictions && restrictions.length > 0) {
                log(`  Equipo ${teamId} tiene ${restrictions.length} restricciones`);
              }
            });
          }
          // Contar cuántos slots fueron rechazados por cada razón
          let rejectedByUsed = 0;
          let rejectedByPhysical = 0;
          let rejectedByRestrictions = 0;
          let rejectedByConsecutive = 0;
          let rejectedByOrder = 0;
          for (let i = 0; i < timeSlots.length; i++) {
            if (state.usedSlots.has(i)) {
              rejectedByUsed++;
              continue;
            }
            const slot = timeSlots[i];
            if (slot.physicalSlotId) {
              const courtIndex = i % courtIds.length;
              const physicalSlotKey = `${slot.physicalSlotId}-court${courtIndex}`;
              if (state.usedPhysicalSlots.has(physicalSlotKey)) {
                rejectedByPhysical++;
                continue;
              }
            }
            if (teamRestrictions && availableSchedules && availableSchedules.length > 0 && teamsInMatch.length > 0) {
              let hasRestriction = false;
              for (const teamId of teamsInMatch) {
                const restrictedScheduleIds = teamRestrictions.get(teamId);
                if (slotViolatesRestriction(slot, restrictedScheduleIds, availableSchedules)) {
                  rejectedByRestrictions++;
                  hasRestriction = true;
                  break;
                }
              }
              if (hasRestriction) continue;
            }
            // Verificar consecutivos (simplificado para debug)
            let hasConsecutive = false;
            if (teamsInMatch.length > 0) {
              for (const teamId of teamsInMatch) {
                const assignedForTeam = state.teamAssignments.get(teamId) || [];
                for (const prev of assignedForTeam) {
                  if (prev.date !== slot.date) continue;
                  
                  // Comparar tiempos reales, no índices (igual que en la validación real)
                  const prevStartMinutes = timeToMinutesOfDay(prev.startTime);
                  const currentStartMinutes = timeToMinutesOfDay(slot.startTime);
                  const timeDiffMinutes = Math.abs(currentStartMinutes - prevStartMinutes);
                  const minGapMinutes = minSlotsBetweenMatches * matchDurationMinutes;
                  
                  if (timeDiffMinutes <= minGapMinutes) {
                    rejectedByConsecutive++;
                    hasConsecutive = true;
                    break;
                  }
                }
                if (hasConsecutive) break;
              }
            }
          }
          log(`  Rechazados: ${rejectedByUsed} usados, ${rejectedByPhysical} físicos, ${rejectedByRestrictions} restricciones, ${rejectedByConsecutive} consecutivos`);
        }
        return null; // No hay candidatos válidos
      }

      // Ordenar candidatos por score
      validCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.slotIndex - b.slotIndex;
      });

      // Probar los mejores candidatos (beam search)
      // MEJORA: Usar heurística adaptativa - si hay pocos candidatos, probar todos
      // Si estamos cerca del final, probar más candidatos para asegurar encontrar solución
      const effectiveBeamWidth = state.matchIndex >= order.length - 3 
        ? Math.max(beamWidth * 2, validCandidates.length) 
        : validCandidates.length <= beamWidth * 2
        ? validCandidates.length // Si hay pocos candidatos, probar todos
        : beamWidth;
      const candidatesToTry = validCandidates.slice(0, effectiveBeamWidth);
      const results: State[] = [];

      for (const candidate of candidatesToTry) {
        const newAssignments = new Map(state.assignments);
        const newUsedSlots = new Set(state.usedSlots);
        const newUsedPhysicalSlots = new Set(state.usedPhysicalSlots);
        const newTeamAssignments = new Map(state.teamAssignments);

        newUsedSlots.add(candidate.slotIndex);
        
        // Marcar el slot físico como usado
        const candidateSlot = timeSlots[candidate.slotIndex];
        if (candidateSlot.physicalSlotId) {
          const courtIndex = candidate.slotIndex % courtIds.length;
          const physicalSlotKey = `${candidateSlot.physicalSlotId}-court${courtIndex}`;
          newUsedPhysicalSlots.add(physicalSlotKey);
        }

        const endTime = calculateEndTime(
          candidate.slot.startTime,
          matchDurationMinutes
        );

        // Calcular el courtId basado en el slotIndex
        const courtId = courtIds[candidate.slotIndex % courtIds.length];
        
        newAssignments.set(matchIdx, {
          matchIdx,
          date: candidate.slot.date,
          startTime: candidate.slot.startTime,
          endTime,
          slotIndex: candidate.slotIndex,
          courtId,
        });

        for (const teamId of [match.team1_id, match.team2_id]) {
          if (teamId === null) continue;
          if (!newTeamAssignments.has(teamId)) {
            newTeamAssignments.set(teamId, []);
          }
          newTeamAssignments.get(teamId)!.push({
            date: candidate.slot.date,
            startTime: candidate.slot.startTime,
          });
        }

        const newState: State = {
          assignments: newAssignments,
          usedSlots: newUsedSlots,
          usedPhysicalSlots: newUsedPhysicalSlots,
          teamAssignments: newTeamAssignments,
          matchIndex: state.matchIndex + 1,
          score: state.score + candidate.score,
        };

        const result = await backtrack(newState, depth + 1);
        if (result) {
          results.push(result);
        }
      }

      if (results.length === 0) {
        return null;
      }

      // Retornar el mejor resultado
      // MEJORA: Considerar no solo el score, sino también cuántos partidos quedan sin asignar
      // Priorizar soluciones que están más cerca de completarse
      results.sort((a, b) => {
        // Primero por score
        if (Math.abs(b.score - a.score) > 1000) {
          return b.score - a.score;
        }
        // Si los scores son similares, priorizar el que tiene más partidos asignados
        return b.assignments.size - a.assignments.size;
      });
      return results[0];
    };

    const initialState: State = {
      assignments: new Map(),
      usedSlots: new Set(),
      usedPhysicalSlots: new Set(),
      teamAssignments: new Map(),
      matchIndex: 0,
      score: 0,
    };

    const result = await backtrack(initialState, 0);
    if (result) {
      return { success: true, assignments: result.assignments, totalScore: result.score };
    }
    return { success: false, assignments: new Map(), totalScore: -Infinity };
  };

  // 8) Probar todas las ordenaciones con algoritmo mejorado
  // Ir directo con backtracking que es más inteligente y encuentra mejores soluciones
  let bestResult: { success: boolean; assignments: Map<number, Assignment>; totalScore: number } | null = null;

  // Asegurarse de que el callback se use correctamente
  const log = onLog ? (msg: string) => {
    try {
      onLog(msg);
    } catch (error) {
      console.error("Error in log callback:", error);
      console.log(msg);
    }
  } : console.log;
  
  log("Intentando asignación con backtracking inteligente (restricciones estrictas)...");
  log(`Total de partidos: ${matchesPayload.length}, Total de slots: ${timeSlots.length}`);
  log(`Equipos con restricciones: ${teamRestrictions ? Array.from(teamRestrictions.keys()).length : 0}`);
  
  // MEJORA: Probar primero con el orden más inteligente (por restricciones - MRV)
  // Si falla, probar otras variaciones
  const smartOrder = baseOrder; // Ya está ordenado por flexibilidad (MRV)
  
  log(`Probando orden inteligente (MRV - partidos más restrictivos primero)...`);
  let result = await tryAssignWithBacktracking(smartOrder, false, 5, 20, onLog); // Aumentar beam width para orden inteligente
  if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
    bestResult = result;
    log(`✅ Solución encontrada con orden inteligente, score: ${result.totalScore}, iteraciones: ${backtrackIterations}`);
  } else if (!result.success) {
    log(`⚠️ Orden inteligente falló después de ${backtrackIterations} iteraciones, probando otras variaciones...`);
    
    // Probar con otras variaciones
    for (let orderIdx = 0; orderIdx < ordersToTry.length; orderIdx++) {
      const order = ordersToTry[orderIdx];
      // Saltar el orden inteligente si ya está en ordersToTry
      if (JSON.stringify(order) === JSON.stringify(smartOrder)) continue;
      
      log(`Probando orden ${orderIdx + 1}/${ordersToTry.length}...`);
      result = await tryAssignWithBacktracking(order, false, 5, 15, onLog);
      if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
        bestResult = result;
        log(`✅ Solución encontrada con score: ${result.totalScore}, iteraciones: ${backtrackIterations}`);
        break; // Salir temprano si encuentra solución
      } else if (!result.success) {
        log(`❌ Orden ${orderIdx + 1} falló después de ${backtrackIterations} iteraciones`);
      }
    }
  }

  // Si no se encontró solución, intentar con restricciones relajadas
  if (!bestResult || !bestResult.success) {
    log("Intentando con restricciones relajadas y backtracking más profundo...");
    for (let orderIdx = 0; orderIdx < ordersToTry.length; orderIdx++) {
      const order = ordersToTry[orderIdx];
      log(`Probando orden ${orderIdx + 1}/${ordersToTry.length} con restricciones relajadas...`);
      const result = await tryAssignWithBacktracking(order, true, 8, 15, onLog);
      if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
        bestResult = result;
        log(`Solución encontrada con score: ${result.totalScore}`);
        break; // Salir temprano si encuentra solución
      } else if (!result.success) {
        log(`Orden ${orderIdx + 1} falló con restricciones relajadas, iteraciones: ${backtrackIterations}`);
      }
    }
  }

  // Si aún no se encontró, generar más variaciones adicionales
  if (!bestResult || !bestResult.success) {
    log("Generando variaciones adicionales y probando con backtracking...");
    const additionalOrders: GroupMatchPayload[][] = [];
    
    // Generar más variaciones
    for (let i = 0; i < 10; i++) {
      // Mezclar solo los grupos de 3, manteniendo orden de grupos de 4
      const shuffledWithoutOrder = [...orderedMatchesWithoutOrder].sort(() => Math.random() - 0.5);
      additionalOrders.push([
        ...orderedMatches1_2,
        ...orderedMatches3_4,
        ...shuffledWithoutOrder,
      ]);
    }

    // Ordenar por dificultad (equipos con más restricciones primero)
    const orderByDifficulty = [...baseOrder].sort((a, b) => {
      const aTeams = [a.team1_id, a.team2_id].filter((id): id is number => id !== null);
      const bTeams = [b.team1_id, b.team2_id].filter((id): id is number => id !== null);
      
      const aRestrictions = aTeams.reduce((sum, tid) => {
        return sum + (teamRestrictions?.get(tid)?.length || 0);
      }, 0);
      const bRestrictions = bTeams.reduce((sum, tid) => {
        return sum + (teamRestrictions?.get(tid)?.length || 0);
      }, 0);
      
      return bRestrictions - aRestrictions;
    });
    additionalOrders.push(orderByDifficulty);

    for (let i = 0; i < additionalOrders.length; i++) {
      const order = additionalOrders[i];
      log(`Probando variación adicional ${i + 1}/${additionalOrders.length}...`);
      const result = await tryAssignWithBacktracking(order, true, 10, 20, onLog);
      if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
        bestResult = result;
        log(`Solución encontrada con variación ${i + 1}, score: ${result.totalScore}`);
        break; // Salir temprano si encuentra solución
      }
    }
  }

  if (!bestResult || !bestResult.success) {
    return {
      success: false,
      error:
        "No se pudo asignar horarios para todos los partidos respetando el descanso mínimo. Intenta con más días/horarios disponibles o más canchas.",
    };
  }

  // 8) Aplicar las asignaciones del mejor resultado al payload original
  const assignments = bestResult.assignments;
  for (const [idx, assignment] of Array.from(assignments.entries())) {
    const match = matchesPayload[idx];
    if (!match) continue;
    match.match_date = assignment.date;
    match.start_time = assignment.startTime;
    match.end_time = assignment.endTime;
    match.court_id = assignment.courtId;
  }

  return { success: true, assignments: Array.from(assignments.values()) };
}



