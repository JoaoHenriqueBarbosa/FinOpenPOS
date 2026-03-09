/**
 * ICMS tax XML builder module.
 *
 * Ports ALL ICMS tax variants from the PHP sped-nfe library
 * (TraitTagDetICMS.php) to TypeScript.
 *
 * Supports:
 * - CST (regime Normal): 00, 02, 10, 15, 20, 30, 40, 41, 50, 51, 53, 60, 61, 70, 90
 * - CSOSN (Simples Nacional): 101, 102, 103, 201, 202, 203, 300, 400, 500, 900
 * - ICMSPart (partition between states)
 * - ICMSST (ST repasse)
 * - ICMSUFDest (interstate destination)
 *
 * All monetary amounts are in **cents** (integer) and formatted as decimal
 * strings (e.g., 1050 -> "10.50"). Rate fields (pICMS, pFCP, etc.) are in
 * basis-points-style integers where 1800 = "18.0000" (4 decimal places) or
 * percentage-cents where 1800 = "18.00" (2 decimal places) depending on the
 * field. The caller is responsible for providing values already scaled to the
 * correct integer representation.
 */

import { formatCentsOrNull } from "./format-utils";
import { tag } from "./xml-builder";

// ── Formatting helpers ──────────────────────────────────────────────────────

/** Conditionally emit an XML tag only when `value` is not null/undefined. */
function optionalTag(name: string, value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return tag(name, {}, value);
}

/** Emit an XML tag; throws if value is null (for required fields). */
function requiredTag(name: string, value: string | null | undefined): string {
  if (value === null || value === undefined) {
    throw new Error(`Required ICMS field "${name}" is missing`);
  }
  return tag(name, {}, value);
}

/** Accumulate a value into a totals field (in cents). */
function accum(current: number, value: number | undefined | null): number {
  return current + (value ?? 0);
}

// ── Types ───────────────────────────────────────────────────────────────────

/** Tax regime: 1 or 2 = Simples Nacional (CSOSN), 3 = Normal (CST). */
export type TaxRegime = 1 | 2 | 3;

/**
 * Unified input data for all ICMS variations.
 *
 * All monetary fields are in **cents** (integer).
 * All rate/percentage fields are in **hundredths** (e.g., 1800 = 18.00%).
 * Rate fields that require 4 decimal places (pICMS, pFCP, etc.) should be
 * provided as integer * 10000 (e.g., 180000 = 18.0000%).
 */
export interface IcmsData {
  taxRegime: TaxRegime;

  // -- Common fields --
  orig: string; // Origin of goods (0-8)

  // CST (regime 3) or CSOSN (regime 1/2)
  CST?: string;
  CSOSN?: string;

  // -- Base calculation --
  modBC?: string; // BC determination method
  vBC?: number; // BC value (cents)
  pRedBC?: number; // BC reduction % (hundredths, 4dp)
  pICMS?: number; // ICMS rate (hundredths, 4dp)
  vICMS?: number; // ICMS value (cents)

  // -- FCP (Fundo de Combate a Pobreza) --
  vBCFCP?: number; // FCP BC value (cents)
  pFCP?: number; // FCP rate (hundredths, 4dp)
  vFCP?: number; // FCP value (cents)

  // -- ST (Substituicao Tributaria) --
  modBCST?: string; // ST BC determination method
  pMVAST?: number; // MVA ST % (hundredths, 4dp)
  pRedBCST?: number; // ST BC reduction % (hundredths, 4dp)
  vBCST?: number; // ST BC value (cents)
  pICMSST?: number; // ST ICMS rate (hundredths, 4dp)
  vICMSST?: number; // ST ICMS value (cents)

  // -- FCP ST --
  vBCFCPST?: number; // FCP ST BC value (cents)
  pFCPST?: number; // FCP ST rate (hundredths, 4dp)
  vFCPST?: number; // FCP ST value (cents)

  // -- Desoneration --
  vICMSDeson?: number; // Desonerated ICMS value (cents)
  motDesICMS?: string; // Desoneration reason
  indDeduzDeson?: string; // Deduct desonerated from item value (0/1)

  // -- ST desoneration --
  vICMSSTDeson?: number; // ST desonerated value (cents)
  motDesICMSST?: string; // ST desoneration reason

  // -- ST retained --
  vBCSTRet?: number; // Retained ST BC (cents)
  pST?: number; // Consumer final rate (hundredths, 4dp)
  vICMSSubstituto?: number; // Substitute own ICMS (cents)
  vICMSSTRet?: number; // Retained ST ICMS (cents)

  // -- FCP ST retained --
  vBCFCPSTRet?: number; // FCP ST retained BC (cents)
  pFCPSTRet?: number; // FCP ST retained rate (hundredths, 4dp)
  vFCPSTRet?: number; // FCP ST retained value (cents)

