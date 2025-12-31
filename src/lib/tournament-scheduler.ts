// Helper para asignar fechas y horarios a partidos de fase de grupos
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
  physicalSlotId?: string; // Identificador único del slot físico (time + court)
};

export type Assignment = {
  matchIdx: number;
  date: string;
  startTime: string;
  endTime: string;
  slotIndex: number;
  courtId: number;
};

export type SchedulerResult = {
  success: boolean;
  error?: string;
  assignments: Assignment[];
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
  // Validación estricta: el slot completo debe estar dentro del horario disponible
  // Si el slot termina a las 00:00 (24:00), solo es válido si el horario disponible también termina a las 00:00
  // Si el horario disponible termina a las 22:00, un slot que termina a las 23:00 NO es válido
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
      let slotEndTimeStr: string;
      if (slotEndMinutes >= 24 * 60) {
        slotEndH = 0;
        slotEndM = 0;
        slotEndTimeStr = "00:00";
      } else {
        slotEndH = Math.floor(slotEndMinutes / 60);
        slotEndM = slotEndMinutes % 60;
        slotEndTimeStr = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;
      }

      // Crear un identificador único para el slot físico (sin incluir la fecha)
      const physicalSlotKey = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}-${slotEndTimeStr}`;
      
      const slot: TimeSlot = {
        date: day.date,
        startTime: `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`,
        endTime: slotEndTimeStr,
        physicalSlotId: physicalSlotKey,
      };

      // Si hay horarios disponibles configurados, filtrar slots que no coincidan
      // IMPORTANTE: No usar availableSchedules aquí porque los días ya definen los horarios disponibles
      // Los días en el payload ya son los horarios disponibles, así que todos los slots generados son válidos
      
      // Un slot por cada cancha disponible
      for (let i = 0; i < numCourts; i++) {
        slots.push(slot);
      }

      currentMinutes += matchDuration;
    }
  });

  return slots;
}

export function timeToMinutesOfDay(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  // Si la hora es 00:00, interpretarla como 24:00 (fin del día)
  if (hours === 0 && minutes === 0) {
    return 24 * 60; // 1440 minutos
  }
  return hours * 60 + minutes;
}

export function calculateEndTime(startTime: string, matchDurationMinutes: number): string {
  const [startH, startM] = startTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = startMinutes + matchDurationMinutes;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

// Verificar si un slot viola alguna restricción de un equipo
// restrictions es un array de rangos de fecha/hora que el equipo NO puede jugar
export function slotViolatesRestriction(
  slot: TimeSlot,
  restrictedSchedules: Array<{ date: string; start_time: string; end_time: string }> | undefined
): boolean {
  if (!restrictedSchedules || restrictedSchedules.length === 0) return false;

  // Verificar si el slot coincide con alguna restricción
  return restrictedSchedules.some((restriction) => {
    // El slot viola la restricción si:
    // 1. La fecha coincide
    // 2. El slot está dentro del rango de la restricción (start_time <= slot.start < end_time)
    if (slot.date !== restriction.date) return false;
    
    const slotStart = timeToMinutesOfDay(slot.startTime);
    const restrictionStart = timeToMinutesOfDay(restriction.start_time);
    const restrictionEnd = timeToMinutesOfDay(restriction.end_time);
    
    // Si end_time es 00:00, interpretarlo como 24:00 (fin del día)
    const restrictionEndMinutes = restrictionEnd === 0 ? 24 * 60 : restrictionEnd;
    
    return slotStart >= restrictionStart && slotStart < restrictionEndMinutes;
  });
}

// Asigna horarios directamente sobre el arreglo de matches (modificándolo)
export async function scheduleGroupMatches(
  matchesPayload: GroupMatchPayload[],
  days: ScheduleDay[],
  matchDurationMinutes: number,
  courtIds: number[],
  availableSchedules?: AvailableSchedule[],
  teamRestrictions?: Map<number, Array<{ date: string; start_time: string; end_time: string }>>, // teamId -> restrictedSchedules[]
  onLog?: (message: string) => void // Callback para logs en tiempo real
): Promise<SchedulerResult> {
  // Usar la heurística Beam Search (Puzzle) por defecto
  const { scheduleGroupMatchesBeamSearch } = await import("./tournament-scheduler-beam-search");
  return scheduleGroupMatchesBeamSearch(
    matchesPayload,
    days,
    matchDurationMinutes,
    courtIds,
    availableSchedules,
    teamRestrictions,
    onLog
  );
}
