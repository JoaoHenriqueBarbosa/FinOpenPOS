
const localeCurrencyMap: Record<string, string> = {
  en: "USD",
  "pt-BR": "BRL",
};

function resolveLocale(locale?: string) {
  return locale ?? "en";
}

function resolveCurrency(locale: string) {
  return localeCurrencyMap[locale] ?? "USD";
}

export function formatDate(date: Date | string, locale?: string) {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return new Intl.DateTimeFormat(resolveLocale(locale)).format(date)
}

/** Format an integer amount in cents as a currency string. */
export function formatCurrency(cents: number, locale?: string) {
  const loc = resolveLocale(locale);
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency: resolveCurrency(loc),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Format an ISO date string to a short label like "Jan 5". */
export function formatShortDate(dateStr: string, locale?: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(resolveLocale(locale), { month: "short", day: "numeric" });
}
