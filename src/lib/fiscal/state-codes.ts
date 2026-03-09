/**
 * Canonical source for Brazilian IBGE state codes.
 *
 * All other modules should import state-code lookups from here
 * instead of maintaining their own copies.
 */

/** UF abbreviation -> IBGE numeric code (cUF) */
export const STATE_IBGE_CODES: Record<string, string> = {
  AC: "12", AL: "27", AP: "16", AM: "13", BA: "29",
  CE: "23", DF: "53", ES: "32", GO: "52", MA: "21",
  MT: "51", MS: "50", MG: "31", PA: "15", PB: "25",
  PR: "41", PE: "26", PI: "22", RJ: "33", RN: "24",
  RS: "43", RO: "11", RR: "14", SC: "42", SP: "35",
  SE: "28", TO: "17",
};

/** IBGE numeric code -> UF abbreviation (reverse lookup) */
export const IBGE_TO_UF: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_IBGE_CODES).map(([uf, code]) => [code, uf])
);

/**
 * Get the IBGE numeric code for a state abbreviation.
 * @throws if the UF is unknown
 */
export function getStateCode(uf: string): string {
  const code = STATE_IBGE_CODES[uf];
  if (!code) {
    throw new Error(`Unknown state abbreviation: ${uf}`);
  }
  return code;
}

/**
 * Get the UF abbreviation for an IBGE numeric code.
 * @throws if the code is unknown
 */
export function getStateByCode(code: string): string {
  const uf = IBGE_TO_UF[code];
  if (!uf) {
    throw new Error(`Unknown IBGE state code: ${code}`);
  }
  return uf;
}
