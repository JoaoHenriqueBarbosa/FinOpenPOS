import { Skeleton } from "@/components/ui/skeleton";
import { PAYMENT_COLORS, courtPillClasses } from "@/lib/court-slots-utils";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";

interface Court {
  id: number;
  name: string;
}

interface ColorLegendProps {
  paymentMethods: PaymentMethodDTO[];
  isLoadingPayments: boolean;
  courts?: Court[];
}

function getCourtColorClass(courtName: string): string {
  if (courtName.toUpperCase().includes("INDOOR")) {
    return "bg-emerald-500";
  }
  if (courtName.toUpperCase().includes("OUTDOOR")) {
    return "bg-sky-500";
  }
  return "bg-amber-500";
}

export function ColorLegend({
  paymentMethods,
  isLoadingPayments,
  courts = [],
}: ColorLegendProps) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {courts.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Canchas:</span>
          {courts.map((court) => (
            <span key={court.id} className="inline-flex items-center gap-1">
              <span className={`h-3 w-3 rounded-full ${getCourtColorClass(court.name)}`} />
              {court.name}
            </span>
          ))}
        </div>
      )}

      {isLoadingPayments && !paymentMethods.length ? (
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
  );
}

