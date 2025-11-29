// hooks/useCourtSlots.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type CourtSlot = {
  id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  was_played: boolean;
  notes: string | null;
  player1_payment_method_id: number | null;
  player1_note: string | null;
  player2_payment_method_id: number | null;
  player2_note: string | null;
  player3_payment_method_id: number | null;
  player3_note: string | null;
  player4_payment_method_id: number | null;
  player4_note: string | null;
  court: {
    id: number;
    name: string;
  } | null;
};

async function fetchCourtSlots(date: string): Promise<CourtSlot[]> {
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
    mutationFn: async (params: { slotId: number; patch: Partial<CourtSlot> }) => {
      const res = await fetch(`/api/court-slots/${params.slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params.patch),
      });
      if (!res.ok) throw new Error("Error updating slot");
      return res.json() as Promise<CourtSlot>;
    },
    // ✅ Optimistic update (opcional pero buenísimo)
    onMutate: async ({ slotId, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["court-slots"] });

      const prevData = queryClient.getQueryData<CourtSlot[]>(["court-slots"]);

      if (prevData) {
        queryClient.setQueryData<CourtSlot[]>(
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
      queryClient.setQueryData<CourtSlot[]>(
        ["court-slots"],
        (old) =>
          old?.map((s) => (s.id === updatedSlot.id ? updatedSlot : s)) ?? []
      );
    },
  });
}