  // -- Effective values (CST 60, ICMSSN500) --
  pRedBCEfet?: number; // Effective BC reduction % (hundredths, 4dp)
  vBCEfet?: number; // Effective BC (cents)
  pICMSEfet?: number; // Effective rate (hundredths, 4dp)
  vICMSEfet?: number; // Effective ICMS (cents)

  // -- Deferral (CST 51, 53, 90) --
  vICMSOp?: number; // ICMS of the operation (cents)
  pDif?: number; // Deferral % (hundredths, 4dp)
  vICMSDif?: number; // Deferred ICMS value (cents)

  // -- FCP deferral (CST 51, 90) --
  pFCPDif?: number; // FCP deferral % (hundredths, 4dp)
  vFCPDif?: number; // Deferred FCP (cents)
  vFCPEfet?: number; // Effective FCP (cents)

  // -- Monofasico (CST 02, 15, 53, 61) --
  qBCMono?: number; // Mono BC quantity (hundredths, 4dp)
  adRemICMS?: number; // Ad rem rate (hundredths, 4dp)
  vICMSMono?: number; // Mono ICMS value (cents)
  vICMSMonoOp?: number; // Mono ICMS operation (cents)
  adRemICMSReten?: number; // Ad rem retention rate (hundredths, 4dp)
  qBCMonoReten?: number; // Mono BC retention qty (hundredths, 4dp)
  vICMSMonoReten?: number; // Mono ICMS retention value (cents)
  vICMSMonoDif?: number; // Mono ICMS deferred (cents)
  qBCMonoRet?: number; // Mono BC retained qty (hundredths, 4dp)
  adRemICMSRet?: number; // Ad rem retained rate (hundredths, 4dp)
  vICMSMonoRet?: number; // Mono ICMS retained value (cents)
  pRedAdRem?: number; // Ad rem reduction % (hundredths, 2dp)
  motRedAdRem?: string; // Ad rem reduction reason

  // -- Benefit code (CST 51, 90) --
  cBenefRBC?: string;

  // -- Simples Nacional credit --
  pCredSN?: number; // SN credit rate (hundredths, 2dp or 4dp)
  vCredICMSSN?: number; // SN credit value (cents)

  // -- ICMSPart fields --
  pBCOp?: number; // Own operation BC % (hundredths, 4dp)
  UFST?: string; // ST destination state

  // -- ICMSST repasse fields --
  vBCSTDest?: number; // ST BC destination (cents)
  vICMSSTDest?: number; // ST ICMS destination (cents)

  // -- ICMSUFDest fields --
  vBCUFDest?: number; // BC in destination state (cents)
  vBCFCPUFDest?: number; // FCP BC in destination state (cents)
  pFCPUFDest?: number; // FCP rate in destination (hundredths, 4dp)
  pICMSUFDest?: number; // Internal rate destination (hundredths, 4dp)
  pICMSInter?: number; // Interstate rate (hundredths, 2dp)
  pICMSInterPart?: number; // Interstate partition % (always 100)
  vFCPUFDest?: number; // FCP destination value (cents)
  vICMSUFDest?: number; // ICMS destination value (cents)
  vICMSUFRemet?: number; // ICMS sender value (cents)
}

/** Accumulated totals across all items. */
export interface IcmsTotals {
  vBC: number;
  vICMS: number;
  vICMSDeson: number;
  vBCST: number;
  vST: number;
  vFCP: number;
  vFCPST: number;
  vFCPSTRet: number;
  vFCPUFDest: number;
  vICMSUFDest: number;
  vICMSUFRemet: number;
  qBCMono: number;
  vICMSMono: number;
  qBCMonoReten: number;
  vICMSMonoReten: number;
  qBCMonoRet: number;
  vICMSMonoRet: number;
}

/** Create a zeroed-out totals object. */
export function createIcmsTotals(): IcmsTotals {
  return {
    vBC: 0,
    vICMS: 0,
    vICMSDeson: 0,
    vBCST: 0,
    vST: 0,
    vFCP: 0,
    vFCPST: 0,
    vFCPSTRet: 0,
    vFCPUFDest: 0,
    vICMSUFDest: 0,
    vICMSUFRemet: 0,
    qBCMono: 0,
    vICMSMono: 0,
    qBCMonoReten: 0,
    vICMSMonoReten: 0,
    qBCMonoRet: 0,
    vICMSMonoRet: 0,
  };
}

// ── Main builder ────────────────────────────────────────────────────────────

/**
 * Build the ICMS XML group for a single item.
 *
 * Returns the XML string (the `<ICMS>` element) and accumulated totals.
 * Callers should merge totals across items using `mergeIcmsTotals()`.
 */
export function buildIcmsXml(data: IcmsData): { xml: string; totals: IcmsTotals } {
  const totals = createIcmsTotals();

  if (data.taxRegime === 1 || data.taxRegime === 2) {
    // Simples Nacional — use CSOSN
    const csosn = data.CSOSN;
    if (!csosn) throw new Error("CSOSN is required for Simples Nacional tax regime");
    const inner = buildCsosn(data, totals);
    return { xml: tag("ICMS", {}, [inner]), totals };
  }

  // Regime Normal — use CST
  const cst = data.CST;
  if (!cst) throw new Error("CST is required for Normal tax regime");
  const inner = buildCst(data, totals);
  return { xml: tag("ICMS", {}, [inner]), totals };
}

