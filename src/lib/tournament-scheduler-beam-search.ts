// Heurística Beam Search para grupos de 3 y 4 (tipo puzzle)
// Usa Beam Search (búsqueda con ancho limitado) en lugar de backtracking completo

import type { ScheduleDay, AvailableSchedule } from "@/models/dto/tournament";
import type { GroupMatchPayload, Assignment, SchedulerResult, TimeSlot } from "./tournament-scheduler";
import { timeToMinutesOfDay, calculateEndTime, generateTimeSlots, slotViolatesRestriction } from "./tournament-scheduler";

// Patrones para grupos de 3 (ordenados por prioridad)
const PATTERNS_3 = [
  [0, 2, 4],
  [0, 2, 5],
  [0, 3, 5],
  [0, 3, 6],
  [0, 2, 6],
  [0, 4, 6],
];

// Patrones para grupos de 4 (ordenados por prioridad)
const PATTERNS_4 = [
  [0, 1, 3, 4],
  [0, 1, 3, 5],
  [0, 1, 3, 6],
  [0, 1, 4, 5],
  [0, 1, 4, 6],
  [0, 1, 5, 6],
];

// Tipo para un grupo (puede ser de 3 o 4)
type Group = {
  groupId: number;
  matches: GroupMatchPayload[];
  teams: number[]; // IDs de los equipos
  size: 3 | 4; // Tamaño del grupo
};

// Estado de una solución parcial
type State = {
  usedSlots: Set<string>;              // slotId (índice como string)
  assignments: Map<string, string[]>;   // groupId → slotIds (3 o 4 índices como strings)
  score: number;
};

// Slot con información completa
type Slot = {
  index: number;
  date: string;
  startTime: string;
  endTime: string;
  datetime: Date; // Para comparaciones de tiempo
  slotId: string; // Identificador único (índice como string)
};

// Resultado del scheduler
type ScheduleResult =
  | { ok: true; assignments: Map<string, string[]> }
  | { ok: false; reason: string };

// Opciones del scheduler
type BeamSearchOptions = {
  beamWidth?: number;
  maxCandidates?: number;
};

// Convertir TimeSlot a Slot con datetime calculado
function timeSlotToSlot(timeSlot: TimeSlot, index: number): Slot {
  const dateStr = typeof timeSlot.date === 'string' 
    ? timeSlot.date 
    : timeSlot.date instanceof Date 
      ? timeSlot.date.toISOString().split('T')[0]
      : String(timeSlot.date);
  
  const datetime = new Date(`${dateStr}T${timeSlot.startTime}:00`);
  
  return {
    index,
    date: dateStr,
    startTime: timeSlot.startTime,
    endTime: timeSlot.endTime,
    datetime,
    slotId: String(index),
  };
}

// Validación dura: verificar que slots cumplen las reglas de descanso
// Para grupos de 3: necesita 3 slots
// Para grupos de 4: necesita 4 slots
function isValidSlotGroup(
  slots: Slot[],
  matchDurationMs: number,
  groupSize: 3 | 4
): boolean {
  if (slots.length !== groupSize) return false;

  // Ordenar por datetime
  const sorted = [...slots].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  // Verificar descanso entre cada par consecutivo
  // Regla: slot[i+1].start ≥ slot[i].end + matchDuration (descanso de 2×matchDuration)
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = sorted[i].datetime.getTime() + matchDurationMs;
    const nextStart = sorted[i + 1].datetime.getTime();
    if (nextStart < currentEnd + matchDurationMs) {
      return false;
    }
  }

  return true;
}

// Calcular score de un candidato
function calculateScore(
  patternIndex: number,
  slots: Slot[],
  patternsLength: number
): number {
  // Score por prioridad de patrón
  const patternScore = (patternsLength - patternIndex) * 1000;

  // Penalizar span del grupo (último − primero) en minutos
  const sorted = [...slots].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  const first = sorted[0].datetime;
  const last = sorted[sorted.length - 1].datetime;
  const spanMinutes = (last.getTime() - first.getTime()) / (1000 * 60);
  const spanPenalty = spanMinutes;

  return patternScore - spanPenalty;
}

