"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2Icon, PlusIcon, TrashIcon } from "lucide-react";
import type { AvailableSchedule } from "@/models/dto/tournament";

interface TournamentAvailableSchedulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: number;
  schedules: AvailableSchedule[];
  onSave: (schedules: Omit<AvailableSchedule, "id" | "tournament_id">[]) => Promise<void>;
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function TournamentAvailableSchedulesDialog({
  open,
  onOpenChange,
  tournamentId,
  schedules,
  onSave,
}: TournamentAvailableSchedulesDialogProps) {
  const [localSchedules, setLocalSchedules] = useState<Omit<AvailableSchedule, "id" | "tournament_id">[]>([]);
  const [saving, setSaving] = useState(false);

  // Inicializar con los horarios existentes
  // Usar useMemo para estabilizar la referencia y evitar loops infinitos
  const schedulesKey = useMemo(() => {
    return schedules.map(s => `${s.date}-${s.start_time}-${s.end_time}`).join('|');
  }, [schedules]);

  const schedulesStable = useMemo(() => {
    return schedules.map(({ id, tournament_id, ...rest }) => rest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedulesKey]);

  useEffect(() => {
    if (open) {
      setLocalSchedules(schedulesStable);
    } else {
      setLocalSchedules([]);
    }
  }, [open, schedulesStable]);

  const handleAddSchedule = () => {
    // Fecha por defecto: hoy
    const today = new Date();
    const defaultDate = today.toISOString().split("T")[0];
    
    setLocalSchedules([
      ...localSchedules,
      {
        date: defaultDate,
        start_time: "13:00",
        end_time: "23:00",
      },
    ]);
  };

  const handleRemoveSchedule = (index: number) => {
    setLocalSchedules(localSchedules.filter((_, i) => i !== index));
  };

  const handleUpdateSchedule = (
    index: number,
    field: keyof Omit<AvailableSchedule, "id" | "tournament_id">,
    value: string | number | null
  ) => {
    const updated = [...localSchedules];
    updated[index] = { ...updated[index], [field]: value };
    setLocalSchedules(updated);
  };

  const handleSave = async () => {
    // Validar que todos los horarios tengan fecha, hora inicio y hora fin
    const invalid = localSchedules.some(
      (s) => !s.date || s.start_time === "" || s.end_time === "" || s.start_time >= s.end_time
    );
    if (invalid) {
      alert("Por favor completá todos los campos (fecha, hora inicio y hora fin) y asegurate de que la hora de inicio sea menor que la hora de fin");
      return;
    }

    try {
      setSaving(true);
      await onSave(localSchedules);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al guardar horarios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horarios disponibles del torneo</DialogTitle>
          <DialogDescription>
            Configurá los horarios en los que se pueden jugar partidos en este torneo.
            Luego, cada equipo podrá marcar cuáles de estos horarios no puede jugar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {localSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay horarios configurados. Agregá al menos uno para poder generar los partidos.
            </p>
          ) : (
            <div className="space-y-3">
              {localSchedules.map((schedule, index) => (
                <div
                  key={index}
                  className="flex items-end gap-2 p-3 border rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label htmlFor={`date-${index}`}>Fecha</Label>
                      <Input
                        id={`date-${index}`}
                        type="date"
                        value={schedule.date || ""}
                        onChange={(e) =>
                          handleUpdateSchedule(index, "date", e.target.value)
                        }
                      />
                      {schedule.date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(schedule.date + "T00:00:00").toLocaleDateString("es-AR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`start-${index}`}>Hora inicio</Label>
                        <Input
                          id={`start-${index}`}
                          type="time"
                          value={schedule.start_time}
                          onChange={(e) =>
                            handleUpdateSchedule(index, "start_time", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`end-${index}`}>Hora fin</Label>
                        <Input
                          id={`end-${index}`}
                          type="time"
                          value={schedule.end_time}
                          onChange={(e) =>
                            handleUpdateSchedule(index, "end_time", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSchedule(index)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleAddSchedule}
            className="w-full"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Agregar horario
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

