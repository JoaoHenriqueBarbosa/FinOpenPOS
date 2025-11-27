"use client";

import { useEffect, useState, useCallback } from "react";
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

type PaymentMethod = {
  id: number;
  name: string;
};

type CourtSlot = {
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
  // claros en light, suaves en dark
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


export default function CourtSlotsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [slots, setSlots] = useState<CourtSlot[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar métodos de pago una vez + slots del día seleccionado
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [pmRes] = await Promise.all([
          fetch("/api/payment-methods?onlyActive=true"),
        ]);

        if (pmRes.ok) {
          const pmData = await pmRes.json();
          setPaymentMethods(pmData);
        }
      } catch (err) {
        console.error("Error fetching payment methods:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, []);

  const fetchSlots = useCallback(
    async (date: string) => {
      try {
        setLoadingSlots(true);
        const res = await fetch(`/api/court-slots?date=${date}`);
        if (!res.ok) {
          console.error("Error fetching court slots");
          setSlots([]);
          return;
        }
        const data = await res.json();
        setSlots(data ?? []);
      } catch (err) {
        console.error("Error fetching court slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!loading) {
      fetchSlots(selectedDate);
    }
  }, [loading, selectedDate, fetchSlots]);

  const handleGenerateDay = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/court-slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (!res.ok) {
        console.error("Error generating court slots");
        return;
      }

      await fetchSlots(selectedDate);
    } catch (err) {
      console.error("Error generating court slots:", err);
    } finally {
      setGenerating(false);
    }
  };

  const updateSlotField = async (
    slotId: number,
    patch: Partial<CourtSlot>
  ) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/court-slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        console.error("Error updating court slot");
        return;
      }

      const updated: CourtSlot = await res.json();
      setSlots((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
    } catch (err) {
      console.error("Error updating court slot:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (t: string) => t.slice(0, 5); // "HH:MM:SS" -> "HH:MM"

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

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
              onClick={() => fetchSlots(selectedDate)}
            >
              <RefreshCwIcon className="w-4 h-4 mr-1" />
              Refrescar
            </Button>
          </div>

          <Button onClick={handleGenerateDay} disabled={generating}>
            {generating && (
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

          {paymentMethods.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">Métodos de pago:</span>
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
          )}
        </div>

        {/* Tabla de slots */}
        <div className="overflow-x-auto">
          {loadingSlots ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2Icon className="h-8 w-8 animate-spin" />
            </div>
          ) : slots.length === 0 ? (
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
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={slot.was_played}
                        onCheckedChange={(checked) =>
                          updateSlotField(slot.id, { was_played: Boolean(checked) })
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
                      {format(new Date(slot.slot_date), "EEEE dd/MM/yyyy", { locale: es }).toUpperCase()}
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
                            ${paymentColorById(slot.player1_payment_method_id, paymentMethods)}
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
                            ${paymentColorById(slot.player2_payment_method_id, paymentMethods)}
                          `}
                        >
                          <SelectValue placeholder="Método de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
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
                            ${paymentColorById(slot.player3_payment_method_id, paymentMethods)}
                          `}
                        >
                          <SelectValue placeholder="Método de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
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
                            ${paymentColorById(slot.player4_payment_method_id, paymentMethods)}
                          `}
                        >
                          <SelectValue placeholder="Método de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
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
      </CardContent>
    </Card>
  );
}
