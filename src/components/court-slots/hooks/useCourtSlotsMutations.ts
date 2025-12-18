import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { courtSlotsService, courtSlotDayNotesService } from "@/services";
import type { UpdateCourtSlotInput } from "@/services/court-slots.service";
import type { CourtSlotDTO } from "@/models/dto/court";

export function useCourtSlotsMutations(
  selectedDate: string,
  localSlots: CourtSlotDTO[],
  setLocalSlots: React.Dispatch<React.SetStateAction<CourtSlotDTO[]>>,
  previousSlotsRef: React.MutableRefObject<Map<number, CourtSlotDTO>>,
  paymentMethods: any[]
) {
  const queryClient = useQueryClient();

  // Generar turnos del día
  const generateMutation = useMutation({
    mutationFn: async (date: string) => {
      return courtSlotsService.generate({ date });
    },
    onSuccess: (data) => {
      const existingSlots = localSlots.length;
      const newSlots = data.length;
      
      if (existingSlots > 0 && newSlots === existingSlots) {
        toast.info("Los turnos para este día ya fueron generados anteriormente.");
      } else {
        toast.success("Turnos generados correctamente.");
      }
      queryClient.invalidateQueries({ queryKey: ["court-slots", selectedDate] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron generar los turnos del día."
      );
    },
  });

  // Actualizar un slot - actualización optimista
  const updateSlotMutation = useMutation({
    mutationFn: async (params: { slotId: number; patch: UpdateCourtSlotInput }) => {
      return courtSlotsService.update(params.slotId, params.patch);
    },
    onError: (error, { slotId }) => {
      const previousSlot = previousSlotsRef.current.get(slotId);
      if (previousSlot) {
        setLocalSlots((prev) =>
          prev.map((slot) => (slot.id === slotId ? previousSlot : slot))
        );
        previousSlotsRef.current.delete(slotId);
      } else {
        queryClient.invalidateQueries({ queryKey: ["court-slots", selectedDate] });
      }
      toast.error("Error al actualizar el turno. Por favor, intenta nuevamente.");
    },
    onSuccess: (updated, { slotId }) => {
      previousSlotsRef.current.delete(slotId);
      setLocalSlots((prev) => {
        const currentSlot = prev.find((s) => s.id === updated.id);
        if (currentSlot && JSON.stringify(currentSlot) === JSON.stringify(updated)) {
          return prev;
        }
        return prev.map((s) => (s.id === updated.id ? updated : s));
      });
      queryClient.setQueryData<CourtSlotDTO[]>(
        ["court-slots", selectedDate],
        (old) => old?.map((s) => (s.id === updated.id ? updated : s)) ?? []
      );
    },
  });

  // Mutation para guardar notas del día
  const saveDayNotesMutation = useMutation({
    mutationFn: async (notes: string | null) => {
      return courtSlotDayNotesService.upsert(selectedDate, notes);
    },
    onSuccess: () => {
      toast.success("Notas del día guardadas correctamente.");
      queryClient.invalidateQueries({ queryKey: ["court-slot-day-notes", selectedDate] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las notas del día."
      );
    },
  });

  return {
    generateMutation,
    updateSlotMutation,
    saveDayNotesMutation,
  };
}

