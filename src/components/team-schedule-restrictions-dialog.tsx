"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";
import type { TeamDTO, AvailableSchedule } from "@/models/dto/tournament";

interface TeamScheduleRestrictionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamDTO | null;
  availableSchedules: AvailableSchedule[]; // Horarios disponibles para mostrar (generados on the fly)
  onSave: (restrictedSchedules: Array<{ date: string; start_time: string; end_time: string }>) => Promise<void>;
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function TeamScheduleRestrictionsDialog({
  open,
  onOpenChange,
  team,
  availableSchedules,
  onSave,
}: TeamScheduleRestrictionsDialogProps) {
  // Usar un Set con claves de string para identificar restricciones por fecha/hora
  const [restrictedKeys, setRestrictedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Función auxiliar para crear una clave única de un horario
  const getScheduleKey = (schedule: { date: string; start_time: string; end_time: string }): string => {
    return `${schedule.date}|${schedule.start_time}|${schedule.end_time}`;
  };

  // Inicializar restricciones cuando se abre el diálogo o cambia el equipo
  const teamId = team?.id;
  const teamRestrictedSchedules = (team as any)?.restricted_schedules as Array<{ date: string; start_time: string; end_time: string }> | undefined;
  
  useEffect(() => {
    if (open && team && teamRestrictedSchedules) {
      // Cargar restricciones del equipo (rangos de fecha/hora que NO puede jugar)
      const keys = new Set(teamRestrictedSchedules.map(s => getScheduleKey(s)));
      setRestrictedKeys(keys);
    } else if (!open) {
      setRestrictedKeys(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teamId, teamRestrictedSchedules?.map(s => getScheduleKey(s)).join(',')]);

  const handleToggleRestriction = (schedule: { date: string; start_time: string; end_time: string }) => {
    const newRestricted = new Set(restrictedKeys);
    const key = getScheduleKey(schedule);
    if (newRestricted.has(key)) {
      newRestricted.delete(key);
    } else {
      newRestricted.add(key);
    }
    setRestrictedKeys(newRestricted);
  };

  const handleToggleDay = (date: string, daySchedules: typeof sortedSchedules) => {
    const newRestricted = new Set(restrictedKeys);
    const dayScheduleKeys = daySchedules.map(s => getScheduleKey(s));
    const allDayRestricted = dayScheduleKeys.every(key => restrictedKeys.has(key));

    if (allDayRestricted) {
      // Desmarcar todo el día
      dayScheduleKeys.forEach(key => newRestricted.delete(key));
    } else {
      // Marcar todo el día
      dayScheduleKeys.forEach(key => newRestricted.add(key));
    }
    setRestrictedKeys(newRestricted);
  };

  const isDayFullyRestricted = (daySchedules: typeof sortedSchedules): boolean => {
    if (daySchedules.length === 0) return false;
    return daySchedules.every(schedule => restrictedKeys.has(getScheduleKey(schedule)));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Convertir claves de vuelta a objetos de fecha/hora
      const restrictedSchedules = Array.from(restrictedKeys)
        .map(key => {
          const [date, start_time, end_time] = key.split('|');
          return { date, start_time, end_time };
        });
      await onSave(restrictedSchedules);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al guardar restricciones");
    } finally {
      setSaving(false);
    }
  };

  const teamName = team
    ? team.display_name ||
      `${team.player1.first_name} ${team.player1.last_name} / ${team.player2.first_name} ${team.player2.last_name}`
    : "";

  // Ordenar horarios por fecha y hora
  const sortedSchedules = [...availableSchedules].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.start_time.localeCompare(b.start_time);
  });

  // Agrupar por fecha
  const schedulesByDate = sortedSchedules.reduce((acc, schedule) => {
    const date = schedule.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(schedule);
    return acc;
  }, {} as Record<string, typeof sortedSchedules>);

  // Formatear hora para mostrar (ej: "13:00" en vez de "13:00:00")
  const formatTime = (time: string): string => {
    return time.substring(0, 5); // Toma solo HH:MM
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Restricciones horarias</DialogTitle>
          <DialogDescription>
            Marcá los horarios en los que {teamName} <strong>NO puede</strong> jugar.
            Los horarios no marcados serán los disponibles para este equipo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          {availableSchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No hay horarios disponibles configurados para este torneo.</p>
              <p className="text-sm">Configurá los horarios disponibles del torneo primero.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(schedulesByDate)
                .sort()
                .map((date) => {
                  const daySchedules = schedulesByDate[date];
                  const dateObj = new Date(date + "T00:00:00");
                  const dayName = dayNames[dateObj.getDay()];
                  const formattedDate = dateObj.toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  });

                  const isDayRestricted = isDayFullyRestricted(daySchedules);

                  return (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center space-x-2 pb-1">
                        <Checkbox
                          id={`day-${date}`}
                          checked={isDayRestricted}
                          onCheckedChange={() => handleToggleDay(date, daySchedules)}
                        />
                        <Label
                          htmlFor={`day-${date}`}
                          className="font-semibold text-sm text-muted-foreground uppercase tracking-wide cursor-pointer"
                        >
                          {formattedDate}
                        </Label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {daySchedules.map((schedule) => {
                          const scheduleKey = getScheduleKey(schedule);
                          const isRestricted = restrictedKeys.has(scheduleKey);
                          const startTime = formatTime(schedule.start_time);
                          const endTime = formatTime(schedule.end_time);

                          return (
                            <div
                              key={scheduleKey}
                              className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                id={`schedule-${scheduleKey}`}
                                checked={isRestricted}
                                onCheckedChange={() => handleToggleRestriction(schedule)}
                              />
                              <Label
                                htmlFor={`schedule-${scheduleKey}`}
                                className="flex-1 cursor-pointer font-normal"
                              >
                                <div className="font-medium text-sm">
                                  {startTime} - {endTime}
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || availableSchedules.length === 0}>
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
