import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { paymentColorById } from "@/lib/court-slots-utils";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";

interface PlayerPaymentSelectProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  paymentMethods: PaymentMethodDTO[];
  placeholder?: string;
}

export function PlayerPaymentSelect({
  value,
  onChange,
  paymentMethods,
  placeholder = "Método de pago",
}: PlayerPaymentSelectProps) {
  return (
    <Select
      value={value ? String(value) : "none"}
      onValueChange={(val) => onChange(val === "none" ? null : Number(val))}
    >
      <SelectTrigger
        className={`text-xs ${paymentColorById(value, paymentMethods)}`}
      >
        <SelectValue placeholder={placeholder} />
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
  );
}

