import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/court-slots-utils";

interface DaySummaryProps {
  selectedDate: string;
  dayReport: {
    totalSlots: number;
    playedSlots: number;
    notPlayedSlots: number;
    slotsWithUnpaidPlayers: number;
    totalUnpaidPlayers: number;
    unpaidSlots: Array<{
      id: number;
      courtName: string;
      timeRange: string;
      unpaidCount: number;
    }>;
    payments: Array<{
      paymentMethodId: number;
      paymentMethodName: string;
      uses: number;
      totalAmount: number;
    }>;
  };
  totalRevenue: number;
  notPlayedByCourtType: Record<string, string[]>;
  unpaidByCourtType: Record<string, Array<{ courtName: string; timeRange: string; unpaidCount: number }>>;
  onDownloadPdf: () => void;
  hasSlots: boolean;
}

export function DaySummary({
  selectedDate,
  dayReport,
  totalRevenue,
  notPlayedByCourtType,
  unpaidByCourtType,
  onDownloadPdf,
  hasSlots,
}: DaySummaryProps) {
  if (!hasSlots) return null;

  return (
    <div className="w-full md:w-64 shrink-0 space-y-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onDownloadPdf}
        disabled={!hasSlots}
      >
        Generar Reporte Diario
      </Button>
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-sm font-semibold">Resumen del día</p>
        <p className="text-xs text-muted-foreground mb-2">
          {format(parseLocalDate(selectedDate), "dd/MM/yyyy")}
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

        {/* Faltan pagar */}
        {dayReport.slotsWithUnpaidPlayers > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-[11px] uppercase text-muted-foreground">
              Faltan pagar
            </p>
            <p className="text-xs mb-2">
              {dayReport.slotsWithUnpaidPlayers} turno(s) con{" "}
              {dayReport.totalUnpaidPlayers} jugador(es) sin método de pago
            </p>
            <div className="mt-1 space-y-2 text-[11px]">
              {unpaidByCourtType.INDOOR.length > 0 && (
                <div>
                  <p className="font-semibold">INDOOR</p>
                  {unpaidByCourtType.INDOOR.map((slot, idx) => (
                    <p key={idx} className="text-muted-foreground text-[10px]">
                      {slot.courtName} - {slot.timeRange} ({slot.unpaidCount} jug.)
                    </p>
                  ))}
                </div>
              )}

              {unpaidByCourtType.OUTDOOR.length > 0 && (
                <div>
                  <p className="font-semibold mt-1">OUTDOOR</p>
                  {unpaidByCourtType.OUTDOOR.map((slot, idx) => (
                    <p key={idx} className="text-muted-foreground text-[10px]">
                      {slot.courtName} - {slot.timeRange} ({slot.unpaidCount} jug.)
                    </p>
                  ))}
                </div>
              )}

              {unpaidByCourtType.OTRAS.length > 0 && (
                <div>
                  <p className="font-semibold mt-1">OTRAS</p>
                  {unpaidByCourtType.OTRAS.map((slot, idx) => (
                    <p key={idx} className="text-muted-foreground text-[10px]">
                      {slot.courtName} - {slot.timeRange} ({slot.unpaidCount} jug.)
                    </p>
                  ))}
                </div>
              )}
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

              {notPlayedByCourtType.INDOOR.length > 0 && (
                <div>
                  <p className="font-semibold">INDOOR</p>
                  <p className="text-muted-foreground">
                    {notPlayedByCourtType.INDOOR.join(", ")}
                  </p>
                </div>
              )}

              {notPlayedByCourtType.OUTDOOR.length > 0 && (
                <div>
                  <p className="font-semibold mt-1">OUTDOOR</p>
                  <p className="text-muted-foreground">
                    {notPlayedByCourtType.OUTDOOR.join(", ")}
                  </p>
                </div>
              )}

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
  );
}

