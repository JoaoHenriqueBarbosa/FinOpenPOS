"use client";

import { useState, useEffect } from "react";
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
import { PlusIcon, TrashIcon } from "lucide-react";

export type ScheduleDay = {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
};

export type ScheduleConfig = {
  days: ScheduleDay[];
  matchDuration: number; // minutos entre partidos (ej: 60)
  courtIds: number[]; // IDs de las canchas a usar
};

type TournamentScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: ScheduleConfig) => void;
  matchCount: number; // cantidad de partidos a programar
  tournamentMatchDuration?: number; // duración del partido del torneo (en minutos)
};

type Court = {
  id: number;
  name: string;
  is_active: boolean;
};

export function TournamentScheduleDialog({
  open,
  onOpenChange,
  onConfirm,
  matchCount,
  tournamentMatchDuration = 60,
}: TournamentScheduleDialogProps) {
  const [days, setDays] = useState<ScheduleDay[]>([
    {
      date: "",
      startTime: "18:00",
      endTime: "22:00",
    },
  ]);
  const [matchDuration, setMatchDuration] = useState<number>(tournamentMatchDuration);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourtIds, setSelectedCourtIds] = useState<number[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);

  // Resetear matchDuration cuando cambia el valor del torneo o se abre el diálogo
  useEffect(() => {
    if (open) {
      setMatchDuration(tournamentMatchDuration);
    }
  }, [open, tournamentMatchDuration]);

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
        .then((data: Court[] | { error?: string }) => {
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

  const addDay = () => {
    setDays([
      ...days,
      {
        date: "",
        startTime: "12:00",
        endTime: "22:00",
      },
    ]);
  };

  const removeDay = (index: number) => {
    setDays(days.filter((_, i) => i !== index));
  };

  const updateDay = (index: number, field: keyof ScheduleDay, value: string) => {
    const newDays = [...days];
    newDays[index] = { ...newDays[index], [field]: value };
    setDays(newDays);
  };

  const handleConfirm = () => {
    // Validar que todos los días tengan fecha
    if (days.some((d) => !d.date)) {
      alert("Todos los días deben tener una fecha");
      return;
    }

    // Validar que startTime < endTime para cada día
    if (days.some((d) => d.startTime >= d.endTime)) {
      alert("La hora de inicio debe ser anterior a la hora de fin");
      return;
    }

    // Validar que haya al menos una cancha seleccionada
    if (selectedCourtIds.length === 0) {
      alert("Debes seleccionar al menos una cancha");
      return;
    }

    onConfirm({ days, matchDuration, courtIds: selectedCourtIds });
    onOpenChange(false);
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
      const endMinutes = endH * 60 + endM;
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
            <div className="flex items-center justify-between">
              <Label>Días disponibles</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDay}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Agregar día
              </Button>
            </div>

            {days.map((day, index) => (
              <div
                key={index}
                className="flex gap-2 items-end p-3 border rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs">Fecha</Label>
                    <Input
                      type="date"
                      value={day.date}
                      onChange={(e) =>
                        updateDay(index, "date", e.target.value)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Hora inicio</Label>
                      <Input
                        type="time"
                        step="60"
                        value={day.startTime}
                        onChange={(e) =>
                          updateDay(index, "startTime", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Hora fin</Label>
                      <Input
                        type="time"
                        step="60"
                        value={day.endTime}
                        onChange={(e) =>
                          updateDay(index, "endTime", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                {days.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDay(index)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
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
                      const endMinutes = endH * 60 + endM;

                      // Generar slots para este día
                      const slotsForDay: Array<{ time: string; courtName: string }> = [];
                      let currentMinutes = startMinutes;
                      let slotIndex = 0;

                      while (currentMinutes + matchDuration <= endMinutes) {
                        const slotStartH = Math.floor(currentMinutes / 60);
                        const slotStartM = currentMinutes % 60;
                        const slotTime = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;

                        // Un slot por cada cancha seleccionada
                        selectedCourtIds.forEach((courtId) => {
                          const court = courts.find((c) => c.id === courtId);
                          slotsForDay.push({
                            time: slotTime,
                            courtName: court?.name || `Cancha ${courtId}`,
                          });
                        });

                        currentMinutes += matchDuration;
                        slotIndex++;
                      }

                      return (
                        <div key={dayIndex} className="space-y-1">
                          <div className="text-xs font-semibold">
                            {new Date(day.date).toLocaleDateString("es-AR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {slotsForDay.slice(0, 10).map((slot, idx) => (
                              <div
                                key={idx}
                                className="bg-background px-2 py-1 rounded border text-muted-foreground"
                              >
                                {slot.time} - {slot.courtName}
                              </div>
                            ))}
                            {slotsForDay.length > 10 && (
                              <div className="col-span-2 text-xs text-muted-foreground italic">
                                ... y {slotsForDay.length - 10} slots más
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              availableSlots < matchCount ||
              days.length === 0 ||
              selectedCourtIds.length === 0 ||
              loadingCourts
            }
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

