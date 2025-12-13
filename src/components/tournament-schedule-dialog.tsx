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
}: TournamentScheduleDialogProps) {
  const [days, setDays] = useState<ScheduleDay[]>([
    {
      date: "",
      startTime: "18:00",
      endTime: "22:00",
    },
  ]);
  const [matchDuration, setMatchDuration] = useState<number>(60); // 1 hora por defecto
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourtIds, setSelectedCourtIds] = useState<number[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);

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

          {/* Duración entre partidos */}
          <div className="space-y-2">
            <Label>Duración entre partidos (minutos)</Label>
            <Input
              type="number"
              min="30"
              step="15"
              value={matchDuration}
              onChange={(e) => setMatchDuration(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Intervalo entre el inicio de cada partido (ej: 60 = cada 1 hora)
            </p>
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

          {/* Resumen */}
          <div className="bg-muted p-3 rounded-lg space-y-1">
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

