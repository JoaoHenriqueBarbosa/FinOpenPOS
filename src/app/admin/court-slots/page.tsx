"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2Icon, CalendarIcon, RefreshCwIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { jsPDF } from "jspdf";

import type { CourtSlotDTO } from "@/models/dto/court";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";

const courtPillClasses = (courtName?: string | null) => {
  if (!courtName) {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }

  if (courtName.toUpperCase().includes("INDOOR")) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100";
  }

  if (courtName.toUpperCase().includes("OUTDOOR")) {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100";
  }

  // fallback genérico
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100";
};

const PAYMENT_COLORS = [
  "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30",
  "border-sky-300 bg-sky-50 dark:bg-sky-900/30",
  "border-amber-300 bg-amber-50 dark:bg-amber-900/30",
  "border-violet-300 bg-violet-50 dark:bg-violet-900/30",
];

const paymentColorById = (
  id: number | null | undefined,
  paymentMethods: PaymentMethod[]
) => {
  if (!id)
    return "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300";

  const idx = paymentMethods.findIndex((pm) => pm.id === id);
  if (idx === -1) return "border-slate-200 bg-background";

  return PAYMENT_COLORS[idx % PAYMENT_COLORS.length];
};

// Precio por jugador según tipo de cancha
const getPricePerPlayer = (courtName?: string | null) => {
  if (!courtName) return 0;

  const upper = courtName.toUpperCase();

  if (upper.includes("INDOOR")) return 7000;
  if (upper.includes("OUTDOOR")) return 5000;

  // fallback si el nombre no contiene ninguna de las palabras
  return 0;
};

// ---- helpers para fetch ----
async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await fetch("/api/payment-methods?onlyActive=true&scope=COURT");
  if (!res.ok) throw new Error("Failed to fetch payment methods");
  return res.json();
}

