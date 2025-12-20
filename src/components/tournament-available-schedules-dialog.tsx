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
import { Loader2Icon } from "lucide-react";
import { ScheduleDaysEditor, type ScheduleDay } from "@/components/schedule-days-editor";
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
  const [localSchedules, setLocalSchedules] = useState<ScheduleDay[]>([]);
  const [saving, setSaving] = useState(false);

  // Inicializar con los horarios existentes
  // Usar useMemo para estabilizar la referencia y evitar loops infinitos
  const schedulesKey = useMemo(() => {
    return schedules.map(s => `${s.date}-${s.start_time}-${s.end_time}`).join('|');
  }, [schedules]);

  const schedulesStable = useMemo(() => {
    return schedules.map(({ id, tournament_id, date, start_time, end_time }) => ({
      date,
      startTime: start_time,
      endTime: end_time,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedulesKey]);

  useEffect(() => {
    if (open) {
      setLocalSchedules(schedulesStable);
    } else {
      setLocalSchedules([]);
    }
  }, [open, schedulesStable]);

  const handleDaysChange = (days: ScheduleDay[]) => {
    setLocalSchedules(days);
  };

  const handleSave = async () => {
    // Validar que todos los horarios tengan fecha, hora inicio y hora fin
    const invalid = localSchedules.some(
      (s) => !s.date || s.startTime === "" || s.endTime === ""
    );
    if (invalid) {
      alert("Por favor completá todos los campos (fecha, hora inicio y hora fin)");
      return;
    }

    // Validar que startTime < endTime considerando 00:00 como fin del día
    const invalidTimeRange = localSchedules.some((s) => {
      const [startH, startM] = s.startTime.split(":").map(Number);
      const [endH, endM] = s.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = (endH === 0 && endM === 0) ? 24 * 60 : endH * 60 + endM;
      return startMinutes >= endMinutes;
    });
    if (invalidTimeRange) {
      alert("La hora de inicio debe ser anterior a la hora de fin");
      return;
    }

    try {
      setSaving(true);
      // Convertir ScheduleDay[] a AvailableSchedule[]
      const schedulesToSave: Omit<AvailableSchedule, "id" | "tournament_id">[] = localSchedules.map((day) => ({
        date: day.date,
        start_time: day.startTime,
        end_time: day.endTime,
      }));
      await onSave(schedulesToSave);
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
            <ScheduleDaysEditor
              days={localSchedules}
              onChange={handleDaysChange}
              showDayOfWeek={true}
            />
          )}
          
          {localSchedules.length === 0 && (
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const defaultDate = today.toISOString().split("T")[0];
                setLocalSchedules([{
                  date: defaultDate,
                  startTime: "13:00",
                  endTime: "23:00",
                }]);
              }}
              className="w-full"
            >
              Agregar primer horario
            </Button>
          )}
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

