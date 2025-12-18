import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTextIcon, Loader2Icon } from "lucide-react";

interface DayNotesEditorProps {
  notes: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (notes: string | null) => void;
  onCancel: () => void;
  onNotesChange: (notes: string) => void;
  isSaving: boolean;
  isLoading: boolean;
}

export function DayNotesEditor({
  notes,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onNotesChange,
  isSaving,
  isLoading,
}: DayNotesEditorProps) {
  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <FileTextIcon className="w-4 h-4" />
          Notas del día
        </Label>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 text-xs"
          >
            Editar
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Agregá notas globales para este día..."
            className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isSaving}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
              className="h-7 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => onSave(notes || null)}
              disabled={isSaving}
              className="h-7 text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground min-h-[40px]">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : notes ? (
            <p className="whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-muted-foreground/60 italic">
              No hay notas para este día. Hacé clic en &quot;Editar&quot; para agregar notas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