/**
 * Build the ICMSPart XML group (partition between states).
 * Used inside `<ICMS>` for CST 10 or 90 with interstate partition.
 */
export function buildIcmsPartXml(data: IcmsData): { xml: string; totals: IcmsTotals } {
  const totals = createIcmsTotals();
  totals.vBC = accum(totals.vBC, data.vBC);
  totals.vICMS = accum(totals.vICMS, data.vICMS);
  totals.vBCST = accum(totals.vBCST, data.vBCST);
  totals.vST = accum(totals.vST, data.vICMSST);

  const children = filterNulls([
    requiredTag("orig", data.orig),
    requiredTag("CST", data.CST),
    requiredTag("modBC", data.modBC),
    requiredTag("vBC", formatCentsOrNull(data.vBC)),
    optionalTag("pRedBC", formatCentsOrNull(data.pRedBC, 4)),
    requiredTag("pICMS", formatCentsOrNull(data.pICMS, 4)),
    requiredTag("vICMS", formatCentsOrNull(data.vICMS)),
    requiredTag("modBCST", data.modBCST),
    optionalTag("pMVAST", formatCentsOrNull(data.pMVAST, 4)),
    optionalTag("pRedBCST", formatCentsOrNull(data.pRedBCST, 4)),
    requiredTag("vBCST", formatCentsOrNull(data.vBCST)),
    requiredTag("pICMSST", formatCentsOrNull(data.pICMSST, 4)),
    requiredTag("vICMSST", formatCentsOrNull(data.vICMSST)),
    optionalTag("vBCFCPST", formatCentsOrNull(data.vBCFCPST)),
    optionalTag("pFCPST", formatCentsOrNull(data.pFCPST, 4)),
    optionalTag("vFCPST", formatCentsOrNull(data.vFCPST)),
    requiredTag("pBCOp", formatCentsOrNull(data.pBCOp, 4)),
    requiredTag("UFST", data.UFST),
    optionalTag("vICMSDeson", formatCentsOrNull(data.vICMSDeson)),
    optionalTag("motDesICMS", data.motDesICMS),
    optionalTag("indDeduzDeson", data.indDeduzDeson),
  ]);

  const inner = tag("ICMSPart", {}, children);
  return { xml: tag("ICMS", {}, [inner]), totals };
}

/**
 * Build the ICMSST XML group (ST repasse).
 * Used inside `<ICMS>` for CST 41 or 60 with interstate ST repasse.
 */
export function buildIcmsStXml(data: IcmsData): { xml: string; totals: IcmsTotals } {
  const totals = createIcmsTotals();
  totals.vFCPSTRet = accum(totals.vFCPSTRet, data.vFCPSTRet);

  const children = filterNulls([
    requiredTag("orig", data.orig),
    requiredTag("CST", data.CST),
    requiredTag("vBCSTRet", formatCentsOrNull(data.vBCSTRet)),
    optionalTag("pST", formatCentsOrNull(data.pST, 4)),
    optionalTag("vICMSSubstituto", formatCentsOrNull(data.vICMSSubstituto)),
    requiredTag("vICMSSTRet", formatCentsOrNull(data.vICMSSTRet)),
    optionalTag("vBCFCPSTRet", formatCentsOrNull(data.vBCFCPSTRet)),
    optionalTag("pFCPSTRet", formatCentsOrNull(data.pFCPSTRet, 4)),
    optionalTag("vFCPSTRet", formatCentsOrNull(data.vFCPSTRet)),
    requiredTag("vBCSTDest", formatCentsOrNull(data.vBCSTDest)),
    requiredTag("vICMSSTDest", formatCentsOrNull(data.vICMSSTDest)),
    optionalTag("pRedBCEfet", formatCentsOrNull(data.pRedBCEfet, 4)),
    optionalTag("vBCEfet", formatCentsOrNull(data.vBCEfet)),
    optionalTag("pICMSEfet", formatCentsOrNull(data.pICMSEfet, 4)),
    optionalTag("vICMSEfet", formatCentsOrNull(data.vICMSEfet)),
  ]);

  const inner = tag("ICMSST", {}, children);
  return { xml: tag("ICMS", {}, [inner]), totals };
}

/**
 * Build the ICMSUFDest XML group (interstate to final consumer).
 * This is a sibling of `<ICMS>`, placed directly inside `<imposto>`.
 */
