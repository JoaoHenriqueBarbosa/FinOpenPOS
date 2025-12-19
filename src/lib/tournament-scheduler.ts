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
};

export type TimeSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

// Obtener el día de la semana de una fecha (0=domingo, 6=sábado)
function getDayOfWeek(date: string): number {
  const d = new Date(date + "T00:00:00");
  return d.getDay();
}

// Verificar si un slot coincide con un horario disponible
function slotMatchesAvailableSchedule(
  slot: TimeSlot,
  availableSchedule: AvailableSchedule
): boolean {
  const slotDayOfWeek = getDayOfWeek(slot.date);
  if (slotDayOfWeek !== availableSchedule.day_of_week) return false;

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
    const endMinutes = endH * 60 + endM;

    let currentMinutes = startMinutes;
    while (currentMinutes + matchDuration <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60);
      const slotStartM = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + matchDuration;
      const slotEndH = Math.floor(slotEndMinutes / 60);
      const slotEndM = slotEndMinutes % 60;

      const slot: TimeSlot = {
        date: day.date,
        startTime: `${String(slotStartH).padStart(2, "0")}:${String(
          slotStartM
        ).padStart(2, "0")}`,
        endTime: `${String(slotEndH).padStart(2, "0")}:${String(
          slotEndM
        ).padStart(2, "0")}`,
      };

      // Si hay horarios disponibles configurados, filtrar slots que no coincidan
      if (availableSchedules && availableSchedules.length > 0) {
        const matchesSchedule = availableSchedules.some((schedule) =>
          slotMatchesAvailableSchedule(slot, schedule)
        );
        if (!matchesSchedule) {
          currentMinutes += matchDuration;
          continue;
        }
      }

      // Un slot por cada cancha disponible
      for (let i = 0; i < numCourts; i++) {
        slots.push(slot);
      }

      currentMinutes += matchDuration;
    }
  });

  return slots;
}

function timeToMinutesOfDay(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
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

  // Encontrar qué horario disponible coincide con este slot
  const matchingSchedule = availableSchedules.find((schedule) =>
    slotMatchesAvailableSchedule(slot, schedule)
  );

  if (!matchingSchedule) return false;

  // Si el ID del horario está en las restricciones, el slot está prohibido
  return restrictedScheduleIds.includes(matchingSchedule.id);
}

