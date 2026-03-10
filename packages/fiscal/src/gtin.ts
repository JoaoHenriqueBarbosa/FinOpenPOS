/**
 * GTIN (barcode) validation.
 *
 * [pt-BR] Validacao de codigo de barras GTIN.
 *
 * Ported from PHP sped-nfe: src/NFe/Common/Gtin.php
 * and vendor/nfephp-org/sped-gtin/src/Gtin.php
 */

/**
 * Calculate the GTIN check digit using the standard algorithm.
 * Works for GTIN-8, GTIN-12, GTIN-13, and GTIN-14.
 */
function calculateCheckDigit(gtin: string): number {
  const len = gtin.length;
  const digits = gtin.substring(0, len - 1).padStart(15, "0");
  let total = 0;
  for (let pos = 0; pos < 15; pos++) {
    const val = parseInt(digits[pos], 10);
    // Alternating multiplier: positions 0,2,4... get x1, positions 1,3,5... get x3
    total += (((pos + 1) % 2) * 2 + 1) * val;
  }
  let dv = 10 - (total % 10);
  if (dv === 10) {
    dv = 0;
  }
  return dv;
}

/**
 * Validate a GTIN-8/12/13/14 barcode number.
 *
 * [pt-BR] Valida codigo de barras GTIN-8/12/13/14.
 *
 * - Empty string and 'SEM GTIN' are considered valid (exempt).
 * - Valid GTIN-8/12/13/14 with correct check digit returns true.
 * - Non-numeric input or invalid check digit throws an error.
 */
export function isValidGtin(gtin: string): boolean {
  if (gtin === "" || gtin === "SEM GTIN") {
    return true;
  }

  if (/[^0-9]/.test(gtin)) {
    throw new Error(`GTIN must contain only digits: "${gtin}" is not valid.`);
  }

  const len = gtin.length;
  if (len !== 8 && len !== 12 && len !== 13 && len !== 14) {
    throw new Error(
      `GTIN must be 8, 12, 13, or 14 digits. Got ${len} digits.`
    );
  }

  const expectedDv = calculateCheckDigit(gtin);
  const actualDv = parseInt(gtin[len - 1], 10);

  if (actualDv !== expectedDv) {
    throw new Error(`GTIN "${gtin}" has an invalid check digit.`);
  }

  return true;
}