// Generar candidatos para un grupo usando patrones
function generateCandidates(
  group: Group,
  availableSlots: Slot[],
  usedSlotIds: Set<string>,
  matchDurationMs: number,
  maxCandidates: number,
  restrictedSlotIds?: Set<string>
): Array<{ slots: Slot[]; patternIndex: number; score: number }> {
  const candidates: Array<{ slots: Slot[]; patternIndex: number; score: number }> = [];

  // Filtrar slots disponibles (no usados y no restringidos para este grupo)
  const freeSlots = availableSlots.filter(slot => {
    if (usedSlotIds.has(slot.slotId)) return false;
    if (restrictedSlotIds && restrictedSlotIds.has(slot.slotId)) return false;
    return true;
  });

  if (freeSlots.length < group.size) {
    return []; // No hay suficientes slots libres
  }

  // Seleccionar patrones según el tamaño del grupo
  const patterns = group.size === 3 ? PATTERNS_3 : PATTERNS_4;

  // Probar cada patrón
  for (let patternIdx = 0; patternIdx < patterns.length; patternIdx++) {
    const pattern = patterns[patternIdx];
    const maxOffset = Math.max(...pattern);

    // Para cada posible posición inicial en los slots libres
    // El patrón se aplica sobre freeSlots, no sobre índices absolutos
    for (let startIdx = 0; startIdx + maxOffset < freeSlots.length; startIdx++) {
      // Aplicar el patrón desde esta posición
      const candidateSlots: Slot[] = [];
      let valid = true;

      for (const offset of pattern) {
        const slotIdx = startIdx + offset;
        if (slotIdx >= freeSlots.length) {
          valid = false;
          break;
        }
        candidateSlots.push(freeSlots[slotIdx]);
      }

      if (!valid) continue;

      // Validar reglas duras
      if (!isValidSlotGroup(candidateSlots, matchDurationMs, group.size)) {
        continue;
      }

      // Calcular score
      const score = calculateScore(patternIdx, candidateSlots, patterns.length);
      candidates.push({ slots: candidateSlots, patternIndex: patternIdx, score });
    }
  }

  // Si no encontramos candidatos con patrones y hay exactamente el número necesario de slots libres,
  // intentar usar esos slots directamente (útil cuando quedan pocos slots)
  if (candidates.length === 0 && freeSlots.length === group.size) {
    const candidateSlots = [...freeSlots];
    if (isValidSlotGroup(candidateSlots, matchDurationMs, group.size)) {
      // Usar score del patrón más alto como fallback
      const fallbackScore = calculateScore(0, candidateSlots, patterns.length);
      candidates.push({ slots: candidateSlots, patternIndex: 0, score: fallbackScore });
    }
  }

  // Si aún no hay candidatos, generar todas las combinaciones válidas
  // (útil cuando los patrones no se pueden aplicar pero hay suficientes slots)
  if (candidates.length === 0 && freeSlots.length >= group.size) {
    // Generar combinaciones de N slots (donde N = group.size)
    const generateCombinations = (arr: Slot[], n: number, start: number = 0, current: Slot[] = []): void => {
      if (current.length === n) {
        if (isValidSlotGroup(current, matchDurationMs, group.size)) {
          const fallbackScore = calculateScore(patterns.length - 1, current, patterns.length);
          candidates.push({ slots: [...current], patternIndex: patterns.length - 1, score: fallbackScore });
        }
        return;
      }
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i]);
        generateCombinations(arr, n, i + 1, current);
        current.pop();
      }
    };
    generateCombinations(freeSlots, group.size);
  }

  // Ordenar por score (mayor primero) y tomar los mejores
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, maxCandidates);
}

