import { Skeleton } from "@/components/ui/skeleton";
import { PAYMENT_COLORS } from "@/lib/court-slots-utils";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";

interface ColorLegendProps {
  paymentMethods: PaymentMethodDTO[];
  isLoadingPayments: boolean;
}

export function ColorLegend({
  paymentMethods,
  isLoadingPayments,
}: ColorLegendProps) {
  return (
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