export function buildIcmsUfDestXml(data: IcmsData): { xml: string; totals: IcmsTotals } {
  const totals = createIcmsTotals();
  totals.vICMSUFDest = accum(totals.vICMSUFDest, data.vICMSUFDest);
  totals.vFCPUFDest = accum(totals.vFCPUFDest, data.vFCPUFDest);
  totals.vICMSUFRemet = accum(totals.vICMSUFRemet, data.vICMSUFRemet);

  const children = filterNulls([
    requiredTag("vBCUFDest", formatCentsOrNull(data.vBCUFDest)),
    optionalTag("vBCFCPUFDest", formatCentsOrNull(data.vBCFCPUFDest)),
    optionalTag("pFCPUFDest", formatCentsOrNull(data.pFCPUFDest, 4)),
    requiredTag("pICMSUFDest", formatCentsOrNull(data.pICMSUFDest, 4)),
    requiredTag("pICMSInter", formatCentsOrNull(data.pICMSInter, 2)),
    requiredTag("pICMSInterPart", "100.0000"),
    optionalTag("vFCPUFDest", formatCentsOrNull(data.vFCPUFDest)),
    requiredTag("vICMSUFDest", formatCentsOrNull(data.vICMSUFDest)),
    requiredTag("vICMSUFRemet", formatCentsOrNull(data.vICMSUFRemet ?? 0)),
  ]);

  return { xml: tag("ICMSUFDest", {}, children), totals };
}

/**
 * Merge item-level totals into an accumulator.
 */
export function mergeIcmsTotals(target: IcmsTotals, source: IcmsTotals): void {
  target.vBC += source.vBC;
  target.vICMS += source.vICMS;
  target.vICMSDeson += source.vICMSDeson;
  target.vBCST += source.vBCST;
  target.vST += source.vST;
  target.vFCP += source.vFCP;
  target.vFCPST += source.vFCPST;
  target.vFCPSTRet += source.vFCPSTRet;
  target.vFCPUFDest += source.vFCPUFDest;
  target.vICMSUFDest += source.vICMSUFDest;
  target.vICMSUFRemet += source.vICMSUFRemet;
  target.qBCMono += source.qBCMono;
  target.vICMSMono += source.vICMSMono;
  target.qBCMonoReten += source.qBCMonoReten;
  target.vICMSMonoReten += source.vICMSMonoReten;
  target.qBCMonoRet += source.qBCMonoRet;
  target.vICMSMonoRet += source.vICMSMonoRet;
}

// ── CST builders (regime Normal) ────────────────────────────────────────────

function buildCst(data: IcmsData, totals: IcmsTotals): string {
  switch (data.CST) {
    case "00":
      return buildCst00(data, totals);
    case "02":
      return buildCst02(data, totals);
    case "10":
      return buildCst10(data, totals);
    case "15":
      return buildCst15(data, totals);
    case "20":
      return buildCst20(data, totals);
    case "30":
      return buildCst30(data, totals);
    case "40":
    case "41":
    case "50":
      return buildCst40(data, totals);
    case "51":
      return buildCst51(data, totals);
    case "53":
      return buildCst53(data, totals);
    case "60":
      return buildCst60(data, totals);
    case "61":
      return buildCst61(data, totals);
    case "70":
      return buildCst70(data, totals);
    case "90":
      return buildCst90(data, totals);
    default:
      throw new Error(`Unsupported ICMS CST: ${data.CST}`);
  }
}

/** CST 00 — Tributada integralmente */
function buildCst00(d: IcmsData, t: IcmsTotals): string {
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return tag("ICMS00", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    requiredTag("modBC", d.modBC),
    requiredTag("vBC", formatCentsOrNull(d.vBC)),
    requiredTag("pICMS", formatCentsOrNull(d.pICMS, 4)),
    requiredTag("vICMS", formatCentsOrNull(d.vICMS)),
    optionalTag("pFCP", formatCentsOrNull(d.pFCP, 4)),
    optionalTag("vFCP", formatCentsOrNull(d.vFCP)),
  ]));
}

/** CST 02 — Tributacao monofasica propria sobre combustiveis */
function buildCst02(d: IcmsData, t: IcmsTotals): string {
  t.qBCMono = accum(t.qBCMono, d.qBCMono);
  t.vICMSMono = accum(t.vICMSMono, d.vICMSMono);

  return tag("ICMS02", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    optionalTag("qBCMono", formatCentsOrNull(d.qBCMono, 4)),
    requiredTag("adRemICMS", formatCentsOrNull(d.adRemICMS, 4)),
    requiredTag("vICMSMono", formatCentsOrNull(d.vICMSMono)),
  ]));
}