async function fetchCourtSlots(date: string): Promise<CourtSlotDTO[]> {
  const res = await fetch(`/api/court-slots?date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch court slots");
  return res.json();
}

export default function CourtSlotsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const queryClient = useQueryClient();

  // Estado local para UI instantánea
  const [localSlots, setLocalSlots] = useState<CourtSlotDTO[]>([]);

  // Métodos de pago
  const {
    data: paymentMethods = [],
    isLoading: loadingPayments,
    isError: isPaymentMethodsError,
  } = useQuery({
    queryKey: ["payment-methods", "COURT"],
    queryFn: fetchPaymentMethods,
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
    queryFn: () => fetchCourtSlots(selectedDate),
    enabled: !!selectedDate,
    staleTime: 1000 * 60 * 2,
  });

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
    setLocalSlots(slots);
  }, [slots]);

  // Generar turnos del día
  const generateMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch("/api/court-slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });

      if (!res.ok) {
        let message = "Error generando turnos";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Turnos generados correctamente.");
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

  // Actualizar un slot
  const updateSlotMutation = useMutation({
    mutationFn: async (params: { slotId: number; patch: Partial<CourtSlotDTO> }) => {
      const res = await fetch(`/api/court-slots/${params.slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params.patch),
      });
      if (!res.ok) throw new Error("Error updating court slot");
      return (await res.json()) as CourtSlotDTO;
    },
    onMutate: async ({ slotId, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["court-slots", selectedDate] });

      const previous = queryClient.getQueryData<CourtSlotDTO[]>([
        "court-slots",
        selectedDate,
      ]);

      if (previous) {
        queryClient.setQueryData<CourtSlotDTO[]>(
          ["court-slots", selectedDate],
          previous.map((s) => (s.id === slotId ? { ...s, ...patch } : s))
        );
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["court-slots", selectedDate], ctx.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<CourtSlot[]>(
        ["court-slots", selectedDate],
        (old) => old?.map((s) => (s.id === updated.id ? updated : s)) ?? []
      );
    },
  });

  const handleGenerateDay = () => {
    generateMutation.mutate(selectedDate);
  };

  const handleRefresh = () => {
    refetchSlots();
  };

  // UI instantánea + PATCH en paralelo
  const updateSlotField = (slotId: number, patch: Partial<CourtSlotDTO>) => {
    setLocalSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot))
    );

    updateSlotMutation.mutate({ slotId, patch });
  };

  const formatTime = (t: string) => t.slice(0, 5);

  const saving = updateSlotMutation.isPending;

  const initialSlotsLoading = loadingSlots && !localSlots.length;

  // ---- Reporte del día ----
  const dayReport = useMemo(() => {
    if (!localSlots.length) {
      return {
        totalSlots: 0,
        playedSlots: 0,
        notPlayedSlots: 0,
        courts: [] as {
          courtName: string;
          totalSlots: number;
          playedSlots: number;
          notPlayedSlots: number;
        }[],
        payments: [] as {
          paymentMethodId: number;
          paymentMethodName: string;
          uses: number; // cuántos jugadores pagaron con este método
          totalAmount: number; // cuánto se cobró con este método
        }[],
      };
    }

    let totalSlots = 0;
    let playedSlots = 0;
    let notPlayedSlots = 0;

    const courtsMap = new Map<
      string,
      { totalSlots: number; playedSlots: number; notPlayedSlots: number }
    >();

    const paymentsMap = new Map<
      number,
      { name: string; uses: number; totalAmount: number }
    >();

    for (const slot of localSlots) {
      totalSlots += 1;
      if (slot.was_played) {
        playedSlots += 1;
      } else {
        notPlayedSlots += 1;
      }

      // --- resumen por cancha ---
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

      // precio por jugador según tipo de cancha
      const pricePerPlayer = getPricePerPlayer(slot.court?.name);

      // --- resumen por método de pago ---
      const playersPaymentIds = [
        slot.player1_payment_method_id,
        slot.player2_payment_method_id,
        slot.player3_payment_method_id,
        slot.player4_payment_method_id,
      ];

      for (const pmId of playersPaymentIds) {
        // Si el jugador no tiene método de pago asignado, lo ignoramos
        if (!pmId) continue;

        const pm = paymentMethods.find((p) => p.id === pmId);
        const name = pm?.name ?? `Método #${pmId}`;

        // Detectar si es un método QR (pre-pago)
        const isPrepaidQR = pm?.name
          ? pm.name.toUpperCase().includes("QR")
          : false;

        const existing = paymentsMap.get(pmId) ?? {
          name,
          uses: 0,
          totalAmount: 0,
        };

        // Siempre contamos cuántas veces se usó el método
        existing.uses += 1;

        // Solo sumamos al total si:
        // - el turno fue jugado
        // - la cancha tiene precio (> 0)
        // - el método NO es QR (porque ya estaba pago antes)
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

  const getCourtType = (courtName?: string | null) => {
    if (!courtName) return "OTRAS";

    const upper = courtName.toUpperCase();

    if (upper.includes("INDOOR")) return "INDOOR";
    if (upper.includes("OUTDOOR")) return "OUTDOOR";

    return "OTRAS";
  };

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

  const handleDownloadPdf = () => {
    if (!localSlots.length) {
      toast.error("No hay turnos para generar el reporte.");
      return;
    }

    const doc = new jsPDF();
    let y = 15;

    const dateLabel = format(new Date(selectedDate), "dd/MM/yyyy");

    // Título
    doc.setFontSize(16);
    doc.text(`Reporte de turnos - ${dateLabel}`, 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(11);

    // Resumen general
    doc.text(`Total de turnos: ${dayReport.totalSlots}`, 14, y);
    y += 6;
    doc.text(`Turnos jugados: ${dayReport.playedSlots}`, 14, y);
    y += 6;
    doc.text(`Turnos no jugados: ${dayReport.notPlayedSlots}`, 14, y);
    y += 8;

    // Recaudación
    doc.setFontSize(12);
    doc.text("Recaudación (sin QR)", 14, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(
      `$${totalRevenue.toLocaleString("es-AR")}`,
      14,
      y
    );
    y += 10;

    // Detalle por medio de pago
    doc.setFontSize(12);
    doc.text("Detalle por medio de pago", 14, y);
    y += 6;
    doc.setFontSize(10);

    if (!dayReport.payments.length) {
      doc.text("No hay pagos registrados.", 14, y);
      y += 8;
    } else {
      const orderedPayments = [...dayReport.payments].sort(
        (a, b) => b.totalAmount - a.totalAmount
      );

      orderedPayments.forEach((pm) => {
        const line = `${pm.paymentMethodName} - ${pm.uses} jug. - $${pm.totalAmount.toLocaleString(
          "es-AR"
        )}`;
        doc.text(line, 14, y);
        y += 5;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
      });
      y += 5;
    }

    // Turnos no jugados agrupados
    doc.setFontSize(12);
    doc.text("Turnos no jugados", 14, y);
    y += 6;
    doc.setFontSize(10);

    if (dayReport.notPlayedSlots === 0) {
      doc.text("Todos los turnos se jugaron.", 14, y);
      y += 8;
    } else {
      doc.text(
        `${dayReport.notPlayedSlots} turno(s) sin jugar`,
        14,
        y
      );
      y += 6;

      const printGroup = (label: string, items: string[]) => {
        if (!items.length) return;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        doc.setFont("helvetica", "bold");
        doc.text(label, 14, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text(items.join(", "), 16, y, { maxWidth: 180 });
        y += 7;
      };

      printGroup("INDOOR", notPlayedByCourtType.INDOOR);
      printGroup("OUTDOOR", notPlayedByCourtType.OUTDOOR);
      printGroup("OTRAS", notPlayedByCourtType.OTRAS);
    }

    // Nota QR
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      "Nota: Los pagos con QR se consideran prepagos y no se incluyen en la recaudación del día.",
      14,
      y,
      { maxWidth: 180 }
    );

    // Descargar
    doc.save(`reporte-turnos-${selectedDate}.pdf`);
  };

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
        {/* Layout principal: resumen al costado en desktop */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Columna izquierda: filtros, leyenda, tabla */}
          <div className="flex-1 space-y-4">
            {/* Filtros / generación */}
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
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={fetchingSlots}
                >
                  <RefreshCwIcon className="w-4 h-4 mr-1" />
                  {fetchingSlots ? "Actualizando..." : "Refrescar"}
                </Button>
              </div>

              <Button
                onClick={handleGenerateDay}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generar turnos del día
              </Button>
            </div>

            {/* Leyenda de colores */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Canchas:</span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Cancha 1
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-sky-500" />
                  Cancha 2
                </span>
              </div>

              {/* Métodos de pago o skeleton */}
              {loadingPayments && !paymentMethods.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    Métodos de pago:
                  </span>
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded-full" />
                </div>
              ) : paymentMethods.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    Métodos de pago:
                  </span>
                  {paymentMethods.map((pm, idx) => (
                    <span key={pm.id} className="inline-flex items-center gap-1">
                      <span
                        className={`
                          h-3 w-3 rounded-full border
                          ${PAYMENT_COLORS[idx % PAYMENT_COLORS.length]}
                        `}
                      />
                      {pm.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Tabla de slots */}
            <div className="overflow-x-auto">
              {initialSlotsLoading ? (
                // Skeleton de tabla de turnos
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : localSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No hay turnos generados para esta fecha.
                </p>
              ) : (
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localSlots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={slot.was_played}
                            onCheckedChange={(checked) =>
                              updateSlotField(slot.id, {
                                was_played: Boolean(checked),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <span
                            className={`
                              inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                              ${courtPillClasses(slot.court?.name)}
                            `}
                          >
                            {slot.court?.name ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(slot.slot_date),
                            "EEEE dd/MM/yyyy",
                            { locale: es }
                          ).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          {formatTime(slot.start_time)} -{" "}
                          {formatTime(slot.end_time)}
                        </TableCell>

                        {/* Jugador 1 */}
                        <TableCell className="min-w-[160px]">
                          <Select
                            value={
                              slot.player1_payment_method_id
                                ? String(slot.player1_payment_method_id)
                                : "none"
                            }
                            onValueChange={(value) =>
                              updateSlotField(slot.id, {
                                player1_payment_method_id:
                                  value === "none" ? null : Number(value),
                              })
                            }
                          >
                            <SelectTrigger
                              className={`
                                text-xs
                                ${paymentColorById(
                                  slot.player1_payment_method_id,
                                  paymentMethods
                                )}
                              `}
                            >
                              <SelectValue placeholder="Método de pago" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">SIN ASIGNAR</SelectItem>
                              {paymentMethods.map((pm) => (
                                <SelectItem key={pm.id} value={String(pm.id)}>
                                  {pm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Jugador 2 */}
                        <TableCell className="min-w-[160px]">
                          <Select
                            value={
                              slot.player2_payment_method_id
                                ? String(slot.player2_payment_method_id)
                                : "none"
                            }
                            onValueChange={(value) =>
                              updateSlotField(slot.id, {
                                player2_payment_method_id:
                                  value === "none" ? null : Number(value),
                              })
                            }
                          >
                            <SelectTrigger
                              className={`
                                text-xs
                                ${paymentColorById(
                                  slot.player2_payment_method_id,
                                  paymentMethods
                                )}
                              `}
                            >
                              <SelectValue placeholder="Método de pago" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">SIN ASIGNAR</SelectItem>
                              {paymentMethods.map((pm) => (
                                <SelectItem key={pm.id} value={String(pm.id)}>
                                  {pm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Jugador 3 */}
                        <TableCell className="min-w-[160px]">
                          <Select
                            value={
                              slot.player3_payment_method_id
                                ? String(slot.player3_payment_method_id)
                                : "none"
                            }
                            onValueChange={(value) =>
                              updateSlotField(slot.id, {
                                player3_payment_method_id:
                                  value === "none" ? null : Number(value),
                              })
                            }
                          >
                            <SelectTrigger
                              className={`
                                text-xs
                                ${paymentColorById(
                                  slot.player3_payment_method_id,
                                  paymentMethods
                                )}
                              `}
                            >
                              <SelectValue placeholder="Método de pago" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">SIN ASIGNAR</SelectItem>
                              {paymentMethods.map((pm) => (
                                <SelectItem key={pm.id} value={String(pm.id)}>
                                  {pm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Jugador 4 */}
                        <TableCell className="min-w-[160px]">
                          <Select
                            value={
                              slot.player4_payment_method_id
                                ? String(slot.player4_payment_method_id)
                                : "none"
                            }
                            onValueChange={(value) =>
                              updateSlotField(slot.id, {
                                player4_payment_method_id:
                                  value === "none" ? null : Number(value),
                              })
                            }
                          >
                            <SelectTrigger
                              className={`
                                text-xs
                                ${paymentColorById(
                                  slot.player4_payment_method_id,
                                  paymentMethods
                                )}
                              `}
                            >
                              <SelectValue placeholder="Método de pago" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">SIN ASIGNAR</SelectItem>
                              {paymentMethods.map((pm) => (
                                <SelectItem key={pm.id} value={String(pm.id)}>
                                  {pm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {saving && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Loader2Icon className="h-3 w-3 animate-spin" />
                Guardando cambios...
              </div>
            )}
          </div>

          {/* Columna derecha: resumen del día */}
          {localSlots.length > 0 && (
            <div className="w-full md:w-64 shrink-0 space-y-4">
              <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={!localSlots.length}
                >
                  Generar Reporte Diario
              </Button>
              <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <p className="text-sm font-semibold">Resumen del día</p>
                <p className="text-xs text-muted-foreground mb-2">
                  {format(new Date(selectedDate), "dd/MM/yyyy")}
                </p>

                {/* Recaudación */}
                <div className="space-y-1">
                  <p className="text-[11px] uppercase text-muted-foreground">
                    Recaudación (sin QR)
                  </p>
                  <p className="text-lg font-bold">
                    ${totalRevenue.toLocaleString("es-AR")}
                  </p>
                </div>

                {/* Detalle por método de pago */}
                {dayReport.payments.length > 0 && (
                  <div className="mt-4 space-y-1">
                    <p className="text-[11px] uppercase text-muted-foreground">
                      Por medio de pago
                    </p>
                    <div className="mt-1 space-y-1 max-h-40 overflow-y-auto pr-1">
                      {dayReport.payments
                        // opcional: ordenamos por monto descendente
                        .slice()
                        .sort((a, b) => b.totalAmount - a.totalAmount)
                        .map((pm) => (
                          <div
                            key={pm.paymentMethodId}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span className="truncate">
                              {pm.paymentMethodName}
                              <span className="text-[10px] text-muted-foreground">
                                {" "}
                                ({pm.uses} jug.)
                              </span>
                            </span>
                            <span className="font-semibold">
                              ${pm.totalAmount.toLocaleString("es-AR")}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Turnos no jugados */}
                <div className="mt-4 space-y-1">
                  <p className="text-[11px] uppercase text-muted-foreground">
                    Turnos no jugados
                  </p>

                  {dayReport.notPlayedSlots === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Todos los turnos se jugaron.
                    </p>
                  ) : (
                    <div className="mt-1 space-y-2 text-[11px]">
                      <p className="text-[10px] text-muted-foreground">
                        {dayReport.notPlayedSlots} turno(s) sin jugar
                      </p>

                      {/* INDOOR */}
                      {notPlayedByCourtType.INDOOR.length > 0 && (
                        <div>
                          <p className="font-semibold">INDOOR</p>
                          <p className="text-muted-foreground">
                            {notPlayedByCourtType.INDOOR.join(", ")}
                          </p>
                        </div>
                      )}

                      {/* OUTDOOR */}
                      {notPlayedByCourtType.OUTDOOR.length > 0 && (
                        <div>
                          <p className="font-semibold mt-1">OUTDOOR</p>
                          <p className="text-muted-foreground">
                            {notPlayedByCourtType.OUTDOOR.join(", ")}
                          </p>
                        </div>
                      )}

                      {/* Otras canchas (sin tipo) */}
                      {notPlayedByCourtType.OTRAS.length > 0 && (
                        <div>
                          <p className="font-semibold mt-1">OTRAS</p>
                          <p className="text-muted-foreground">
                            {notPlayedByCourtType.OTRAS.join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Info QR */}
                <p className="text-[10px] text-muted-foreground mt-4">
                  Los pagos con QR se consideran prepagos y no se incluyen en la
                  recaudación del día.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
