import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SaveIcon, Loader2Icon } from "lucide-react";
import { courtPillClasses, formatTime } from "@/lib/court-slots-utils";
import { PlayerPaymentSelect } from "./PlayerPaymentSelect";
import type { CourtSlotDTO } from "@/models/dto/court";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";
import type { CourtSlotDB } from "@/models/db/court";

type SlotChanges = Partial<
  Pick<
    CourtSlotDB,
    | "was_played"
    | "notes"
    | "player1_payment_method_id"
    | "player1_note"
    | "player2_payment_method_id"
    | "player2_note"
    | "player3_payment_method_id"
    | "player3_note"
    | "player4_payment_method_id"
    | "player4_note"
  >
>;

interface CourtSlotRowProps {
  slot: CourtSlotDTO;
  paymentMethods: PaymentMethodDTO[];
  onUpdate: (slotId: number, patch: SlotChanges) => void;
  onSave: () => void;
  hasChanges: boolean;
  isSaving: boolean;
}

export function CourtSlotRow({
  slot,
  paymentMethods,
  onUpdate,
  onSave,
  hasChanges,
  isSaving,
}: CourtSlotRowProps) {
  return (
    <TableRow 
      key={slot.id}
      className={hasChanges ? "bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500" : ""}
    >
      <TableCell className="text-center">
        <Checkbox
          checked={slot.was_played}
          onCheckedChange={(checked) =>
            onUpdate(slot.id, {
              was_played: Boolean(checked),
            })
          }
        />
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${courtPillClasses(slot.court?.name)}`}
        >
          {slot.court?.name ?? "-"}
        </span>
      </TableCell>
      <TableCell>
        {(() => {
          const [year, month, day] = slot.slot_date.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          return format(date, "EEEE dd/MM/yyyy", { locale: es }).toUpperCase();
        })()}
      </TableCell>
      <TableCell>
        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
      </TableCell>

      <TableCell className="min-w-[160px]">
        <PlayerPaymentSelect
          value={slot.player1_payment_method?.id}
          onChange={(value) =>
            onUpdate(slot.id, {
              player1_payment_method_id: value,
            })
          }
          paymentMethods={paymentMethods}
        />
      </TableCell>

      <TableCell className="min-w-[160px]">
        <PlayerPaymentSelect
          value={slot.player2_payment_method?.id}
          onChange={(value) =>
            onUpdate(slot.id, {
              player2_payment_method_id: value,
            })
          }
          paymentMethods={paymentMethods}
        />
      </TableCell>

      <TableCell className="min-w-[160px]">
        <PlayerPaymentSelect
          value={slot.player3_payment_method?.id}
          onChange={(value) =>
            onUpdate(slot.id, {
              player3_payment_method_id: value,
            })
          }
          paymentMethods={paymentMethods}
        />
      </TableCell>

      <TableCell className="min-w-[160px]">
        <PlayerPaymentSelect
          value={slot.player4_payment_method?.id}
          onChange={(value) =>
            onUpdate(slot.id, {
              player4_payment_method_id: value,
            })
          }
          paymentMethods={paymentMethods}
        />
      </TableCell>

      <TableCell>
        {hasChanges && (
          <Button
            size="sm"
            variant="default"
            onClick={onSave}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <SaveIcon className="h-4 w-4 mr-1" />
                Guardar
              </>
            )}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