// Función principal de Beam Search con restricciones por grupo
function scheduleGroupsWithRestrictions(
  groups: Group[],
  slots: Slot[],
  matchDurationMs: number,
  groupRestrictions: Map<number, Set<string>>,
  options?: BeamSearchOptions
): ScheduleResult {
  const beamWidth = options?.beamWidth ?? 5;
  const maxCandidates = options?.maxCandidates ?? 20;

  // Inicializar estados
  let states: State[] = [{
    usedSlots: new Set(),
    assignments: new Map(),
    score: 0,
  }];

  // Procesar cada grupo
  for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
    const group = groups[groupIdx];
    const newStates: State[] = [];
    const restrictedSlotIds = groupRestrictions.get(group.groupId);

    // Para cada estado actual, generar candidatos
    for (const state of states) {
      const candidates = generateCandidates(
        group,
        slots,
        state.usedSlots,
        matchDurationMs,
        maxCandidates,
        restrictedSlotIds
      );

      // Debug: si no hay candidatos, mostrar información
      if (candidates.length === 0) {
        const freeSlots = slots.filter(slot => !state.usedSlots.has(slot.slotId));
        console.log(`[Beam Search] Grupo ${group.groupId}: No hay candidatos válidos`);
        console.log(`  Slots libres: ${freeSlots.length}`);
        console.log(`  Slots usados: ${state.usedSlots.size}`);
        if (freeSlots.length >= 3) {
          // Verificar por qué no son válidos
          for (let i = 0; i < Math.min(3, freeSlots.length); i++) {
            console.log(`  Slot libre ${i}: ${freeSlots[i].date} ${freeSlots[i].startTime}`);
          }
          // Si hay exactamente 3, verificar si son válidos
          if (freeSlots.length === 3) {
            const sorted = [...freeSlots].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
            const isValid = isValidSlotGroup(sorted, matchDurationMs, 3);
            console.log(`  ¿Son válidos los 3 slots?: ${isValid}`);
            if (!isValid) {
              const slot1End = sorted[0].datetime.getTime() + matchDurationMs;
              const slot2Start = sorted[1].datetime.getTime();
              const gap1 = (slot2Start - slot1End) / (1000 * 60);
              const requiredGap = (matchDurationMs * 2) / (1000 * 60);
              console.log(`  Gap 1->2: ${gap1} minutos (necesita ${requiredGap})`);
            }
          }
        }
      }

      if (candidates.length === 0) {
        // No hay candidatos válidos para este grupo con este estado
        continue;
      }

      // Construir nuevos estados con cada candidato
      for (const candidate of candidates) {
        const newUsedSlots = new Set(state.usedSlots);
        const newAssignments = new Map(state.assignments);
        const slotIds: string[] = [];

        // Marcar slots como usados
        for (const slot of candidate.slots) {
          newUsedSlots.add(slot.slotId);
          slotIds.push(slot.slotId);
        }

        // Agregar asignación del grupo
        newAssignments.set(String(group.groupId), slotIds);

        // Nuevo estado con score acumulado
        const newState: State = {
          usedSlots: newUsedSlots,
          assignments: newAssignments,
          score: state.score + candidate.score,
        };

        newStates.push(newState);
      }
    }

    // Si no hay nuevos estados, fallar explícitamente
    if (newStates.length === 0) {
      return {
        ok: false,
        reason: `No se pudo asignar slots para el grupo ${group.groupId} (grupo ${groupIdx + 1}/${groups.length})`,
      };
    }

    // Ordenar por score y quedarse con los K mejores (beam width)
    newStates.sort((a, b) => b.score - a.score);
    states = newStates.slice(0, beamWidth);
  }

  // Devolver el mejor estado
  if (states.length === 0) {
    return {
      ok: false,
      reason: "No se encontró ninguna solución",
    };
  }

  const bestState = states[0];
  return {
    ok: true,
    assignments: bestState.assignments,
  };
}

// Función principal de Beam Search (sin restricciones, para compatibilidad)
export function scheduleGroups(
  groups: Group[],
  slots: Slot[],
  matchDurationMs: number,
  options?: BeamSearchOptions
): ScheduleResult {
  return scheduleGroupsWithRestrictions(
    groups,
    slots,
    matchDurationMs,
    new Map(), // Sin restricciones
    options
  );
}

