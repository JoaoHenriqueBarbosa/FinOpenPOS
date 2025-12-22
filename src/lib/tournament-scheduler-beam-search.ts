// Heurística Beam Search para grupos de 3 (tipo puzzle)
// Solo implementa scheduling para grupos de 3, NO grupos de 4 ni playoffs
// Usa Beam Search (búsqueda con ancho limitado) en lugar de backtracking completo

import type { ScheduleDay, AvailableSchedule } from "@/models/dto/tournament";
import type { GroupMatchPayload, Assignment, SchedulerResult, TimeSlot } from "./tournament-scheduler";
import { timeToMinutesOfDay, calculateEndTime, generateTimeSlots, slotViolatesRestriction } from "./tournament-scheduler";

// Patrones ordenados por prioridad (índices relativos sobre slots libres)
const PATTERNS = [
  [0, 2, 4],
  [0, 2, 5],
  [0, 3, 5],
  [0, 3, 6],
  [0, 2, 6],
  [0, 4, 6],
];

// Tipo para un grupo de 3
type Group3 = {
  groupId: number;
  matches: GroupMatchPayload[];
  teams: number[]; // IDs de los 3 equipos
};

// Estado de una solución parcial
type State = {
  usedSlots: Set<string>;              // slotId (índice como string)
  assignments: Map<string, string[]>;   // groupId → slotIds (3 índices como strings)
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

// Validación dura: verificar que 3 slots cumplen las reglas
function isValidSlotTriplet(
  slots: Slot[],
  matchDurationMs: number
): boolean {
  if (slots.length !== 3) return false;

  // Ordenar por datetime
  const sorted = [...slots].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  // Verificar descanso: slot2.start ≥ slot1.start + 2×matchDuration
  const slot1End = sorted[0].datetime.getTime() + matchDurationMs;
  const slot2Start = sorted[1].datetime.getTime();
  if (slot2Start < slot1End + matchDurationMs) {
    return false;
  }

  // Verificar descanso: slot3.start ≥ slot2.start + 2×matchDuration
  const slot2End = sorted[1].datetime.getTime() + matchDurationMs;
  const slot3Start = sorted[2].datetime.getTime();
  if (slot3Start < slot2End + matchDurationMs) {
    return false;
  }

  return true;
}

// Calcular score de un candidato
function calculateScore(
  patternIndex: number,
  slots: Slot[]
): number {
  // Score por prioridad de patrón
  const patternScore = (PATTERNS.length - patternIndex) * 1000;

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
  group: Group3,
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

  if (freeSlots.length < 3) {
    return []; // No hay suficientes slots libres
  }

  // Probar cada patrón
  for (let patternIdx = 0; patternIdx < PATTERNS.length; patternIdx++) {
    const pattern = PATTERNS[patternIdx];
    const maxOffset = Math.max(...pattern);

    // Para cada posible posición inicial en los slots libres
    // El patrón se aplica sobre freeSlots, no sobre índices absolutos
    // Ejemplo: patrón [0,2,4] desde startIdx=0 toma freeSlots[0], freeSlots[2], freeSlots[4]
    //          patrón [0,2,4] desde startIdx=1 toma freeSlots[1], freeSlots[3], freeSlots[5]
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
      if (!isValidSlotTriplet(candidateSlots, matchDurationMs)) {
        continue;
      }

      // Calcular score
      const score = calculateScore(patternIdx, candidateSlots);
      candidates.push({ slots: candidateSlots, patternIndex: patternIdx, score });
    }
  }

  // Si no encontramos candidatos con patrones y hay exactamente 3 slots libres,
  // intentar usar esos 3 slots directamente (útil cuando quedan pocos slots)
  // Esto maneja el caso donde el patrón [0,2,4] no se puede aplicar porque
  // freeSlots tiene solo 3 elementos, pero esos 3 slots pueden ser válidos
  if (candidates.length === 0 && freeSlots.length === 3) {
    const candidateSlots = [...freeSlots];
    if (isValidSlotTriplet(candidateSlots, matchDurationMs)) {
      // Usar score del patrón más alto como fallback (tratarlo como si fuera el mejor patrón)
      const fallbackScore = calculateScore(0, candidateSlots); // Usar score del patrón más prioritario
      candidates.push({ slots: candidateSlots, patternIndex: 0, score: fallbackScore });
    }
  }

  // Si aún no hay candidatos, generar todas las combinaciones de 3 slots válidas
  // (útil cuando los patrones no se pueden aplicar pero hay suficientes slots)
  if (candidates.length === 0 && freeSlots.length >= 3) {
    // Generar combinaciones de 3 slots
    for (let i = 0; i < freeSlots.length - 2; i++) {
      for (let j = i + 1; j < freeSlots.length - 1; j++) {
        for (let k = j + 1; k < freeSlots.length; k++) {
          const candidateSlots = [freeSlots[i], freeSlots[j], freeSlots[k]];
          if (isValidSlotTriplet(candidateSlots, matchDurationMs)) {
            // Usar score del patrón más bajo como fallback
            const fallbackScore = calculateScore(PATTERNS.length - 1, candidateSlots);
            candidates.push({ slots: candidateSlots, patternIndex: PATTERNS.length - 1, score: fallbackScore });
          }
        }
      }
    }
  }

  // Ordenar por score (mayor primero) y tomar los mejores
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, maxCandidates);
}

