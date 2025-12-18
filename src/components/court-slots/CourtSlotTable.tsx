import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CourtSlotRow } from "./CourtSlotRow";
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

interface CourtSlotTableProps {
  slots: CourtSlotDTO[];
  paymentMethods: PaymentMethodDTO[];
  onSlotUpdate: (slotId: number, patch: SlotChanges) => void;
  onSaveSlot: (slotId: number) => void;
  onCancelSlot: (slotId: number) => void;
  pendingChanges: Map<number, SlotChanges>;
  isSaving: boolean;
  isLoading: boolean;
}

export function CourtSlotTable({
  slots,
  paymentMethods,
  onSlotUpdate,
  onSaveSlot,
  onCancelSlot,
  pendingChanges,
  isSaving,
  isLoading,
}: CourtSlotTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugado</TableHead>
              <TableHead>Cancha</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Jugador 1</TableHead>
              <TableHead>Jugador 2</TableHead>
              <TableHead>Jugador 3</TableHead>
              <TableHead>Jugador 4</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4].map((i) => (
              <TableRow key={i}>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-4 rounded-sm mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                {[1, 2, 3, 4].map((j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-8 w-32 rounded-md" />
                  </TableCell>
                ))}
                <TableCell>
                  <Skeleton className="h-8 w-16 rounded-md" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="overflow-x-auto">
        <p className="text-sm text-muted-foreground py-4">
          No hay turnos generados para esta fecha.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jugado</TableHead>
            <TableHead>Cancha</TableHead>
            <TableHead>Dia</TableHead>
            <TableHead>Horario</TableHead>
            <TableHead>Jugador 1</TableHead>
            <TableHead>Jugador 2</TableHead>
            <TableHead>Jugador 3</TableHead>
            <TableHead>Jugador 4</TableHead>
            <TableHead className="w-24">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {slots.map((slot) => {
            const hasChanges = pendingChanges.has(slot.id) && 
              Object.keys(pendingChanges.get(slot.id) || {}).length > 0;
            return (
              <CourtSlotRow
                key={slot.id}
                slot={slot}
                paymentMethods={paymentMethods}
                onUpdate={onSlotUpdate}
                onSave={() => onSaveSlot(slot.id)}
                onCancel={() => onCancelSlot(slot.id)}
                hasChanges={hasChanges}
                isSaving={isSaving}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

