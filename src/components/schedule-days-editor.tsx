"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusIcon, TrashIcon } from "lucide-react";

export interface ScheduleDay {
  date: string;
  startTime: string;
  endTime: string;
}

interface ScheduleDaysEditorProps {
  days: ScheduleDay[];
  onChange: (days: ScheduleDay[]) => void;
  showDayOfWeek?: boolean; // Mostrar el nombre del día de la semana
}

export function ScheduleDaysEditor({
  days,
  onChange,
  showDayOfWeek = false,
}: ScheduleDaysEditorProps) {
  const addDay = () => {
    onChange([
      ...days,
      {
        date: "",
        startTime: "12:00",
        endTime: "22:00",
      },
    ]);
  };

  const removeDay = (index: number) => {
    onChange(days.filter((_, i) => i !== index));
  };

  const updateDay = (index: number, field: keyof ScheduleDay, value: string) => {
    const newDays = [...days];
    newDays[index] = { ...newDays[index], [field]: value };
    onChange(newDays);
  };

  // Validar que startTime < endTime considerando 00:00 como fin del día
  const isValidTimeRange = (startTime: string, endTime: string): boolean => {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    // Si la hora de fin es 00:00, interpretarla como 24:00 (fin del día)
    const endMinutes = (endH === 0 && endM === 0) ? 24 * 60 : endH * 60 + endM;
    return startMinutes < endMinutes;
  };

  return (
    <div className="space-y-3">
      {days.map((day, index) => {
        const isInvalid = !isValidTimeRange(day.startTime, day.endTime);
        
        return (
          <div
            key={index}
            className={`flex gap-2 items-end p-3 border rounded-lg ${isInvalid ? "border-red-300 bg-red-50" : ""}`}
          >
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-xs">Fecha</Label>
                <Input
                  type="date"
                  value={day.date}
                  onChange={(e) => updateDay(index, "date", e.target.value)}
                />
                {showDayOfWeek && day.date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {(() => {
                      const [year, month, dayOfMonth] = day.date.split("-").map(Number);
                      const localDate = new Date(year, month - 1, dayOfMonth);
                      return localDate.toLocaleDateString("es-AR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      });
                    })()}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Hora inicio</Label>
                  <Input
                    type="time"
                    step="60"
                    value={day.startTime}
                    onChange={(e) => updateDay(index, "startTime", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Hora fin</Label>
                  <Input
                    type="time"
                    step="60"
                    value={day.endTime}
                    onChange={(e) => updateDay(index, "endTime", e.target.value)}
                  />
                </div>
              </div>
              {isInvalid && (
                <p className="text-xs text-red-600">
                  La hora de inicio debe ser anterior a la hora de fin
                </p>
              )}
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
        );
      })}
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addDay}
        className="w-full"
      >
        <PlusIcon className="w-4 h-4 mr-1" />
        Agregar día
      </Button>
    </div>
  );
}

