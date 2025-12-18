"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { useCourtSlotsData } from "@/components/court-slots/hooks/useCourtSlotsData";
import { useCourtSlotsMutations } from "@/components/court-slots/hooks/useCourtSlotsMutations";
import { useDayReport } from "@/components/court-slots/hooks/useDayReport";
import { usePdfGenerator } from "@/components/court-slots/hooks/usePdfGenerator";
import { CourtSlotFilters } from "@/components/court-slots/CourtSlotFilters";
import { DayNotesEditor } from "@/components/court-slots/DayNotesEditor";
import { ColorLegend } from "@/components/court-slots/ColorLegend";
import { CourtSlotTable } from "@/components/court-slots/CourtSlotTable";
import { DaySummary } from "@/components/court-slots/DaySummary";
import type { CourtSlotDTO } from "@/models/dto/court";
import type { CourtSlotDB } from "@/models/db/court";

export default function CourtSlotsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [localSlots, setLocalSlots] = useState<CourtSlotDTO[]>([]);
  const previousSlotsRef = useRef<Map<number, CourtSlotDTO>>(new Map());
  const [dayNotes, setDayNotes] = useState<string>("");
  const [isEditingDayNotes, setIsEditingDayNotes] = useState(false);

  // Hooks de datos
  const {
    paymentMethods,
    loadingPayments,
    isPaymentMethodsError,
    slots,
    loadingSlots,
    fetchingSlots,
    refetchSlots,
    isCourtSlotsError,
    dayNoteData,
    loadingDayNotes,
  } = useCourtSlotsData(selectedDate);

  // Hooks de mutaciones
  const { generateMutation, updateSlotMutation, saveDayNotesMutation } =
    useCourtSlotsMutations(
      selectedDate,
      localSlots,
      setLocalSlots,
      previousSlotsRef,
      paymentMethods
    );

  // Hook de reporte
  const { dayReport, totalRevenue, notPlayedByCourtType } = useDayReport(
    localSlots,
    paymentMethods
  );

  // Hook de PDF
  const { handleDownloadPdf } = usePdfGenerator();

  // Manejo de errores
  useEffect(() => {
    if (isPaymentMethodsError) {
      toast.error("No se pudieron cargar los métodos de pago.");
    }
  }, [isPaymentMethodsError]);

  useEffect(() => {
    if (isCourtSlotsError) {
      toast.error("No se pudieron cargar los turnos de canchas.");
    }
  }, [isCourtSlotsError]);

  // Sync de slots de server -> local
  useEffect(() => {
    setLocalSlots([]);
  }, [selectedDate]);

  useEffect(() => {
    if (!updateSlotMutation.isPending) {
      setLocalSlots((prev) => {
        if (slots.length === 0) {
          return [];
        }
        if (prev.length !== slots.length) {
          return slots;
        }
        const hasChanges = prev.some((p, idx) => {
          const s = slots[idx];
          return !s || p.id !== s.id;
        });
        return hasChanges ? slots : prev;
      });
    }
  }, [slots, updateSlotMutation.isPending]);

  // Sync de notas del día
  useEffect(() => {
    if (dayNoteData) {
      setDayNotes(dayNoteData.notes || "");
    } else {
      setDayNotes("");
    }
    setIsEditingDayNotes(false);
  }, [dayNoteData]);

  // Handlers
  const handleGenerateDay = () => {
    if (localSlots.length > 0) {
      toast.info("Los turnos para este día ya fueron generados.");
      return;
    }
    generateMutation.mutate(selectedDate);
  };

  const handleRefresh = () => {
    refetchSlots();
  };

  const updateSlotField = (
    slotId: number,
    patch: Partial<
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
    >
  ) => {
    const currentSlot = localSlots.find((s) => s.id === slotId);
    if (currentSlot && !previousSlotsRef.current.has(slotId)) {
      previousSlotsRef.current.set(slotId, { ...currentSlot });
    }

    setLocalSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        const updated: CourtSlotDTO = { ...slot };
        if ('was_played' in patch && patch.was_played !== undefined) updated.was_played = patch.was_played;
        if ('notes' in patch && patch.notes !== undefined) updated.notes = patch.notes;
        if ('player1_note' in patch && patch.player1_note !== undefined) updated.player1_note = patch.player1_note;
        if ('player2_note' in patch && patch.player2_note !== undefined) updated.player2_note = patch.player2_note;
        if ('player3_note' in patch && patch.player3_note !== undefined) updated.player3_note = patch.player3_note;
        if ('player4_note' in patch && patch.player4_note !== undefined) updated.player4_note = patch.player4_note;
        if ('player1_payment_method_id' in patch && patch.player1_payment_method_id !== undefined) {
          updated.player1_payment_method = patch.player1_payment_method_id ? (paymentMethods.find(pm => pm.id === patch.player1_payment_method_id) || null) : null;
        }
        if ('player2_payment_method_id' in patch && patch.player2_payment_method_id !== undefined) {
          updated.player2_payment_method = patch.player2_payment_method_id ? (paymentMethods.find(pm => pm.id === patch.player2_payment_method_id) || null) : null;
        }
        if ('player3_payment_method_id' in patch && patch.player3_payment_method_id !== undefined) {
          updated.player3_payment_method = patch.player3_payment_method_id ? (paymentMethods.find(pm => pm.id === patch.player3_payment_method_id) || null) : null;
        }
        if ('player4_payment_method_id' in patch && patch.player4_payment_method_id !== undefined) {
          updated.player4_payment_method = patch.player4_payment_method_id ? (paymentMethods.find(pm => pm.id === patch.player4_payment_method_id) || null) : null;
        }
        return updated;
      })
    );

    updateSlotMutation.mutate({ slotId, patch });
  };

  const handleSaveDayNotes = (notes: string | null) => {
    saveDayNotesMutation.mutate(notes);
  };

  const handleCancelDayNotes = () => {
    setIsEditingDayNotes(false);
    setDayNotes(dayNoteData?.notes || "");
  };

  const handleDownloadPdfClick = () => {
    handleDownloadPdf(
      selectedDate,
      localSlots,
      dayReport,
      totalRevenue,
      notPlayedByCourtType as Record<string, string[]>,
      dayNoteData || null,
      dayNotes
    );
  };

  const initialSlotsLoading = loadingSlots && !localSlots.length;
  const saving = updateSlotMutation.isPending;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <CardHeader className="p-0 space-y-1">
        <CardTitle>Turnos de canchas</CardTitle>
        <CardDescription>
          Generá los turnos diarios para las canchas y registrá el método de
          pago de cada jugador.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-0">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <CourtSlotFilters
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onRefresh={handleRefresh}
              onGenerate={handleGenerateDay}
              isGenerating={generateMutation.isPending}
              isRefreshing={fetchingSlots}
            />

            <DayNotesEditor
              notes={dayNotes}
              isEditing={isEditingDayNotes}
              onEdit={() => setIsEditingDayNotes(true)}
              onSave={handleSaveDayNotes}
              onCancel={handleCancelDayNotes}
              onNotesChange={setDayNotes}
              isSaving={saveDayNotesMutation.isPending}
              isLoading={loadingDayNotes}
            />

            <ColorLegend
              paymentMethods={paymentMethods}
              isLoadingPayments={loadingPayments}
            />

            <CourtSlotTable
              slots={localSlots}
              paymentMethods={paymentMethods}
              onSlotUpdate={updateSlotField}
              isLoading={initialSlotsLoading}
            />

            {saving && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Loader2Icon className="h-3 w-3 animate-spin" />
                Guardando cambios...
              </div>
            )}
          </div>

          <DaySummary
            selectedDate={selectedDate}
            dayReport={dayReport}
            totalRevenue={totalRevenue}
            notPlayedByCourtType={notPlayedByCourtType}
            onDownloadPdf={handleDownloadPdfClick}
            hasSlots={localSlots.length > 0}
          />
        </div>
      </CardContent>
    </Card>
  );
}
