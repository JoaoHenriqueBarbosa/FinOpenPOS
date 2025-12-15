// Helper para asignar fechas y horarios a partidos de fase de grupos
// siguiendo la heurística acordada:
// - Respeto de orden deportivo (match_order en grupos de 4)
// - Descanso mínimo por equipo (no dos turnos seguidos el mismo día)
// - Partidos de un mismo equipo en un día lo más compactos posible

export type ScheduleDay = {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
};

export type ScheduleConfig = {
  days: ScheduleDay[];
  matchDuration: number; // minutos entre partidos
  courtIds: number[]; // IDs de las canchas a usar
};

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

// Generar slots de tiempo a partir de días, duración y cantidad de canchas
export function generateTimeSlots(
  days: ScheduleDay[],
  matchDuration: number,
  numCourts: number
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

      // Un slot por cada cancha disponible
      for (let i = 0; i < numCourts; i++) {
        slots.push({
          date: day.date,
          startTime: `${String(slotStartH).padStart(2, "0")}:${String(
            slotStartM
          ).padStart(2, "0")}`,
          endTime: `${String(slotEndH).padStart(2, "0")}:${String(
            slotEndM
          ).padStart(2, "0")}`,
        });
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

// Asigna horarios directamente sobre el arreglo de matches (modificándolo)
export function scheduleGroupMatches(
  matchesPayload: GroupMatchPayload[],
  days: ScheduleDay[],
  matchDurationMinutes: number,
  courtIds: number[]
): SchedulerResult {
  if (!days.length || !courtIds.length) {
    return {
      success: false,
      error: "Configuración de horarios o canchas inválida",
    };
  }

  const timeSlots = generateTimeSlots(days, matchDurationMinutes, courtIds.length);

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

  // 5) Orden base: primero los de primera ronda (1-2), luego segunda ronda (3-4), luego grupos de 3
  const baseOrder: GroupMatchPayload[] = [
    ...orderedMatches1_2,  // Primero todos los partidos 1 y 2
    ...orderedMatches3_4,  // Luego todos los partidos 3 y 4 (pero se asignarán respetando el slot libre)
    ...orderedMatchesWithoutOrder,  // Finalmente grupos de 3
  ];

  // 6) Asignar partidos a slots respetando:
  // - descanso mínimo por equipo (no dos turnos seguidos)
  // - compactar los partidos de un mismo equipo lo máximo posible

  const assignments = new Map<number, Assignment>();
  const usedSlots = new Set<number>();

  // Mapa auxiliar: teamId -> lista de {date, startTime} ya asignados
  const teamAssignments = new Map<
    number,
    Array<{ date: string; startTime: string }>
  >();

  const minSlotsBetweenMatches = 1; // al menos 1 slot de diferencia (no seguidos)

  for (const match of baseOrder) {
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
      if (usedSlots.has(i)) continue;

      const slot = timeSlots[i];

      // 1) Verificar descanso mínimo por equipo en ese día
      // Solo verificar si el partido tiene equipos asignados
      let valid = true;

      const teamsInMatch = [match.team1_id, match.team2_id].filter(
        (id): id is number => id !== null
      );

      // Si el partido tiene equipos, verificar descanso mínimo
      if (teamsInMatch.length > 0) {
        for (const teamId of teamsInMatch) {
          const assignedForTeam = teamAssignments.get(teamId) || [];

          for (const prev of assignedForTeam) {
            if (prev.date !== slot.date) continue;

            // Buscar índice de prev slot
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
      // Si el partido no tiene equipos (match_order 3 o 4 en grupos de 4), no hay restricción de descanso por equipo

      if (!valid) continue;

      // 1.5) Validación especial para zonas de 4:
      // - Entre match_order 2 y 3 debe haber al menos 1 slot libre
      // - El partido 4 debe estar después del partido 3
      if (match.match_order === 3) {
        // Buscar el partido con match_order 2 del mismo grupo
        const match2 = matchesPayload.find(
          (m) =>
            m.tournament_group_id === match.tournament_group_id &&
            m.match_order === 2
        );

        if (match2) {
          const match2Idx = matchesPayload.indexOf(match2);
          const match2Assignment = assignments.get(match2Idx);

          if (match2Assignment) {
            // Solo validar si ambos partidos están en el mismo día
            if (slot.date === match2Assignment.date) {
              const match2StartMinutes = timeToMinutesOfDay(match2Assignment.startTime);
              const match2EndMinutes = match2StartMinutes + matchDurationMinutes;
              const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
              
              // El partido 3 debe empezar al menos un slot completo después de que termine el partido 2
              // Es decir: slotStartMinutes >= match2EndMinutes + matchDurationMinutes
              const minGapMinutes = matchDurationMinutes; // Un slot completo de descanso
              const gapMinutes = slotStartMinutes - match2EndMinutes;
              
              if (gapMinutes < minGapMinutes) {
                valid = false;
              }
            }
          }
        }
      }

      if (match.match_order === 4) {
        // Buscar el partido con match_order 3 del mismo grupo
        const match3 = matchesPayload.find(
          (m) =>
            m.tournament_group_id === match.tournament_group_id &&
            m.match_order === 3
        );

        if (match3) {
          const match3Idx = matchesPayload.indexOf(match3);
          const match3Assignment = assignments.get(match3Idx);

          if (match3Assignment) {
            // El partido 4 debe estar después del partido 3 (mismo día o día siguiente)
            if (slot.date === match3Assignment.date) {
              const match3StartMinutes = timeToMinutesOfDay(match3Assignment.startTime);
              const match3EndMinutes = match3StartMinutes + matchDurationMinutes;
              const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
              
              // El partido 4 debe empezar después de que termine el partido 3
              if (slotStartMinutes < match3EndMinutes) {
                valid = false;
              }
            } else if (slot.date < match3Assignment.date) {
              // No permitir asignar el partido 4 en un día anterior al partido 3
              valid = false;
            }
          } else {
            // Si el partido 3 aún no está asignado, no podemos asignar el 4
            // Esto asegura que el partido 3 se asigne primero
            valid = false;
          }
        }
      }

      if (!valid) continue;

      // 2) Calcular score para compactar partidos de un mismo equipo en el día
      let score = 0;

      // Bonus especial para match_order 2: priorizar slots que dejen espacio para el partido 3
      if (match.match_order === 2) {
        // Buscar el partido con match_order 3 del mismo grupo
        const match3 = matchesPayload.find(
          (m) =>
            m.tournament_group_id === match.tournament_group_id &&
            m.match_order === 3
        );

        if (match3) {
          // Calcular cuándo terminaría este partido si se asigna a este slot
          const matchEndMinutes = timeToMinutesOfDay(slot.startTime) + matchDurationMinutes;
          const nextSlotStartMinutes = matchEndMinutes + matchDurationMinutes; // Slot siguiente después del descanso
          
          // Verificar si hay slots disponibles después de este (para el partido 3)
          const availableSlotsAfter = timeSlots.filter(
            (s, idx) =>
              !usedSlots.has(idx) &&
              s.date === slot.date &&
              timeToMinutesOfDay(s.startTime) >= nextSlotStartMinutes
          );

          // Bonus si hay slots disponibles para el partido 3
          if (availableSlotsAfter.length > 0) {
            score += 10000; // Bonus grande para priorizar estos slots
          }
        }
      }

      // Bonus especial para match_order 3: priorizar slots que estén justo después del slot libre del partido 2
      if (match.match_order === 3) {
        const match2 = matchesPayload.find(
          (m) =>
            m.tournament_group_id === match.tournament_group_id &&
            m.match_order === 2
        );

        if (match2) {
          const match2Idx = matchesPayload.indexOf(match2);
          const match2Assignment = assignments.get(match2Idx);

          if (match2Assignment && slot.date === match2Assignment.date) {
            const match2StartMinutes = timeToMinutesOfDay(match2Assignment.startTime);
            const match2EndMinutes = match2StartMinutes + matchDurationMinutes;
            const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
            const gapMinutes = slotStartMinutes - match2EndMinutes;

            // Bonus si el gap es exactamente 1 slot (matchDurationMinutes)
            // Esto prioriza asignar el partido 3 justo después del slot libre
            const idealGap = matchDurationMinutes;
            if (gapMinutes === idealGap) {
              score += 5000; // Bonus grande para el slot ideal
            } else if (gapMinutes > idealGap && gapMinutes < idealGap * 3) {
              // Bonus menor si está cerca del ideal (pero no muy lejos)
              score += 2000;
            }
          }
        }
      }

      // Bonus especial para match_order 4: priorizar slots que estén justo después del partido 3
      if (match.match_order === 4) {
        const match3 = matchesPayload.find(
          (m) =>
            m.tournament_group_id === match.tournament_group_id &&
            m.match_order === 3
        );

        if (match3) {
          const match3Idx = matchesPayload.indexOf(match3);
          const match3Assignment = assignments.get(match3Idx);

          if (match3Assignment && slot.date === match3Assignment.date) {
            const match3StartMinutes = timeToMinutesOfDay(match3Assignment.startTime);
            const match3EndMinutes = match3StartMinutes + matchDurationMinutes;
            const slotStartMinutes = timeToMinutesOfDay(slot.startTime);
            const gapMinutes = slotStartMinutes - match3EndMinutes;

            // Bonus si está justo después del partido 3 (gap mínimo)
            if (gapMinutes >= 0 && gapMinutes < matchDurationMinutes * 2) {
              score += 3000; // Bonus para mantener los partidos 3 y 4 juntos
            }
          }
        }
      }

      // Solo calcular score de compactación si el partido tiene equipos asignados
      if (teamsInMatch.length > 0) {
        for (const teamId of teamsInMatch) {
          const assignedForTeam = teamAssignments.get(teamId) || [];
          // Si ya tiene partidos ese día, queremos que esté lo más cerca posible (en slots)
          const sameDayAssignments = assignedForTeam.filter(
            (a) => a.date === slot.date
          );

          if (sameDayAssignments.length > 0) {
            // Tomar el más cercano en tiempo como referencia
            let bestDistanceMinutes = Infinity;

            for (const a of sameDayAssignments) {
              const refMinutes = timeToMinutesOfDay(a.startTime);
              const currentMinutes = timeToMinutesOfDay(slot.startTime);
              const diff = Math.abs(currentMinutes - refMinutes);
              if (diff < bestDistanceMinutes) {
                bestDistanceMinutes = diff;
              }
            }

            // Mientras menor sea la distancia en minutos, mayor el score
            // (agregamos una constante grande para que siempre sea positivo)
            const maxReasonableGap = 6 * 60; // 6 horas
            const normalized =
              maxReasonableGap - Math.min(bestDistanceMinutes, maxReasonableGap);
            score += normalized;
          }
        }
      }
      // Si el partido no tiene equipos (match_order 3 o 4), el score se basa solo en otras consideraciones (orden, etc.)

      validCandidates.push({ slotIndex: i, score, slot });
    }

    if (!validCandidates.length) {
      return {
        success: false,
        error:
          "No se pudo asignar horarios para todos los partidos respetando el descanso mínimo. Intenta con más días/horarios disponibles o más canchas.",
      };
    }

    // Elegir el candidato con mayor score (mejor compactación). Si empatan, el más temprano.
    validCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.slotIndex - b.slotIndex;
    });

    const chosen = validCandidates[0];
    usedSlots.add(chosen.slotIndex);

    const endTime = calculateEndTime(
      chosen.slot.startTime,
      matchDurationMinutes
    );

    assignments.set(matchIdx, {
      matchIdx,
      date: chosen.slot.date,
      startTime: chosen.slot.startTime,
      endTime,
      slotIndex: chosen.slotIndex,
    });

    // Actualizar mapa por equipo
    for (const teamId of [match.team1_id, match.team2_id]) {
      if (teamId === null) continue;
      if (!teamAssignments.has(teamId)) {
        teamAssignments.set(teamId, []);
      }
      teamAssignments.get(teamId)!.push({
        date: chosen.slot.date,
        startTime: chosen.slot.startTime,
      });
    }
  }

  // 8) Aplicar las asignaciones al payload original
  for (const [idx, assignment] of Array.from(assignments.entries())) {
    const match = matchesPayload[idx];
    if (!match) continue;
    match.match_date = assignment.date;
    match.start_time = assignment.startTime;
    match.end_time = assignment.endTime;
  }

  return { success: true, assignments: Array.from(assignments.values()) };
}



