import { useMemo } from "react";
import type { CourtSlotDTO } from "@/models/dto/court";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";
import { getPricePerPlayer, formatTime, getCourtType } from "@/lib/court-slots-utils";

export function useDayReport(
  localSlots: CourtSlotDTO[],
  paymentMethods: PaymentMethodDTO[]
) {
  const dayReport = useMemo(() => {
    if (!localSlots.length) {
      return {
        totalSlots: 0,
        playedSlots: 0,
        notPlayedSlots: 0,
        slotsWithUnpaidPlayers: 0,
        totalUnpaidPlayers: 0,
        unpaidSlots: [] as Array<{
          id: number;
          courtName: string;
          timeRange: string;
          unpaidCount: number;
        }>,
        courts: [] as {
          courtName: string;
          totalSlots: number;
          playedSlots: number;
          notPlayedSlots: number;
        }[],
        payments: [] as {
          paymentMethodId: number;
          paymentMethodName: string;
          uses: number;
          totalAmount: number;
        }[],
      };
    }

    let totalSlots = 0;
    let playedSlots = 0;
    let notPlayedSlots = 0;
    let slotsWithUnpaidPlayers = 0;
    let totalUnpaidPlayers = 0;

    const courtsMap = new Map<
      string,
      { totalSlots: number; playedSlots: number; notPlayedSlots: number }
    >();

    const paymentsMap = new Map<
      number,
      { name: string; uses: number; totalAmount: number }
    >();

    const unpaidSlots: Array<{
      id: number;
      courtName: string;
      timeRange: string;
      unpaidCount: number;
    }> = [];

    for (const slot of localSlots) {
      totalSlots += 1;
      if (slot.was_played) {
        playedSlots += 1;
      } else {
        notPlayedSlots += 1;
      }

      const courtName = slot.court?.name ?? "Sin cancha";
      const existingCourt = courtsMap.get(courtName) ?? {
        totalSlots: 0,
        playedSlots: 0,
        notPlayedSlots: 0,
      };

      existingCourt.totalSlots += 1;
      if (slot.was_played) {
        existingCourt.playedSlots += 1;
      } else {
        existingCourt.notPlayedSlots += 1;
      }

      courtsMap.set(courtName, existingCourt);

      const pricePerPlayer = getPricePerPlayer(slot.court?.name);

      const playersPaymentIds = [
        slot.player1_payment_method?.id,
        slot.player2_payment_method?.id,
        slot.player3_payment_method?.id,
        slot.player4_payment_method?.id,
      ];

      // Contar jugadores sin método de pago asignado SOLO en turnos jugados
      if (slot.was_played) {
        const unpaidCount = playersPaymentIds.filter(id => !id).length;
        if (unpaidCount > 0) {
          slotsWithUnpaidPlayers += 1;
          totalUnpaidPlayers += unpaidCount;
          unpaidSlots.push({
            id: slot.id,
            courtName: slot.court?.name ?? "Sin cancha",
            timeRange: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
            unpaidCount,
          });
        }
      }

      for (const pmId of playersPaymentIds) {
        if (!pmId) continue;

        const pm = paymentMethods.find((p) => p.id === pmId);
        const name = pm?.name ?? `Método #${pmId}`;

        const isPrepaidQR = pm?.name
          ? pm.name.toUpperCase().includes("QR")
          : false;

        const existing = paymentsMap.get(pmId) ?? {
          name,
          uses: 0,
          totalAmount: 0,
        };

        existing.uses += 1;

        if (slot.was_played && pricePerPlayer > 0 && !isPrepaidQR) {
          existing.totalAmount += pricePerPlayer;
        }

        paymentsMap.set(pmId, existing);
      }
    }

    return {
      totalSlots,
      playedSlots,
      notPlayedSlots,
      slotsWithUnpaidPlayers,
      totalUnpaidPlayers,
      unpaidSlots,
      courts: Array.from(courtsMap.entries()).map(
        ([courtName, stats]) => ({
          courtName,
          ...stats,
        })
      ),
      payments: Array.from(paymentsMap.entries()).map(
        ([paymentMethodId, data]) => ({
          paymentMethodId,
          paymentMethodName: data.name,
          uses: data.uses,
          totalAmount: data.totalAmount,
        })
      ),
    };
  }, [localSlots, paymentMethods]);

  const totalRevenue = useMemo(
    () =>
      dayReport.payments.reduce(
        (sum, pm) => sum + pm.totalAmount,
        0
      ),
    [dayReport.payments]
  );

  const notPlayedSlots = useMemo(
    () =>
      localSlots
        .filter((slot) => !slot.was_played)
        .map((slot) => ({
          id: slot.id,
          courtName: slot.court?.name ?? "Sin cancha",
          timeRange: `${formatTime(slot.start_time)} - ${formatTime(
            slot.end_time
          )}`,
        })),
    [localSlots]
  );

  const notPlayedByCourtType = useMemo(() => {
    const groups: Record<string, string[]> = {
      INDOOR: [],
      OUTDOOR: [],
      OTRAS: [],
    };

    for (const slot of localSlots) {
      if (slot.was_played) continue;

      const courtType = getCourtType(slot.court?.name);
      const timeRange = `${formatTime(slot.start_time)} - ${formatTime(
        slot.end_time
      )}`;

      groups[courtType].push(timeRange);
    }

    return groups;
  }, [localSlots]);

  const unpaidByCourtType = useMemo(() => {
    const groups: Record<string, Array<{ courtName: string; timeRange: string; unpaidCount: number }>> = {
      INDOOR: [],
      OUTDOOR: [],
      OTRAS: [],
    };

    for (const slot of dayReport.unpaidSlots) {
      const courtType = getCourtType(slot.courtName);
      groups[courtType].push({
        courtName: slot.courtName,
        timeRange: slot.timeRange,
        unpaidCount: slot.unpaidCount,
      });
    }

    return groups;
  }, [dayReport.unpaidSlots]);

  return {
    dayReport,
    totalRevenue,
    notPlayedSlots,
    notPlayedByCourtType,
    unpaidByCourtType,
  };
}

