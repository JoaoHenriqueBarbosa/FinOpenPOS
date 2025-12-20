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

  // Constante para descanso mínimo
  const minSlotsBetweenMatches = 1; // Siempre mantener descanso mínimo

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
        // IMPORTANTE: Las restricciones solo se pueden validar si hay horarios disponibles definidos
        // porque las restricciones se basan en los IDs de los horarios disponibles
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

  // 7) Función de backtracking más inteligente que prueba múltiples candidatos
  const tryAssignWithBacktracking = (
    order: GroupMatchPayload[],
    relaxOrderRestrictions: boolean = false,
    maxDepth: number = 3, // Profundidad máxima de backtracking
    beamWidth: number = 5 // Número de candidatos a explorar en cada nivel
  ): { success: boolean; assignments: Map<number, Assignment>; totalScore: number } => {
    type State = {
      assignments: Map<number, Assignment>;
      usedSlots: Set<number>;
      teamAssignments: Map<number, Array<{ date: string; startTime: string }>>;
      matchIndex: number;
      score: number;
    };

    const backtrack = (state: State, depth: number): State | null => {
      if (state.matchIndex >= order.length) {
        return state; // Solución encontrada
      }

      if (depth > maxDepth) {
        return null; // Profundidad máxima alcanzada
      }

      const match = order[state.matchIndex];
      const matchIdx = matchesPayload.indexOf(match);
      if (matchIdx === -1) {
        return backtrack({ ...state, matchIndex: state.matchIndex + 1 }, depth);
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
        if (teamsInMatch.length > 0) {
          for (const teamId of teamsInMatch) {
            const assignedForTeam = state.teamAssignments.get(teamId) || [];
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

        // Calcular score
        let score = 0;
        score -= orderPenalty;

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
        return null; // No hay candidatos válidos
      }

      // Ordenar candidatos por score
      validCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.slotIndex - b.slotIndex;
      });

      // Probar los mejores candidatos (beam search)
      const candidatesToTry = validCandidates.slice(0, beamWidth);
      const results: State[] = [];

      for (const candidate of candidatesToTry) {
        const newAssignments = new Map(state.assignments);
        const newUsedSlots = new Set(state.usedSlots);
        const newTeamAssignments = new Map(state.teamAssignments);

        newUsedSlots.add(candidate.slotIndex);

        const endTime = calculateEndTime(
          candidate.slot.startTime,
          matchDurationMinutes
        );

        newAssignments.set(matchIdx, {
          matchIdx,
          date: candidate.slot.date,
          startTime: candidate.slot.startTime,
          endTime,
          slotIndex: candidate.slotIndex,
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
          teamAssignments: newTeamAssignments,
          matchIndex: state.matchIndex + 1,
          score: state.score + candidate.score,
        };

        const result = backtrack(newState, depth + 1);
        if (result) {
          results.push(result);
        }
      }

      if (results.length === 0) {
        return null;
      }

      // Retornar el mejor resultado
      results.sort((a, b) => b.score - a.score);
      return results[0];
    };

    const initialState: State = {
      assignments: new Map(),
      usedSlots: new Set(),
      teamAssignments: new Map(),
      matchIndex: 0,
      score: 0,
    };

    const result = backtrack(initialState, 0);
    if (result) {
      return { success: true, assignments: result.assignments, totalScore: result.score };
    }
    return { success: false, assignments: new Map(), totalScore: -Infinity };
  };

  // 8) Probar todas las ordenaciones con algoritmo mejorado
  // Primero intentar con restricciones estrictas usando el algoritmo greedy original (más rápido)
  let bestResult: { success: boolean; assignments: Map<number, Assignment>; totalScore: number } | null = null;

  console.log("Intentando asignación con algoritmo greedy...");
  for (const order of ordersToTry) {
    const result = tryAssignWithOrder(order, false);
    if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
      bestResult = result;
    }
  }

  // Si no se encontró solución, usar backtracking con restricciones estrictas
  if (!bestResult || !bestResult.success) {
    console.log("No se encontró solución con algoritmo greedy, intentando con backtracking (restricciones estrictas)...");
    for (const order of ordersToTry) {
      const result = tryAssignWithBacktracking(order, false, 5, 10);
      if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
        bestResult = result;
      }
    }
  }

  // Si aún no se encontró, intentar con restricciones relajadas usando backtracking
  if (!bestResult || !bestResult.success) {
    console.log("Intentando con restricciones relajadas y backtracking más profundo...");
    for (const order of ordersToTry) {
      const result = tryAssignWithBacktracking(order, true, 10, 15);
      if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
        bestResult = result;
      }
    }
  }

  // Si aún no se encontró, generar muchas más variaciones de orden y probar con backtracking
  if (!bestResult || !bestResult.success) {
    console.log("Generando variaciones adicionales y probando con backtracking exhaustivo...");
    const additionalOrders: GroupMatchPayload[][] = [];
    
    // Generar variaciones más inteligentes
    for (let i = 0; i < 20; i++) {
      // Mezclar solo los grupos de 3, manteniendo orden de grupos de 4
      const shuffledWithoutOrder = [...orderedMatchesWithoutOrder].sort(() => Math.random() - 0.5);
      additionalOrders.push([
        ...orderedMatches1_2,
        ...orderedMatches3_4,
        ...shuffledWithoutOrder,
      ]);
    }

    // También probar variaciones completas
    for (let i = 0; i < 10; i++) {
      const fullyShuffled = [...baseOrder].sort(() => Math.random() - 0.5);
      additionalOrders.push(fullyShuffled);
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

    for (const order of additionalOrders) {
      const result = tryAssignWithBacktracking(order, true, 15, 20);
      if (result.success && (!bestResult || result.totalScore > bestResult.totalScore)) {
        bestResult = result;
        console.log(`Solución encontrada con score: ${result.totalScore}`);
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