/** CST 10 — Tributada e com cobranca do ICMS por ST */
function buildCst10(d: IcmsData, t: IcmsTotals): string {
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);
  t.vFCPST = accum(t.vFCPST, d.vFCPST);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return tag("ICMS10", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    requiredTag("modBC", d.modBC),
    requiredTag("vBC", formatCentsOrNull(d.vBC)),
    requiredTag("pICMS", formatCentsOrNull(d.pICMS, 4)),
    requiredTag("vICMS", formatCentsOrNull(d.vICMS)),
    optionalTag("vBCFCP", formatCentsOrNull(d.vBCFCP)),
    optionalTag("pFCP", formatCentsOrNull(d.pFCP, 4)),
    optionalTag("vFCP", formatCentsOrNull(d.vFCP)),
    requiredTag("modBCST", d.modBCST),
    optionalTag("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalTag("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    requiredTag("vBCST", formatCentsOrNull(d.vBCST)),
    requiredTag("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    requiredTag("vICMSST", formatCentsOrNull(d.vICMSST)),
    optionalTag("vBCFCPST", formatCentsOrNull(d.vBCFCPST)),
    optionalTag("pFCPST", formatCentsOrNull(d.pFCPST, 4)),
    optionalTag("vFCPST", formatCentsOrNull(d.vFCPST)),
    optionalTag("vICMSSTDeson", formatCentsOrNull(d.vICMSSTDeson)),
    optionalTag("motDesICMSST", d.motDesICMSST),
  ]));
}

/** CST 15 — Tributacao monofasica propria e com responsabilidade pela retencao sobre combustiveis */
function buildCst15(d: IcmsData, t: IcmsTotals): string {
  t.qBCMono = accum(t.qBCMono, d.qBCMono);
  t.vICMSMono = accum(t.vICMSMono, d.vICMSMono);
  t.qBCMonoReten = accum(t.qBCMonoReten, d.qBCMonoReten);
  t.vICMSMonoReten = accum(t.vICMSMonoReten, d.vICMSMonoReten);

  const children = filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    optionalTag("qBCMono", formatCentsOrNull(d.qBCMono, 4)),
    requiredTag("adRemICMS", formatCentsOrNull(d.adRemICMS, 4)),
    requiredTag("vICMSMono", formatCentsOrNull(d.vICMSMono)),
    optionalTag("qBCMonoReten", formatCentsOrNull(d.qBCMonoReten, 4)),
    requiredTag("adRemICMSReten", formatCentsOrNull(d.adRemICMSReten, 4)),
    requiredTag("vICMSMonoReten", formatCentsOrNull(d.vICMSMonoReten)),
  ]);

  if (d.pRedAdRem != null) {
    children.push(requiredTag("pRedAdRem", formatCentsOrNull(d.pRedAdRem)));
    children.push(requiredTag("motRedAdRem", d.motRedAdRem));
  }

  return tag("ICMS15", {}, children);
}

/** CST 20 — Com reducao de base de calculo */
function buildCst20(d: IcmsData, t: IcmsTotals): string {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return tag("ICMS20", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    requiredTag("modBC", d.modBC),
    requiredTag("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    requiredTag("vBC", formatCentsOrNull(d.vBC)),
    requiredTag("pICMS", formatCentsOrNull(d.pICMS, 4)),
    requiredTag("vICMS", formatCentsOrNull(d.vICMS)),
    optionalTag("vBCFCP", formatCentsOrNull(d.vBCFCP)),
    optionalTag("pFCP", formatCentsOrNull(d.pFCP, 4)),
    optionalTag("vFCP", formatCentsOrNull(d.vFCP)),
    optionalTag("vICMSDeson", formatCentsOrNull(d.vICMSDeson)),
    optionalTag("motDesICMS", d.motDesICMS),
    optionalTag("indDeduzDeson", d.indDeduzDeson),
  ]));
}

/** CST 30 — Isenta ou nao tributada e com cobranca do ICMS por ST */
function buildCst30(d: IcmsData, t: IcmsTotals): string {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);
  t.vFCPST = accum(t.vFCPST, d.vFCPST);

  return tag("ICMS30", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    requiredTag("modBCST", d.modBCST),
    optionalTag("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalTag("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    requiredTag("vBCST", formatCentsOrNull(d.vBCST)),
    requiredTag("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    requiredTag("vICMSST", formatCentsOrNull(d.vICMSST)),
    optionalTag("vBCFCPST", formatCentsOrNull(d.vBCFCPST)),
    optionalTag("pFCPST", formatCentsOrNull(d.pFCPST, 4)),
    optionalTag("vFCPST", formatCentsOrNull(d.vFCPST)),
    optionalTag("vICMSDeson", formatCentsOrNull(d.vICMSDeson)),
    optionalTag("motDesICMS", d.motDesICMS),
    optionalTag("indDeduzDeson", d.indDeduzDeson),
  ]));
}

/** CST 40/41/50 — Isenta / Nao tributada / Suspensao */
function buildCst40(d: IcmsData, t: IcmsTotals): string {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);

  return tag("ICMS40", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    optionalTag("vICMSDeson", formatCentsOrNull(d.vICMSDeson)),
    optionalTag("motDesICMS", d.motDesICMS),
    optionalTag("indDeduzDeson", d.indDeduzDeson),
  ]));
}

