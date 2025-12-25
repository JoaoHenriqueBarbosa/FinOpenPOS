"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethodDTO[];
  selectedPaymentMethodId: number | "none";
  onSelect: (paymentMethodId: number) => void;
  disabled?: boolean;
  isLoading?: boolean;
  label?: string;
  className?: string;
}

export function PaymentMethodSelector({
  paymentMethods,
  selectedPaymentMethodId,
  onSelect,
  disabled = false,
  isLoading = false,
  label = "Método de pago",
  className = "",
}: PaymentMethodSelectorProps) {
  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>{label}</Label>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">No hay métodos de pago disponibles</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-3">
        {paymentMethods.map((pm) => (
          <Button
            key={pm.id}
            type="button"
            variant={selectedPaymentMethodId === pm.id ? "default" : "outline"}
            className="h-auto py-4 flex flex-col items-center justify-center gap-2"
            onClick={() => onSelect(pm.id)}
            disabled={disabled}
          >
            <span className="text-base font-medium">{pm.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