// Asigna horarios directamente sobre el arreglo de matches (modificándolo)
export function scheduleGroupMatches(
  matchesPayload: GroupMatchPayload[],
  days: ScheduleDay[],
  matchDurationMinutes: number,
  courtIds: number[],
  availableSchedules?: AvailableSchedule[],
  teamRestrictions?: Map<number, number[]> // teamId -> restrictedScheduleIds[]
): SchedulerResult {
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

  // Ordenar partidos 1-2 por grupo y luego por match_order
  const orderedMatches1_2 = [...matchesOrder1_2].sort((a, b) => {
    if (a.tournament_group_id !== b.tournament_group_id) {
      return a.tournament_group_id - b.tournament_group_id;
    }
    return (a.match_order ?? 0) - (b.match_order ?? 0);
  });

  // Ordenar partidos 3-4: primero el 3 (ganadores), luego el 4 (perdedores), agrupados por grupo
  const orderedMatches3_4 = [...matchesOrder3_4].sort((a, b) => {
    if (a.tournament_group_id !== b.tournament_group_id) {
      return a.tournament_group_id - b.tournament_group_id;
    }
    return (a.match_order ?? 0) - (b.match_order ?? 0);
  });

  // 4) Ordenar partidos sin match_order (grupos de 3) por cantidad de partidos de los equipos
  // (los equipos que más juegan se asignan primero para facilitar descansos)
  const orderedMatchesWithoutOrder = [...matchesWithoutOrder].sort((a, b) => {
    const aTeam1Matches = matchesByTeam.get(a.team1_id ?? 0)?.length || 0;
    const aTeam2Matches = matchesByTeam.get(a.team2_id ?? 0)?.length || 0;
    const bTeam1Matches = matchesByTeam.get(b.team1_id ?? 0)?.length || 0;
    const bTeam2Matches = matchesByTeam.get(b.team2_id ?? 0)?.length || 0;
    const aMax = Math.max(aTeam1Matches, aTeam2Matches);
    const bMax = Math.max(bTeam1Matches, bTeam2Matches);
    return bMax - aMax;
  });

  // 5) Generar diferentes ordenaciones para probar
  // Orden base: primero los de primera ronda (1-2), luego segunda ronda (3-4), luego grupos de 3
  const baseOrder: GroupMatchPayload[] = [
    ...orderedMatches1_2,  // Primero todos los partidos 1 y 2
    ...orderedMatches3_4,  // Luego todos los partidos 3 y 4 (pero se asignarán respetando el slot libre)
    ...orderedMatchesWithoutOrder,  // Finalmente grupos de 3
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

  // 6) Función interna para intentar asignar con un orden específico
  const tryAssignWithOrder = (
    order: GroupMatchPayload[],
    relaxOrderRestrictions: boolean = false
  ): { success: boolean; assignments: Map<number, Assignment>; totalScore: number } => {
    const testAssignments = new Map<number, Assignment>();
    const testUsedSlots = new Set<number>();
    const testTeamAssignments = new Map<
      number,
      Array<{ date: string; startTime: string }>
    >();

    const minSlotsBetweenMatches = 1; // Siempre mantener descanso mínimo
    let totalScore = 0;

    for (const match of order) {
      const matchIdx = matchesPayload.indexOf(match);
      if (matchIdx === -1) {
        continue;
      }

      const validCandidates: Array<{
        slotIndex: number;
        score: number;
        slot: TimeSlot;
      }> = [];

      for (let i = 0; i < timeSlots.length; i++) {
        if (testUsedSlots.has(i)) continue;

        const slot = timeSlots[i];
        let valid = true;
        const teamsInMatch = [match.team1_id, match.team2_id].filter(
          (id): id is number => id !== null
        );

        // Validar restricciones horarias de los equipos
        if (teamRestrictions && availableSchedules && teamsInMatch.length > 0) {
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
        if (teamsInMatch.length > 0) {
          for (const teamId of teamsInMatch) {
            const assignedForTeam = testTeamAssignments.get(teamId) || [];
            for (const prev of assignedForTeam) {
              if (prev.date !== slot.date) continue;
              const prevIndex = timeSlots.findIndex(
                (s) => s.date === prev.date && s.startTime === prev.startTime
              );
              if (prevIndex === -1) continue;
              const distance = Math.abs(i - prevIndex);
              if (distance <= minSlotsBetweenMatches) {
                valid = false;
                break;
              }
            }
            if (!valid) break;
          }
        }

        if (!valid) continue;

        // Validaciones especiales para grupos de 4
        // En modo relajado, permitimos flexibilidad en el orden deportivo pero con penalización
        let orderPenalty = 0;
        if (match.match_order === 3) {
          const match2 = matchesPayload.find(
            (m) =>
              m.tournament_group_id === match.tournament_group_id &&
              m.match_order === 2
          );
          if (match2) {
            const match2Idx = matchesPayload.indexOf(match2);
            const match2Assignment = testAssignments.get(match2Idx);
            if (match2Assignment && slot.date === match2Assignment.date) {
              const match2StartMinutes = timeToMinutesOfDay(match2Assignment.startTime);
              const match2EndMinutes = match2StartMinutes + matchDurationMinutes;
              const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
              const minGapMinutes = matchDurationMinutes;
              const gapMinutes = slotStartMinutes - match2EndMinutes;
              if (gapMinutes < minGapMinutes) {
                if (relaxOrderRestrictions) {
                  // Permitir pero penalizar fuertemente
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
            const match3Assignment = testAssignments.get(match3Idx);
            if (match3Assignment) {
              if (slot.date === match3Assignment.date) {
                const match3StartMinutes = timeToMinutesOfDay(match3Assignment.startTime);
                const match3EndMinutes = match3StartMinutes + matchDurationMinutes;
                const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
                if (slotStartMinutes < match3EndMinutes) {
                  if (relaxOrderRestrictions) {
                    // Permitir pero penalizar fuertemente
                    orderPenalty += 15000;
                  } else {
                    valid = false;
                  }
                }
              } else if (slot.date < match3Assignment.date) {
                if (relaxOrderRestrictions) {
                  // Permitir pero penalizar fuertemente
                  orderPenalty += 20000;
                } else {
                  valid = false;
                }
              }
            } else {
              // Si match3 no está asignado, solo rechazar si no estamos en modo relajado
              if (!relaxOrderRestrictions) {
                valid = false;
              } else {
                orderPenalty += 25000;
              }
            }
          }
        }

        if (!valid) continue;

        // Calcular score (mismo código que antes)
        let score = 0;

        // Aplicar penalización por violaciones de orden deportivo (solo en modo relajado)
        score -= orderPenalty;

        // Bonus por slots tempranos
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
                !testUsedSlots.has(idx) &&
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
            const match2Assignment = testAssignments.get(match2Idx);
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
            const match3Assignment = testAssignments.get(match3Idx);
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
            const assignedForTeam = testTeamAssignments.get(teamId) || [];
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

      if (!validCandidates.length) {
        return { success: false, assignments: testAssignments, totalScore: -Infinity };
      }

      validCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.slotIndex - b.slotIndex;
      });

      const chosen = validCandidates[0];
      totalScore += chosen.score;
      testUsedSlots.add(chosen.slotIndex);

      const endTime = calculateEndTime(
        chosen.slot.startTime,
        matchDurationMinutes
      );

      testAssignments.set(matchIdx, {
        matchIdx,
        date: chosen.slot.date,
        startTime: chosen.slot.startTime,
        endTime,
        slotIndex: chosen.slotIndex,
      });

      for (const teamId of [match.team1_id, match.team2_id]) {
        if (teamId === null) continue;
        if (!testTeamAssignments.has(teamId)) {
          testTeamAssignments.set(teamId, []);
        }
        testTeamAssignments.get(teamId)!.push({
          date: chosen.slot.date,
          startTime: chosen.slot.startTime,
        });
      }
    }

    return { success: true, assignments: testAssignments, totalScore };
  };

  // 7) Probar todas las ordenaciones y elegir la mejor
  // Primero intentar con restricciones estrictas
  let bestResult: { success: boolean; assignments: Map<number, Assignment>; totalScore: number } | null = null;

  for (const order of ordersToTry) {
    const result = tryAssignWithOrder(order, false);
    if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
      bestResult = result;
    }
  }

  // Si no se encontró solución con restricciones estrictas, intentar con restricciones relajadas
  // (solo para orden deportivo de grupos de 4, nunca para partidos consecutivos del mismo equipo)
  if (!bestResult || !bestResult.success) {
    console.log("No se encontró solución con restricciones estrictas, intentando con restricciones relajadas para orden deportivo...");
    for (const order of ordersToTry) {
      const result = tryAssignWithOrder(order, true);
      if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
        bestResult = result;
      }
    }
  }

  // Si aún no se encontró solución, generar más variaciones de orden
  if (!bestResult || !bestResult.success) {
    console.log("Generando más variaciones de orden...");
    // Generar más variaciones aleatorias
    const additionalOrders: GroupMatchPayload[][] = [];
    for (let i = 0; i < 5; i++) {
      const shuffled = [...baseOrder].sort(() => Math.random() - 0.5);
      additionalOrders.push(shuffled);
    }
    
    for (const order of additionalOrders) {
      const result = tryAssignWithOrder(order, true);
      if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
        bestResult = result;
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
  }

  return { success: true, assignments: Array.from(assignments.values()) };
}



