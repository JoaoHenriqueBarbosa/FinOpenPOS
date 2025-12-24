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
      <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-4">
        <div>
          <h1 className="text-base font-bold">Resumen del día</h1>
          <p className="text-xs text-muted-foreground">
            {format(parseLocalDate(selectedDate), "dd/MM/yyyy")}
          </p>
        </div>

        {/* Separador */}
        <div className="border-t border-border"></div>

        {/* 1. RECAUDACIÓN */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">1. Recaudación (sin QR)</h2>
          
          {/* Detalle por método de pago */}
          {dayReport.payments.length > 0 ? (
            <div className="space-y-1.5">
              {dayReport.payments
                .slice()
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .map((pm) => (
                  <div
                    key={pm.paymentMethodId}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="truncate">
                      {pm.paymentMethodName}
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({pm.uses} jug.)
                      </span>
                    </span>
                    <span className="font-semibold">
                      ${pm.totalAmount.toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No hay pagos registrados.</p>
          )}

          {/* Total */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">TOTAL</span>
              <span className="text-base font-bold">
                ${totalRevenue.toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-border"></div>

        {/* 2. FALTAN PAGAR */}
        {dayReport.slotsWithUnpaidPlayers > 0 ? (
          <div className="space-y-2 rounded-lg border-2 border-destructive/50 bg-destructive/10 p-3 shadow-sm">
            <h2 className="text-sm font-bold text-destructive flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse"></span>
              2. Faltan pagar
            </h2>
            
            <div className="space-y-2 text-xs">
              {unpaidByCourtType.INDOOR.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-1 text-foreground">INDOOR</h3>
                  <div className="space-y-0.5 pl-2">
                    {unpaidByCourtType.INDOOR.map((slot, idx) => (
                      <p key={idx} className="text-[11px] font-medium text-destructive/90">
                        {slot.courtName} - {slot.timeRange} ({slot.unpaidCount} jug.)
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {unpaidByCourtType.OUTDOOR.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-1 text-foreground">OUTDOOR</h3>
                  <div className="space-y-0.5 pl-2">
                    {unpaidByCourtType.OUTDOOR.map((slot, idx) => (
                      <p key={idx} className="text-[11px] font-medium text-destructive/90">
                        {slot.courtName} - {slot.timeRange} ({slot.unpaidCount} jug.)
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {unpaidByCourtType.OTRAS.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-1 text-foreground">OTRAS</h3>
                  <div className="space-y-0.5 pl-2">
                    {unpaidByCourtType.OTRAS.map((slot, idx) => (
                      <p key={idx} className="text-[11px] font-medium text-destructive/90">
                        {slot.courtName} - {slot.timeRange} ({slot.unpaidCount} jug.)
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resumen */}
            <div className="pt-2 border-t border-destructive/30">
              <p className="text-xs font-bold text-destructive">
                ⚠️ Resumen: {dayReport.slotsWithUnpaidPlayers} turno(s) con{" "}
                {dayReport.totalUnpaidPlayers} jugador(es) sin método de pago
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">2. Faltan pagar</h2>
            <p className="text-xs text-muted-foreground">No hay jugadores sin pagar.</p>
          </div>
        )}

        {/* Separador */}
        <div className="border-t border-border"></div>

        {/* 3. TURNOS NO JUGADOS */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">3. Turnos no jugados</h2>

          {dayReport.notPlayedSlots === 0 ? (
            <p className="text-xs text-muted-foreground">
              Todos los turnos se jugaron.
            </p>
          ) : (
            <>
              <div className="space-y-2 text-xs">
                {notPlayedByCourtType.INDOOR.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-1">INDOOR</h3>
                    <p className="text-[11px] text-muted-foreground pl-2">
                      {notPlayedByCourtType.INDOOR.join(", ")}
                    </p>
                  </div>
                )}

                {notPlayedByCourtType.OUTDOOR.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-1">OUTDOOR</h3>
                    <p className="text-[11px] text-muted-foreground pl-2">
                      {notPlayedByCourtType.OUTDOOR.join(", ")}
                    </p>
                  </div>
                )}

                {notPlayedByCourtType.OTRAS.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-1">OTRAS</h3>
                    <p className="text-[11px] text-muted-foreground pl-2">
                      {notPlayedByCourtType.OTRAS.join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Resumen */}
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-semibold">
                  Resumen: {dayReport.notPlayedSlots} turno(s) sin jugar
                </p>
              </div>
            </>
          )}
        </div>

        {/* Info QR */}
        <div className="border-t border-border pt-2">
          <p className="text-[10px] text-muted-foreground">
            Los pagos con QR se consideran prepagos y no se incluyen en la
            recaudación del día.
          </p>
        </div>
      </div>
    </div>
  );
}

