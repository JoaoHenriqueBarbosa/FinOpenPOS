// hooks/useCourtSlots.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CourtSlotDTO } from "@/models/dto/court";

// Re-export for backward compatibility
export type { CourtSlotDTO as CourtSlot };

async function fetchCourtSlots(date: string): Promise<CourtSlotDTO[]> {
  const res = await fetch(`/api/court-slots?date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch court slots");
  return res.json();
}

export function useCourtSlots(date: string) {
  return useQuery({
    queryKey: ["court-slots", date],
    queryFn: () => fetchCourtSlots(date),
    staleTime: 1000 * 60 * 2, // 2 minutos sin re-fetch
  });
}

export function useUpdateCourtSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { slotId: number; patch: Partial<CourtSlotDTO> }) => {
      const res = await fetch(`/api/court-slots/${params.slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params.patch),
      });
      if (!res.ok) throw new Error("Error updating slot");
      return res.json() as Promise<CourtSlotDTO>;
    },
    // ✅ Optimistic update (opcional pero buenísimo)
    onMutate: async ({ slotId, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["court-slots"] });

      const prevData = queryClient.getQueryData<CourtSlotDTO[]>(["court-slots"]);

      if (prevData) {
        queryClient.setQueryData<CourtSlotDTO[]>(
          ["court-slots"],
          prevData.map((s) =>
            s.id === slotId ? { ...s, ...patch } : s
          )
        );
      }

      return { prevData };
    },
    onError: (_err, _variables, context) => {
      if (context?.prevData) {
        queryClient.setQueryData(["court-slots"], context.prevData);
      }
    },
    onSuccess: (updatedSlot) => {
      // Reemplazamos con el valor “real” del server
      queryClient.setQueryData<CourtSlotDTO[]>(
        ["court-slots"],
        (old) =>
          old?.map((s) => (s.id === updatedSlot.id ? updatedSlot : s)) ?? []
      );
    },
  });
}