/** CST 51 — Diferimento */
function buildCst51(d: IcmsData, t: IcmsTotals): string {
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return tag("ICMS51", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    optionalTag("modBC", d.modBC),
    optionalTag("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    optionalTag("cBenefRBC", d.cBenefRBC),
    optionalTag("vBC", formatCentsOrNull(d.vBC)),
    optionalTag("pICMS", formatCentsOrNull(d.pICMS, 4)),
    optionalTag("vICMSOp", formatCentsOrNull(d.vICMSOp)),
    optionalTag("pDif", formatCentsOrNull(d.pDif, 4)),
    optionalTag("vICMSDif", formatCentsOrNull(d.vICMSDif)),
    optionalTag("vICMS", formatCentsOrNull(d.vICMS)),
    optionalTag("vBCFCP", formatCentsOrNull(d.vBCFCP)),
    optionalTag("pFCP", formatCentsOrNull(d.pFCP, 4)),
    optionalTag("vFCP", formatCentsOrNull(d.vFCP)),
    optionalTag("pFCPDif", formatCentsOrNull(d.pFCPDif)),
    optionalTag("vFCPDif", formatCentsOrNull(d.vFCPDif)),
    optionalTag("vFCPEfet", formatCentsOrNull(d.vFCPEfet)),
  ]));
}

/** CST 53 — Tributacao monofasica sobre combustiveis com recolhimento diferido */
function buildCst53(d: IcmsData, t: IcmsTotals): string {
  t.qBCMono = accum(t.qBCMono, d.qBCMono);
  t.vICMSMono = accum(t.vICMSMono, d.vICMSMono);
  t.qBCMonoReten = accum(t.qBCMonoReten, d.qBCMonoReten);
  t.vICMSMonoReten = accum(t.vICMSMonoReten, d.vICMSMonoReten);

  return tag("ICMS53", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    optionalTag("qBCMono", formatCentsOrNull(d.qBCMono, 4)),
    optionalTag("adRemICMS", formatCentsOrNull(d.adRemICMS, 4)),
    optionalTag("vICMSMonoOp", formatCentsOrNull(d.vICMSMonoOp)),
    optionalTag("pDif", formatCentsOrNull(d.pDif, 4)),
    optionalTag("vICMSMonoDif", formatCentsOrNull(d.vICMSMonoDif)),
    optionalTag("vICMSMono", formatCentsOrNull(d.vICMSMono)),
  ]));
}

/** CST 60 — ICMS cobrado anteriormente por ST */
function buildCst60(d: IcmsData, t: IcmsTotals): string {
  t.vFCPSTRet = accum(t.vFCPSTRet, d.vFCPSTRet);

  return tag("ICMS60", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    optionalTag("vBCSTRet", formatCentsOrNull(d.vBCSTRet)),
    optionalTag("pST", formatCentsOrNull(d.pST, 4)),
    optionalTag("vICMSSubstituto", formatCentsOrNull(d.vICMSSubstituto)),
    optionalTag("vICMSSTRet", formatCentsOrNull(d.vICMSSTRet)),
    optionalTag("vBCFCPSTRet", formatCentsOrNull(d.vBCFCPSTRet)),
    optionalTag("pFCPSTRet", formatCentsOrNull(d.pFCPSTRet, 4)),
    optionalTag("vFCPSTRet", formatCentsOrNull(d.vFCPSTRet)),
    optionalTag("pRedBCEfet", formatCentsOrNull(d.pRedBCEfet, 4)),
    optionalTag("vBCEfet", formatCentsOrNull(d.vBCEfet)),
    optionalTag("pICMSEfet", formatCentsOrNull(d.pICMSEfet, 4)),
    optionalTag("vICMSEfet", formatCentsOrNull(d.vICMSEfet)),
  ]));
}

/** CST 61 — Tributacao monofasica sobre combustiveis cobrada anteriormente */
function buildCst61(d: IcmsData, t: IcmsTotals): string {
  t.qBCMonoRet = accum(t.qBCMonoRet, d.qBCMonoRet);
  t.vICMSMonoRet = accum(t.vICMSMonoRet, d.vICMSMonoRet);

  return tag("ICMS61", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    optionalTag("qBCMonoRet", formatCentsOrNull(d.qBCMonoRet, 4)),
    requiredTag("adRemICMSRet", formatCentsOrNull(d.adRemICMSRet, 4)),
    requiredTag("vICMSMonoRet", formatCentsOrNull(d.vICMSMonoRet)),
  ]));
}

