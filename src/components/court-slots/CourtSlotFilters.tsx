import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, RefreshCwIcon, Loader2Icon } from "lucide-react";

interface CourtSlotFiltersProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isRefreshing: boolean;
}

export function CourtSlotFilters({
  selectedDate,
  onDateChange,
  onRefresh,
  onGenerate,
  isGenerating,
  isRefreshing,
}: CourtSlotFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end justify-between">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-xs">
            <CalendarIcon className="w-3 h-3" />
            Fecha
          </Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCwIcon className="w-4 h-4 mr-1" />
          {isRefreshing ? "Actualizando..." : "Refrescar"}
        </Button>
      </div>

      <Button onClick={onGenerate} disabled={isGenerating}>
        {isGenerating && (
          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
        )}
        Generar turnos del día
      </Button>
    </div>
  );
}

