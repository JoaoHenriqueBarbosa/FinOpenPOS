import type { PaymentMethodDTO } from "@/models/dto/payment-method";

export const PAYMENT_COLORS = [
  "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30",
  "border-sky-300 bg-sky-50 dark:bg-sky-900/30",
  "border-amber-300 bg-amber-50 dark:bg-amber-900/30",
  "border-violet-300 bg-violet-50 dark:bg-violet-900/30",
];

// Paleta de colores para canchas - se asignan por ID para ser independientes del nombre
export const COURT_COLORS = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-100",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-100",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-100",
];

// Colores para la leyenda (versión más oscura para el círculo pequeño)
export const COURT_COLORS_LEGEND = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-pink-500",
];

export function courtPillClasses(courtId?: number | null) {
  if (!courtId) {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }

  // Asignar color basado en el ID de la cancha (módulo para ciclar colores)
  return COURT_COLORS[(courtId - 1) % COURT_COLORS.length];
}

export function getCourtColorClass(courtId?: number | null): string {
  if (!courtId) {
    return "bg-slate-500";
  }
  return COURT_COLORS_LEGEND[(courtId - 1) % COURT_COLORS_LEGEND.length];
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

export function getPricePerPlayer(
  courtId?: number | null,
  startTime?: string | null,
  pricingMap?: Map<string, number>,
  courtName?: string | null // Para fallback
): number {
  if (!courtId) {
    // Fallback a valores hardcodeados si no hay court_id
    console.log(`[getPricePerPlayer] No court_id provided, using fallback for: ${courtName}`);
    if (courtName) {
      const upper = courtName.toUpperCase();
      if (upper.includes("INDOOR")) return 7000;
      if (upper.includes("OUTDOOR")) return 5000;
    }
    return 0;
  }

  // Si hay un mapa de precios, usarlo
  if (pricingMap && startTime && pricingMap.size > 0) {
    const normalizedTime = startTime.slice(0, 5); // Asegurar formato HH:MM
    
    // Debug: mostrar qué hay en el mapa para este court_id
    const courtEntries = Array.from(pricingMap.entries()).filter(([key]) => {
      const [id] = key.split("|");
      return parseInt(id, 10) === courtId;
    });
    
    if (courtName?.toUpperCase().includes("INDOOR")) {
      console.log(`[getPricePerPlayer] INDOOR court_id=${courtId} at ${normalizedTime}`);
      console.log(`[getPricePerPlayer] Pricing map size: ${pricingMap.size}, entries for this court: ${courtEntries.length}`);
      console.log(`[getPricePerPlayer] Court entries:`, courtEntries);
    }
    
    // Ordenar las entradas para procesar los rangos en orden (por start_time descendente)
    // Esto asegura que si hay solapamiento en los bordes, use el rango que empieza en ese tiempo
    const entries = Array.from(pricingMap.entries());
    const matchingEntries = entries
      .map(([key, price]) => {
        const [id, start, end] = key.split("|");
        return { id: parseInt(id, 10), start: start.slice(0, 5), end: end.slice(0, 5), price, key };
      })
      .filter(({ id, start, end, price }) => {
        if (id !== courtId) return false;
        // Incluir si el tiempo está dentro del rango
        // Si el tiempo es exactamente el start_time, incluirlo
        // Si el tiempo es exactamente el end_time, NO incluirlo (pertenece al siguiente rango)
        const matches = normalizedTime >= start && normalizedTime < end;
        if (courtName?.toUpperCase().includes("INDOOR") && matches) {
          console.log(`[getPricePerPlayer] Match found: ${start}-${end} = ${price}`);
        }
        return matches;
      })
      .sort((a, b) => b.start.localeCompare(a.start)); // Ordenar por hora de inicio descendente (más tarde primero)
    
    if (matchingEntries.length > 0) {
      // Si hay múltiples coincidencias, usar el primero (rango que empieza más tarde)
      // Esto asegura que en el borde (ej: 19:00) use el rango que empieza a las 19:00
      const selected = matchingEntries[0];
      if (courtName?.toUpperCase().includes("INDOOR")) {
        console.log(`[getPricePerPlayer] Selected: ${selected.start}-${selected.end} = ${selected.price}`);
      }
      return selected.price;
    } else {
      if (courtName?.toUpperCase().includes("INDOOR")) {
        console.log(`[getPricePerPlayer] No matches found, using fallback`);
      }
    }
  } else {
    if (courtName?.toUpperCase().includes("INDOOR")) {
      console.log(`[getPricePerPlayer] Pricing map empty or missing: map=${!!pricingMap}, startTime=${startTime}, size=${pricingMap?.size || 0}`);
    }
  }

  // Fallback a valores hardcodeados si no hay precios en DB
  if (courtName) {
    const upper = courtName.toUpperCase();
    if (upper.includes("INDOOR")) {
      console.log(`[getPricePerPlayer] Using hardcoded fallback for INDOOR: 7000`);
      return 7000;
    }
    if (upper.includes("OUTDOOR")) return 5000;
  }

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