/** CST 70 — Reducao de BC e cobranca do ICMS por ST */
function buildCst70(d: IcmsData, t: IcmsTotals): string {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);
  t.vFCPST = accum(t.vFCPST, d.vFCPST);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return tag("ICMS70", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    requiredTag("modBC", d.modBC),
    requiredTag("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    requiredTag("vBC", formatCentsOrNull(d.vBC)),
    requiredTag("pICMS", formatCentsOrNull(d.pICMS, 4)),
    requiredTag("vICMS", formatCentsOrNull(d.vICMS)),
    optionalTag("vBCFCP", formatCentsOrNull(d.vBCFCP)),
    optionalTag("pFCP", formatCentsOrNull(d.pFCP, 4)),
    optionalTag("vFCP", formatCentsOrNull(d.vFCP)),
    requiredTag("modBCST", d.modBCST),
    optionalTag("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalTag("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    requiredTag("vBCST", formatCentsOrNull(d.vBCST)),
    requiredTag("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    requiredTag("vICMSST", formatCentsOrNull(d.vICMSST)),
    optionalTag("vBCFCPST", formatCentsOrNull(d.vBCFCPST)),
    optionalTag("pFCPST", formatCentsOrNull(d.pFCPST, 4)),
    optionalTag("vFCPST", formatCentsOrNull(d.vFCPST)),
    optionalTag("vICMSDeson", formatCentsOrNull(d.vICMSDeson)),
    optionalTag("motDesICMS", d.motDesICMS),
    optionalTag("indDeduzDeson", d.indDeduzDeson),
    optionalTag("vICMSSTDeson", formatCentsOrNull(d.vICMSSTDeson)),
    optionalTag("motDesICMSST", d.motDesICMSST),
  ]));
}

/** CST 90 — Outros */
function buildCst90(d: IcmsData, t: IcmsTotals): string {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);
  t.vFCPST = accum(t.vFCPST, d.vFCPST);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return tag("ICMS90", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CST", d.CST),
    optionalTag("modBC", d.modBC),
    optionalTag("vBC", formatCentsOrNull(d.vBC)),
    optionalTag("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    optionalTag("cBenefRBC", d.cBenefRBC),
    optionalTag("pICMS", formatCentsOrNull(d.pICMS, 4)),
    optionalTag("vICMSOp", formatCentsOrNull(d.vICMSOp)),
    optionalTag("pDif", formatCentsOrNull(d.pDif)),
    optionalTag("vICMSDif", formatCentsOrNull(d.vICMSDif)),
    optionalTag("vICMS", formatCentsOrNull(d.vICMS)),
    optionalTag("vBCFCP", formatCentsOrNull(d.vBCFCP)),
    optionalTag("pFCP", formatCentsOrNull(d.pFCP, 4)),
    optionalTag("vFCP", formatCentsOrNull(d.vFCP)),
    optionalTag("pFCPDif", formatCentsOrNull(d.pFCPDif, 4)),
    optionalTag("vFCPDif", formatCentsOrNull(d.vFCPDif)),
    optionalTag("vFCPEfet", formatCentsOrNull(d.vFCPEfet)),
    optionalTag("modBCST", d.modBCST),
    optionalTag("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalTag("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    optionalTag("vBCST", formatCentsOrNull(d.vBCST)),
    optionalTag("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    optionalTag("vICMSST", formatCentsOrNull(d.vICMSST)),
    optionalTag("vBCFCPST", formatCentsOrNull(d.vBCFCPST)),
    optionalTag("pFCPST", formatCentsOrNull(d.pFCPST, 4)),
    optionalTag("vFCPST", formatCentsOrNull(d.vFCPST)),
    optionalTag("vICMSDeson", formatCentsOrNull(d.vICMSDeson)),
    optionalTag("motDesICMS", d.motDesICMS),
    optionalTag("indDeduzDeson", d.indDeduzDeson),
    optionalTag("vICMSSTDeson", formatCentsOrNull(d.vICMSSTDeson)),
    optionalTag("motDesICMSST", d.motDesICMSST),
  ]));
}

// ── CSOSN builders (Simples Nacional) ───────────────────────────────────────

function buildCsosn(data: IcmsData, totals: IcmsTotals): string {
  // Generic SN totals
  totals.vFCPST = accum(totals.vFCPST, data.vFCPST);
  totals.vFCPSTRet = accum(totals.vFCPSTRet, data.vFCPSTRet);

  switch (data.CSOSN) {
    case "101":
      return buildCsosn101(data, totals);
    case "102":
    case "103":
    case "300":
    case "400":
      return buildCsosn102(data, totals);
    case "201":
      return buildCsosn201(data, totals);
    case "202":
    case "203":
      return buildCsosn202(data, totals);
    case "500":
      return buildCsosn500(data, totals);
    case "900":
      return buildCsosn900(data, totals);
    default:
      throw new Error(`Unsupported ICMS CSOSN: ${data.CSOSN}`);
  }
}

/** CSOSN 101 — Tributada pelo Simples Nacional com permissao de credito */
function buildCsosn101(d: IcmsData, _t: IcmsTotals): string {
  return tag("ICMSSN101", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CSOSN", d.CSOSN),
    requiredTag("pCredSN", formatCentsOrNull(d.pCredSN, 2)),
    requiredTag("vCredICMSSN", formatCentsOrNull(d.vCredICMSSN)),
  ]));
}

/** CSOSN 102/103/300/400 — Tributada sem permissao de credito / Imune / Nao tributada */
function buildCsosn102(d: IcmsData, _t: IcmsTotals): string {
  return tag("ICMSSN102", {}, filterNulls([
    optionalTag("orig", d.orig), // may be null for CRT=4
    requiredTag("CSOSN", d.CSOSN),
  ]));
}