// Función principal de Beam Search con restricciones por grupo
function scheduleGroupsOf3WithRestrictions(
  groups: Group3[],
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
            const isValid = isValidSlotTriplet(sorted, matchDurationMs);
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
export function scheduleGroupsOf3(
  groups: Group3[],
  slots: Slot[],
  matchDurationMs: number,
  options?: BeamSearchOptions
): ScheduleResult {
  return scheduleGroupsOf3WithRestrictions(
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
  teamRestrictions?: Map<number, number[]>,
  onLog?: (message: string) => void
): Promise<SchedulerResult> {
  if (onLog) {
    onLog("🧩 Heurística Beam Search (Puzzle): Iniciando...");
    onLog("⚠️ Solo procesa grupos de 3 (grupos de 4 serán ignorados)");
  }

  if (!days.length || !courtIds.length) {
    return {
      success: false,
      error: "Configuración de horarios o canchas inválida",
      assignments: [],
    };
  }

  // 1. Filtrar solo grupos de 3 (excluir grupos de 4)
  const matchesByGroup = new Map<number, GroupMatchPayload[]>();
  for (const match of matchesPayload) {
    if (match.match_order !== undefined) {
      // Tiene match_order = grupo de 4, ignorar
      if (onLog) {
        onLog(`⚠️ Ignorando match con match_order (grupo de 4): grupo ${match.tournament_group_id}`);
      }
      continue;
    }
    if (!matchesByGroup.has(match.tournament_group_id)) {
      matchesByGroup.set(match.tournament_group_id, []);
    }
    matchesByGroup.get(match.tournament_group_id)!.push(match);
  }

  // Verificar que todos los grupos tengan exactamente 3 matches (grupos de 3)
  const groups3: Group3[] = [];
  for (const [groupId, matches] of matchesByGroup.entries()) {
    if (matches.length !== 3) {
      if (onLog) {
        onLog(`⚠️ Ignorando grupo ${groupId}: tiene ${matches.length} matches (esperado 3)`);
      }
      continue;
    }

    // Extraer equipos únicos del grupo
    const teams = new Set<number>();
    for (const match of matches) {
      if (match.team1_id !== null) teams.add(match.team1_id);
      if (match.team2_id !== null) teams.add(match.team2_id);
    }

    if (teams.size !== 3) {
      if (onLog) {
        onLog(`⚠️ Ignorando grupo ${groupId}: tiene ${teams.size} equipos únicos (esperado 3)`);
      }
      continue;
    }

    groups3.push({
      groupId,
      matches,
      teams: Array.from(teams),
    });
  }

  if (groups3.length === 0) {
    return {
      success: false,
      error: "No se encontraron grupos de 3 válidos para programar",
      assignments: [],
    };
  }

  if (onLog) {
    onLog(`📊 Encontrados ${groups3.length} grupos de 3 para programar`);
  }

  // 2. Generar slots
  const timeSlots = generateTimeSlots(days, matchDurationMinutes, courtIds.length, availableSchedules);
  
  if (onLog) {
    onLog(`📅 Total de slots generados: ${timeSlots.length}`);
  }

  if (timeSlots.length < groups3.length * 3) {
    return {
      success: false,
      error: `No hay suficientes slots. Necesito ${groups3.length * 3} slots pero solo hay ${timeSlots.length} disponibles.`,
      assignments: [],
    };
  }

  // 3. Convertir TimeSlots a Slots y ordenar por datetime
  const slots: Slot[] = timeSlots.map((ts, idx) => timeSlotToSlot(ts, idx));
  slots.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  // 4. Preparar información de restricciones por grupo
  // Las restricciones se validarán durante la generación de candidatos
  const groupRestrictions = new Map<number, Set<string>>(); // groupId → Set de slotIds restringidos
  if (teamRestrictions && availableSchedules && availableSchedules.length > 0) {
    for (const group of groups3) {
      const restrictedSlotIds = new Set<string>();
      for (const slot of slots) {
        const timeSlot: TimeSlot = {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        };
        // Verificar si algún equipo del grupo tiene restricción en este slot
        for (const teamId of group.teams) {
          const restrictedScheduleIds = teamRestrictions.get(teamId);
          if (slotViolatesRestriction(timeSlot, restrictedScheduleIds, availableSchedules)) {
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
  
  // Modificar scheduleGroupsOf3 para aceptar restricciones por grupo
  // Por ahora, pasamos todos los slots y validamos restricciones en generateCandidates
  const result = scheduleGroupsOf3WithRestrictions(
    groups3,
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
  const matchIndexMap = new Map<number, number>(); // groupId → matchIdx en matchesPayload

  // Crear mapa de matches por grupo
  for (let idx = 0; idx < matchesPayload.length; idx++) {
    const match = matchesPayload[idx];
    if (match.match_order === undefined) {
      // Es un grupo de 3
      const groupMatches = matchesByGroup.get(match.tournament_group_id) || [];
      if (groupMatches.length === 3) {
        // Encontrar el índice del match dentro del grupo
        const matchInGroupIdx = groupMatches.findIndex(m => 
          m.team1_id === match.team1_id && m.team2_id === match.team2_id
        );
        if (matchInGroupIdx !== -1) {
          matchIndexMap.set(match.tournament_group_id * 1000 + matchInGroupIdx, idx);
        }
      }
    }
  }

  // Aplicar asignaciones
  for (const [groupIdStr, slotIds] of result.assignments.entries()) {
    const groupId = Number(groupIdStr);
    const group = groups3.find(g => g.groupId === groupId);
    if (!group) continue;

    const groupMatches = matchesByGroup.get(groupId) || [];
    if (groupMatches.length !== 3 || slotIds.length !== 3) continue;

    // Ordenar slots por datetime para asignar en orden
    const assignedSlots = slotIds
      .map(id => slots.find(s => s.slotId === id))
      .filter((s): s is Slot => s !== undefined)
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    // Asignar cada match a un slot
    for (let i = 0; i < 3; i++) {
      const match = groupMatches[i];
      const slot = assignedSlots[i];
      if (!slot) continue;

      const matchIdx = matchesPayload.findIndex(m =>
        m.tournament_group_id === match.tournament_group_id &&
        m.team1_id === match.team1_id &&
        m.team2_id === match.team2_id
      );

      if (matchIdx === -1) continue;

      // Calcular courtId basado en el índice original del slot
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

      // Aplicar al payload
      matchesPayload[matchIdx].match_date = slot.date;
      matchesPayload[matchIdx].start_time = slot.startTime;
      matchesPayload[matchIdx].end_time = calculateEndTime(slot.startTime, matchDurationMinutes);
      matchesPayload[matchIdx].court_id = courtId;
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

