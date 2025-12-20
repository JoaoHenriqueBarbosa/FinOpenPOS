"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScheduleDaysEditor, type ScheduleDay as ScheduleDayEditor } from "@/components/schedule-days-editor";
import type { ScheduleDay, ScheduleConfig } from "@/models/dto/tournament";

export type { ScheduleDay, ScheduleConfig };

type TournamentScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: ScheduleConfig) => void;
  matchCount: number; // cantidad de partidos a programar
  tournamentMatchDuration?: number; // duración del partido del torneo (en minutos)
  availableSchedules?: Array<{ date: string; start_time: string; end_time: string }>; // Horarios disponibles del torneo para pre-llenar
};

import type { CourtDTO } from "@/models/dto/court";

// Inicializar días desde horarios disponibles si existen
function getInitialDays(availableSchedules: Array<{ date: string; start_time: string; end_time: string }>): ScheduleDayEditor[] {
  if (availableSchedules.length > 0) {
    return availableSchedules.map((schedule) => ({
      date: schedule.date,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
    }));
  }
  // Si no hay horarios disponibles, usar valores por defecto
  return [
    {
      date: "",
      startTime: "18:00",
      endTime: "22:00",
    },
  ];
}

export function TournamentScheduleDialog({
  open,
  onOpenChange,
  onConfirm,
  matchCount,
  tournamentMatchDuration = 60,
  error = null,
  isLoading = false,
  availableSchedules = [],
}: TournamentScheduleDialogProps) {
  const [days, setDays] = useState<ScheduleDayEditor[]>(() => getInitialDays(availableSchedules));
  const [matchDuration, setMatchDuration] = useState<number>(tournamentMatchDuration);
  const [courts, setCourts] = useState<CourtDTO[]>([]);
  const [selectedCourtIds, setSelectedCourtIds] = useState<number[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);

  // Estabilizar availableSchedules para evitar loops infinitos
  const availableSchedulesKey = useMemo(() => {
    return availableSchedules.map(s => `${s.date}-${s.start_time}-${s.end_time}`).join('|');
  }, [availableSchedules]);

  // Resetear matchDuration y días cuando cambia el valor del torneo o se abre el diálogo
  useEffect(() => {
    if (open) {
      setMatchDuration(tournamentMatchDuration);
      // Si hay horarios disponibles, pre-llenar los días
      setDays(getInitialDays(availableSchedules));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tournamentMatchDuration, availableSchedulesKey]);

  // Cargar canchas al abrir el diálogo
  useEffect(() => {
    if (open) {
      setLoadingCourts(true);
      fetch("/api/courts?onlyActive=true")
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch courts");
          }
          return res.json();
        })
        .then((data: CourtDTO[] | { error?: string }) => {
          // Asegurar que sea un array
          const courtsArray = Array.isArray(data) ? data : [];
          setCourts(courtsArray);
          // Seleccionar todas las canchas activas por defecto
          setSelectedCourtIds(courtsArray.map((c) => c.id));
        })
        .catch((err) => {
          console.error("Error fetching courts:", err);
          setCourts([]);
          setSelectedCourtIds([]);
        })
        .finally(() => {
          setLoadingCourts(false);
        });
    }
  }, [open]);

  const handleDaysChange = (newDays: ScheduleDayEditor[]) => {
    setDays(newDays);
  };

  const handleConfirm = () => {
    // Validar que todos los días tengan fecha
    if (days.some((d) => !d.date)) {
      alert("Todos los días deben tener una fecha");
      return;
    }

    // Validar que todos los días tengan fecha
    if (days.some((d) => !d.date)) {
      alert("Todos los días deben tener una fecha");
      return;
    }

    // Validar que startTime < endTime para cada día
    // Si endTime es 00:00, interpretarlo como 24:00 (fin del día)
    if (days.some((d) => {
      const [startH, startM] = d.startTime.split(":").map(Number);
      const [endH, endM] = d.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      // Si la hora de fin es 00:00, interpretarla como 24:00 (fin del día)
      const endMinutes = (endH === 0 && endM === 0) ? 24 * 60 : endH * 60 + endM;
      return startMinutes >= endMinutes;
    })) {
      alert("La hora de inicio debe ser anterior a la hora de fin");
      return;
    }

    // Validar que haya al menos una cancha seleccionada
    if (selectedCourtIds.length === 0) {
      alert("Debes seleccionar al menos una cancha");
      return;
    }

    // Convertir ScheduleDayEditor[] a ScheduleDay[] para el callback
    const scheduleDays: ScheduleDay[] = days.map((d) => ({
      date: d.date,
      startTime: d.startTime,
      endTime: d.endTime,
    }));
    onConfirm({ days: scheduleDays, matchDuration, courtIds: selectedCourtIds });
    // NO cerrar el dialog aquí - el componente padre lo cerrará cuando termine exitosamente
  };

  const toggleCourt = (courtId: number) => {
    setSelectedCourtIds((prev) =>
      prev.includes(courtId)
        ? prev.filter((id) => id !== courtId)
        : [...prev, courtId]
    );
  };

  // Calcular slots disponibles (considerando las canchas seleccionadas)
  const calculateAvailableSlots = () => {
    const numCourts = selectedCourtIds.length;
    if (numCourts === 0) return 0;

    let totalSlots = 0;
    days.forEach((day) => {
      const [startH, startM] = day.startTime.split(":").map(Number);
      const [endH, endM] = day.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      // Si la hora de fin es 00:00, interpretarla como 24:00 (fin del día)
      const endMinutes = (endH === 0 && endM === 0) ? 24 * 60 : endH * 60 + endM;
      const durationMinutes = endMinutes - startMinutes;
      const slotsPerDay = Math.floor(durationMinutes / matchDuration);
      totalSlots += slotsPerDay * numCourts;
    });
    return totalSlots;
  };

  const availableSlots = calculateAvailableSlots();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar horarios de partidos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Canchas */}
          <div className="space-y-2">
            <Label>Canchas a usar</Label>
            {loadingCourts ? (
              <p className="text-sm text-muted-foreground">Cargando canchas...</p>
            ) : !Array.isArray(courts) || courts.length === 0 ? (
              <p className="text-sm text-red-600">
                No hay canchas activas. Creá al menos una cancha primero.
              </p>
            ) : (
              <div className="space-y-2">
                {courts.map((court) => (
                  <div key={court.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`court-${court.id}`}
                      checked={selectedCourtIds.includes(court.id)}
                      onCheckedChange={() => toggleCourt(court.id)}
                    />
                    <Label
                      htmlFor={`court-${court.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {court.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Duración de partidos */}
          <div className="space-y-2">
            <Label>Duración estimada de partidos (minutos)</Label>
            <Input
              type="number"
              min="30"
              step="15"
              value={matchDuration}
              onChange={(e) => setMatchDuration(Number(e.target.value))}
            />
          </div>

          {/* Días */}
          <div className="space-y-3">
            <Label>Días disponibles</Label>
            <ScheduleDaysEditor
              days={days}
              onChange={handleDaysChange}
              showDayOfWeek={false}
            />
          </div>

          {/* Resumen y vista previa de slots */}
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Partidos a programar: <span className="font-bold">{matchCount}</span>
              </p>
              <p className="text-sm">
                Slots disponibles: <span className="font-bold">{availableSlots}</span>
              </p>
              {availableSlots < matchCount && (
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ No hay suficientes slots. Agregá más días u horarios.
                </p>
              )}
            </div>

            {/* Vista previa de slots generados */}
            {selectedCourtIds.length > 0 && days.some((d) => d.date) && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium mb-2">Vista previa de slots generados:</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {days
                    .filter((d) => d.date)
                    .map((day, dayIndex) => {
                      const [startH, startM] = day.startTime.split(":").map(Number);
                      const [endH, endM] = day.endTime.split(":").map(Number);
                      const startMinutes = startH * 60 + startM;
                      // Si la hora de fin es 00:00, interpretarla como 24:00 (fin del día)
                      const endMinutes = (endH === 0 && endM === 0) ? 24 * 60 : endH * 60 + endM;

                      // Generar slots para este día
                      const slotsForDay: Array<{ time: string; courtName: string; endTime: string }> = [];
                      let currentMinutes = startMinutes;

                      while (currentMinutes + matchDuration <= endMinutes) {
                        const slotStartH = Math.floor(currentMinutes / 60);
                        const slotStartM = currentMinutes % 60;
                        const slotEndMinutes = currentMinutes + matchDuration;
                        
                        // Calcular hora de fin del slot
                        let slotEndH: number;
                        let slotEndM: number;
                        if (slotEndMinutes >= 24 * 60) {
                          slotEndH = 0;
                          slotEndM = 0;
                        } else {
                          slotEndH = Math.floor(slotEndMinutes / 60);
                          slotEndM = slotEndMinutes % 60;
                        }
                        
                        const slotStartTime = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;
                        const slotEndTime = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;

                        // Un slot por cada cancha seleccionada
                        selectedCourtIds.forEach((courtId) => {
                          const court = courts.find((c) => c.id === courtId);
                          slotsForDay.push({
                            time: slotStartTime,
                            endTime: slotEndTime,
                            courtName: court?.name || `Cancha ${courtId}`,
                          });
                        });

                        currentMinutes += matchDuration;
                      }

                      // Crear fecha en zona horaria local para evitar problemas de UTC
                      const [year, month, dayOfMonth] = day.date.split("-").map(Number);
                      const localDate = new Date(year, month - 1, dayOfMonth);

                      return (
                        <div key={dayIndex} className="space-y-1">
                          <div className="text-xs font-semibold">
                            {localDate.toLocaleDateString("es-AR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {slotsForDay.map((slot, idx) => (
                              <div
                                key={idx}
                                className="bg-background px-2 py-1 rounded border text-muted-foreground"
                              >
                                {slot.time} - {slot.endTime} - {slot.courtName}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
          
          {/* Mostrar error dentro del dialog */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive font-medium">
                {error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              availableSlots < matchCount ||
              days.length === 0 ||
              selectedCourtIds.length === 0 ||
              loadingCourts ||
              isLoading
            }
          >
            {isLoading ? "Generando playoffs..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