/** CSOSN 201 — Tributada com permissao de credito e com cobranca do ICMS por ST */
function buildCsosn201(d: IcmsData, t: IcmsTotals): string {
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);

  return tag("ICMSSN201", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CSOSN", d.CSOSN),
    requiredTag("modBCST", d.modBCST),
    optionalTag("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalTag("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    requiredTag("vBCST", formatCentsOrNull(d.vBCST)),
    requiredTag("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    requiredTag("vICMSST", formatCentsOrNull(d.vICMSST)),
    optionalTag("vBCFCPST", formatCentsOrNull(d.vBCFCPST)),
    optionalTag("pFCPST", formatCentsOrNull(d.pFCPST, 4)),
    optionalTag("vFCPST", formatCentsOrNull(d.vFCPST)),
    optionalTag("pCredSN", formatCentsOrNull(d.pCredSN, 4)),
    optionalTag("vCredICMSSN", formatCentsOrNull(d.vCredICMSSN)),
  ]));
}

/** CSOSN 202/203 — Tributada sem permissao de credito e com cobranca do ICMS por ST */
function buildCsosn202(d: IcmsData, t: IcmsTotals): string {
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);

  return tag("ICMSSN202", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CSOSN", d.CSOSN),
    requiredTag("modBCST", d.modBCST),
    optionalTag("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalTag("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    requiredTag("vBCST", formatCentsOrNull(d.vBCST)),
    requiredTag("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    requiredTag("vICMSST", formatCentsOrNull(d.vICMSST)),
    optionalTag("vBCFCPST", formatCentsOrNull(d.vBCFCPST)),
    optionalTag("pFCPST", formatCentsOrNull(d.pFCPST, 4)),
    optionalTag("vFCPST", formatCentsOrNull(d.vFCPST)),
  ]));
}

/** CSOSN 500 — ICMS cobrado anteriormente por ST ou por antecipacao */
function buildCsosn500(d: IcmsData, _t: IcmsTotals): string {
  return tag("ICMSSN500", {}, filterNulls([
    requiredTag("orig", d.orig),
    requiredTag("CSOSN", d.CSOSN),
    optionalTag("vBCSTRet", formatCentsOrNull(d.vBCSTRet)),
    optionalTag("pST", formatCentsOrNull(d.pST, 4)),
    optionalTag("vICMSSubstituto", formatCentsOrNull(d.vICMSSubstituto)),
    optionalTag("vICMSSTRet", formatCentsOrNull(d.vICMSSTRet)),
    optionalTag("vBCFCPSTRet", formatCentsOrNull(d.vBCFCPSTRet, 2)),
    optionalTag("pFCPSTRet", formatCentsOrNull(d.pFCPSTRet, 4)),
    optionalTag("vFCPSTRet", formatCentsOrNull(d.vFCPSTRet)),
    optionalTag("pRedBCEfet", formatCentsOrNull(d.pRedBCEfet, 4)),
    optionalTag("vBCEfet", formatCentsOrNull(d.vBCEfet)),
    optionalTag("pICMSEfet", formatCentsOrNull(d.pICMSEfet, 4)),
    optionalTag("vICMSEfet", formatCentsOrNull(d.vICMSEfet)),
  ]));
}

/** CSOSN 900 — Outros */
function buildCsosn900(d: IcmsData, t: IcmsTotals): string {
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);

  return tag("ICMSSN900", {}, filterNulls([
    optionalTag("orig", d.orig), // may be null for CRT=4
    requiredTag("CSOSN", d.CSOSN),
    optionalTag("modBC", d.modBC),
    optionalTag("vBC", formatCentsOrNull(d.vBC)),
    optionalTag("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    optionalTag("pICMS", formatCentsOrNull(d.pICMS, 4)),
    optionalTag("vICMS", formatCentsOrNull(d.vICMS)),
    optionalTag("modBCST", d.modBCST),
    optionalTag("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalTag("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    optionalTag("vBCST", formatCentsOrNull(d.vBCST)),
    optionalTag("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    optionalTag("vICMSST", formatCentsOrNull(d.vICMSST)),
    optionalTag("vBCFCPST", formatCentsOrNull(d.vBCFCPST)),
    optionalTag("pFCPST", formatCentsOrNull(d.pFCPST, 4)),
    optionalTag("vFCPST", formatCentsOrNull(d.vFCPST)),
    optionalTag("pCredSN", formatCentsOrNull(d.pCredSN, 4)),
    optionalTag("vCredICMSSN", formatCentsOrNull(d.vCredICMSSN)),
  ]));
}

// ── Utilities ───────────────────────────────────────────────────────────────

/** Remove null entries from an array of optional tag results. */
function filterNulls(arr: (string | null)[]): string[] {
  return arr.filter((x): x is string => x !== null);
}