// Función wrapper para integrar con el sistema existente
export async function scheduleGroupMatchesBeamSearch(
  matchesPayload: GroupMatchPayload[],
  days: ScheduleDay[],
  matchDurationMinutes: number,
  courtIds: number[],
  availableSchedules?: AvailableSchedule[],
  teamRestrictions?: Map<number, Array<{ date: string; start_time: string; end_time: string }>>,
  onLog?: (message: string) => void
): Promise<SchedulerResult> {
  if (onLog) {
    onLog("🧩 Heurística Beam Search (Puzzle): Iniciando...");
    onLog("📋 Procesando grupos de 3 y 4");
  }

  if (!days.length || !courtIds.length) {
    return {
      success: false,
      error: "Configuración de horarios o canchas inválida",
      assignments: [],
    };
  }

  // 1. Agrupar matches por grupo
  const matchesByGroup = new Map<number, GroupMatchPayload[]>();
  for (const match of matchesPayload) {
    if (!matchesByGroup.has(match.tournament_group_id)) {
      matchesByGroup.set(match.tournament_group_id, []);
    }
    matchesByGroup.get(match.tournament_group_id)!.push(match);
  }

  // 2. Identificar grupos de 3 y 4
  const groups: Group[] = [];
  for (const [groupId, matches] of matchesByGroup.entries()) {
    // Extraer equipos únicos del grupo
    const teams = new Set<number>();
    for (const match of matches) {
      if (match.team1_id !== null) teams.add(match.team1_id);
      if (match.team2_id !== null) teams.add(match.team2_id);
    }

    // Determinar tamaño del grupo basado en matches y match_order
    let groupSize: 3 | 4;
    if (matches.some(m => m.match_order !== undefined)) {
      // Tiene match_order = grupo de 4
      groupSize = 4;
      if (matches.length !== 4) {
        if (onLog) {
          onLog(`⚠️ Ignorando grupo ${groupId}: tiene match_order pero ${matches.length} matches (esperado 4)`);
        }
        continue;
      }
      if (teams.size !== 4) {
        if (onLog) {
          onLog(`⚠️ Ignorando grupo ${groupId}: tiene ${teams.size} equipos únicos (esperado 4 para grupo de 4)`);
        }
        continue;
      }
    } else {
      // No tiene match_order = grupo de 3
      groupSize = 3;
      if (matches.length !== 3) {
        if (onLog) {
          onLog(`⚠️ Ignorando grupo ${groupId}: tiene ${matches.length} matches (esperado 3)`);
        }
        continue;
      }
      if (teams.size !== 3) {
        if (onLog) {
          onLog(`⚠️ Ignorando grupo ${groupId}: tiene ${teams.size} equipos únicos (esperado 3)`);
        }
        continue;
      }
    }

    groups.push({
      groupId,
      matches,
      teams: Array.from(teams),
      size: groupSize,
    });
  }

  if (groups.length === 0) {
    return {
      success: false,
      error: "No se encontraron grupos válidos (de 3 o 4) para programar",
      assignments: [],
    };
  }

  const groupsOf3 = groups.filter(g => g.size === 3).length;
  const groupsOf4 = groups.filter(g => g.size === 4).length;
  if (onLog) {
    onLog(`📊 Encontrados ${groups.length} grupos para programar: ${groupsOf3} de 3, ${groupsOf4} de 4`);
  }

  // 2. Generar slots
  const timeSlots = generateTimeSlots(days, matchDurationMinutes, courtIds.length, availableSchedules);
  
  if (onLog) {
    onLog(`📅 Total de slots generados: ${timeSlots.length}`);
  }

  // Calcular slots necesarios
  const requiredSlots = groups.reduce((sum, g) => sum + g.size, 0);
  if (timeSlots.length < requiredSlots) {
    return {
      success: false,
      error: `No hay suficientes slots. Necesito ${requiredSlots} slots pero solo hay ${timeSlots.length} disponibles.`,
      assignments: [],
    };
  }

  // 3. Convertir TimeSlots a Slots y ordenar por datetime
  const slots: Slot[] = timeSlots.map((ts, idx) => timeSlotToSlot(ts, idx));
  slots.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  // 4. Preparar información de restricciones por grupo
  // Las restricciones se validarán durante la generación de candidatos
  const groupRestrictions = new Map<number, Set<string>>(); // groupId → Set de slotIds restringidos
  if (teamRestrictions) {
    for (const group of groups) {
      const restrictedSlotIds = new Set<string>();
      for (const slot of slots) {
        const timeSlot: TimeSlot = {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        };
        // Verificar si algún equipo del grupo tiene restricción en este slot
        for (const teamId of group.teams) {
          const restrictedSchedules = teamRestrictions.get(teamId);
          if (slotViolatesRestriction(timeSlot, restrictedSchedules)) {
            restrictedSlotIds.add(slot.slotId);
            break; // Solo necesitamos saber que al menos un equipo tiene restricción
          }
        }
      }
      groupRestrictions.set(group.groupId, restrictedSlotIds);
    }
  }

  // 5. Ejecutar Beam Search con validación de restricciones por grupo
  const matchDurationMs = matchDurationMinutes * 60 * 1000;
  
  const result = scheduleGroupsWithRestrictions(
    groups,
    slots,
    matchDurationMs,
    groupRestrictions,
    {
      beamWidth: 10,
      maxCandidates: 30,
    }
  );

  if (!result.ok) {
    return {
      success: false,
      error: result.reason,
      assignments: [],
    };
  }

  if (onLog) {
    onLog(`✅ Beam Search completado: ${result.assignments.size} grupos asignados`);
  }

  // 6. Convertir asignaciones a formato Assignment[]
  const assignments: Assignment[] = [];

  // Aplicar asignaciones
  for (const [groupIdStr, slotIds] of result.assignments.entries()) {
    const groupId = Number(groupIdStr);
    const group = groups.find(g => g.groupId === groupId);
    if (!group) continue;

    const groupMatches = matchesByGroup.get(groupId) || [];
    if (groupMatches.length !== group.size || slotIds.length !== group.size) continue;

    // Ordenar slots por datetime para asignar en orden
    const assignedSlots = slotIds
      .map(id => slots.find(s => s.slotId === id))
      .filter((s): s is Slot => s !== undefined)
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    // Para grupos de 3: asignar en orden de matches
    // Para grupos de 4: asignar según match_order (1,2,3,4)
    if (group.size === 3) {
      // Asignar cada match a un slot en orden
      for (let i = 0; i < 3; i++) {
        const match = groupMatches[i];
        const slot = assignedSlots[i];
        if (!slot) continue;

        const matchIdx = matchesPayload.findIndex(m =>
          m.tournament_group_id === match.tournament_group_id &&
          m.team1_id === match.team1_id &&
          m.team2_id === match.team2_id &&
          m.match_order === undefined
        );

        if (matchIdx === -1) continue;

        const originalSlotIndex = slot.index;
        const courtId = courtIds[originalSlotIndex % courtIds.length];

        const assignment: Assignment = {
          matchIdx,
          date: slot.date,
          startTime: slot.startTime,
          endTime: calculateEndTime(slot.startTime, matchDurationMinutes),
          slotIndex: originalSlotIndex,
          courtId,
        };

        assignments.push(assignment);

        matchesPayload[matchIdx].match_date = slot.date;
        matchesPayload[matchIdx].start_time = slot.startTime;
        matchesPayload[matchIdx].end_time = calculateEndTime(slot.startTime, matchDurationMinutes);
        matchesPayload[matchIdx].court_id = courtId;
      }
    } else if (group.size === 4) {
      // Para grupos de 4: asignar según match_order
      // match_order 1 y 2 → primeros 2 slots
      // match_order 3 y 4 → últimos 2 slots
      const matchesOrder1_2 = groupMatches.filter(m => m.match_order === 1 || m.match_order === 2)
        .sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0));
      const matchesOrder3_4 = groupMatches.filter(m => m.match_order === 3 || m.match_order === 4)
        .sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0));

      // Asignar match_order 1 y 2 a los primeros 2 slots
      for (let i = 0; i < matchesOrder1_2.length && i < 2; i++) {
        const match = matchesOrder1_2[i];
        const slot = assignedSlots[i];
        if (!slot) continue;

        const matchIdx = matchesPayload.findIndex(m =>
          m.tournament_group_id === match.tournament_group_id &&
          m.match_order === match.match_order
        );

        if (matchIdx === -1) continue;

        const originalSlotIndex = slot.index;
        const courtId = courtIds[originalSlotIndex % courtIds.length];

        const assignment: Assignment = {
          matchIdx,
          date: slot.date,
          startTime: slot.startTime,
          endTime: calculateEndTime(slot.startTime, matchDurationMinutes),
          slotIndex: originalSlotIndex,
          courtId,
        };

        assignments.push(assignment);

        matchesPayload[matchIdx].match_date = slot.date;
        matchesPayload[matchIdx].start_time = slot.startTime;
        matchesPayload[matchIdx].end_time = calculateEndTime(slot.startTime, matchDurationMinutes);
        matchesPayload[matchIdx].court_id = courtId;
      }

      // Asignar match_order 3 y 4 a los últimos 2 slots
      for (let i = 0; i < matchesOrder3_4.length && i < 2; i++) {
        const match = matchesOrder3_4[i];
        const slot = assignedSlots[i + 2]; // Slots 2 y 3 (índices 2 y 3)
        if (!slot) continue;

        const matchIdx = matchesPayload.findIndex(m =>
          m.tournament_group_id === match.tournament_group_id &&
          m.match_order === match.match_order
        );

        if (matchIdx === -1) continue;

        const originalSlotIndex = slot.index;
        const courtId = courtIds[originalSlotIndex % courtIds.length];

        const assignment: Assignment = {
          matchIdx,
          date: slot.date,
          startTime: slot.startTime,
          endTime: calculateEndTime(slot.startTime, matchDurationMinutes),
          slotIndex: originalSlotIndex,
          courtId,
        };

        assignments.push(assignment);

        matchesPayload[matchIdx].match_date = slot.date;
        matchesPayload[matchIdx].start_time = slot.startTime;
        matchesPayload[matchIdx].end_time = calculateEndTime(slot.startTime, matchDurationMinutes);
        matchesPayload[matchIdx].court_id = courtId;
      }
    }
  }

  if (onLog) {
    onLog(`✅ ${assignments.length} partidos asignados exitosamente`);
  }

  return {
    success: true,
    assignments,
  };
}

