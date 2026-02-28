/**
 * Drizzle returns `decimal` columns as strings.
 * This helper converts specified fields to numbers in-place.
 */
export function parseDecimals<T extends Record<string, unknown>>(
  row: T,
  ...fields: (keyof T)[]
): T {
  const copy = { ...row };
  for (const field of fields) {
    if (copy[field] != null) {
      (copy as Record<string, unknown>)[field as string] = Number(copy[field]);
    }
  }
  return copy;
}
