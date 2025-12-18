import type { PaymentMethodDTO } from "@/models/dto/payment-method";

export const PAYMENT_COLORS = [
  "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30",
  "border-sky-300 bg-sky-50 dark:bg-sky-900/30",
  "border-amber-300 bg-amber-50 dark:bg-amber-900/30",
  "border-violet-300 bg-violet-50 dark:bg-violet-900/30",
];

export function courtPillClasses(courtName?: string | null) {
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
}

export function paymentColorById(
  id: number | null | undefined,
  paymentMethods: PaymentMethodDTO[]
) {
  if (!id)
    return "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300";

  const idx = paymentMethods.findIndex((pm) => pm.id === id);
  if (idx === -1) return "border-slate-200 bg-background";

  return PAYMENT_COLORS[idx % PAYMENT_COLORS.length];
}

export function getPricePerPlayer(courtName?: string | null) {
  if (!courtName) return 0;

  const upper = courtName.toUpperCase();

  if (upper.includes("INDOOR")) return 7000;
  if (upper.includes("OUTDOOR")) return 5000;

  // fallback si el nombre no contiene ninguna de las palabras
  return 0;
}

export function formatTime(t: string) {
  return t.slice(0, 5);
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getCourtType(courtName?: string | null) {
  if (!courtName) return "OTRAS";

  const upper = courtName.toUpperCase();

  if (upper.includes("INDOOR")) return "INDOOR";
  if (upper.includes("OUTDOOR")) return "OUTDOOR";

  return "OTRAS";
}

