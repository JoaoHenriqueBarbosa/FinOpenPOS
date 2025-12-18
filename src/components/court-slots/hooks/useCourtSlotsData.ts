import { useQuery } from "@tanstack/react-query";
import { paymentMethodsService, courtSlotsService, courtSlotDayNotesService } from "@/services";

export function useCourtSlotsData(selectedDate: string) {
  // Métodos de pago
  const {
    data: paymentMethods = [],
    isLoading: loadingPayments,
    isError: isPaymentMethodsError,
  } = useQuery({
    queryKey: ["payment-methods", "COURT"],
    queryFn: () => paymentMethodsService.getAll(true, "COURT"),
    staleTime: 1000 * 60 * 5,
  });

  // Slots de canchas por día
  const {
    data: slots = [],
    isLoading: loadingSlots,
    isFetching: fetchingSlots,
    refetch: refetchSlots,
    isError: isCourtSlotsError,
  } = useQuery({
    queryKey: ["court-slots", selectedDate],
    queryFn: () => courtSlotsService.getByDate(selectedDate),
    enabled: !!selectedDate,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Notas globales del día
  const {
    data: dayNoteData,
    isLoading: loadingDayNotes,
  } = useQuery({
    queryKey: ["court-slot-day-notes", selectedDate],
    queryFn: async () => {
      const note = await courtSlotDayNotesService.getByDate(selectedDate);
      return note;
    },
    enabled: !!selectedDate,
    staleTime: 1000 * 60 * 5,
  });

  return {
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
  };
}

