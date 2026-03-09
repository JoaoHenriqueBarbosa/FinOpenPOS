/**
 * Shared formatting utilities for fiscal XML generation.
 *
 * All monetary amounts are stored as integers (cents). Rate/percentage fields
 * are stored as scaled integers. These helpers convert them to the decimal
 * strings required by the SEFAZ XML schema.
 */

/** Format cents integer to decimal string. E.g. 1050 → "10.50" */
export function formatCents(cents: number, decimalPlaces = 2): string {
  return (cents / 100).toFixed(decimalPlaces);
}

/** Format a number with N decimal places. */
export function formatDecimal(value: number, decimalPlaces: number): string {
  return value.toFixed(decimalPlaces);
}

/** Format rate stored as hundredths to decimal string. E.g. 1800 → "18.0000" */
export function formatRate(hundredths: number, decimalPlaces = 4): string {
  return (hundredths / 100).toFixed(decimalPlaces);
}

/** Format rate stored as value * 10000 to 4-decimal string. E.g. 16500 → "1.6500" */
export function formatRate4(value: number): string {
  return (value / 10000).toFixed(4);
}

/** Format cents to decimal string, returning null for null/undefined input. */
export function formatCentsOrNull(cents: number | undefined | null, decimalPlaces = 2): string | null {
  if (cents === undefined || cents === null) return null;
  return formatCents(cents, decimalPlaces);
}

/** Format cents to decimal string, defaulting to "0.00" (or appropriate zero) for null/undefined. */
export function formatCentsOrZero(cents: number | undefined, decimalPlaces = 2): string {
  if (cents == null) return (0).toFixed(decimalPlaces);
  return formatCents(cents, decimalPlaces);
}

/** Format rate4 (value * 10000) to 4-decimal string, defaulting to "0.0000" for null/undefined. */
export function formatRate4OrZero(value: number | undefined): string {
  if (value == null) return (0).toFixed(4);
  return formatRate4(value);
}
