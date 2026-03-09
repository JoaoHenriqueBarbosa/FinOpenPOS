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
import {
  type TaxElement,
  type TaxField,
  optionalField,
  requiredField,
  filterFields,
  serializeTaxElement,
} from "./tax-element";

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
/**
 * Calculate ICMS for a single item (domain logic, no XML dependency).
 * Returns structured TaxElement + accumulated totals.
 */
export function calculateIcms(data: IcmsData): { element: TaxElement; totals: IcmsTotals } {
  const totals = createIcmsTotals();

  if (data.taxRegime === 1 || data.taxRegime === 2) {
    const csosn = data.CSOSN;
    if (!csosn) throw new Error("CSOSN is required for Simples Nacional tax regime");
    const inner = calculateCsosn(data, totals);
    return {
      element: { outerTag: "ICMS", outerFields: [], variantTag: inner.variantTag, fields: inner.fields },
      totals,
    };
  }

  const cst = data.CST;
  if (!cst) throw new Error("CST is required for Normal tax regime");
  const inner = calculateCst(data, totals);
  return {
    element: { outerTag: "ICMS", outerFields: [], variantTag: inner.variantTag, fields: inner.fields },
    totals,
  };
}

/**
 * Build ICMS XML string (backward-compatible wrapper).
 */
export function buildIcmsXml(data: IcmsData): { xml: string; totals: IcmsTotals } {
  const { element, totals } = calculateIcms(data);
  return { xml: serializeTaxElement(element), totals };
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

  const fields = filterFields([
    requiredField("orig", data.orig),
    requiredField("CST", data.CST),
    requiredField("modBC", data.modBC),
    requiredField("vBC", formatCentsOrNull(data.vBC)),
    optionalField("pRedBC", formatCentsOrNull(data.pRedBC, 4)),
    requiredField("pICMS", formatCentsOrNull(data.pICMS, 4)),
    requiredField("vICMS", formatCentsOrNull(data.vICMS)),
    ...stFields(data),
    ...fcpStFields(data),
    requiredField("pBCOp", formatCentsOrNull(data.pBCOp, 4)),
    requiredField("UFST", data.UFST),
    ...desonerationFields(data),
  ]);

  const element: TaxElement = { outerTag: "ICMS", outerFields: [], variantTag: "ICMSPart", fields };
  return { xml: serializeTaxElement(element), totals };
}

/**
 * Build the ICMSST XML group (ST repasse).
 * Used inside `<ICMS>` for CST 41 or 60 with interstate ST repasse.
 */
export function buildIcmsStXml(data: IcmsData): { xml: string; totals: IcmsTotals } {
  const totals = createIcmsTotals();
  totals.vFCPSTRet = accum(totals.vFCPSTRet, data.vFCPSTRet);

  const fields = filterFields([
    requiredField("orig", data.orig),
    requiredField("CST", data.CST),
    requiredField("vBCSTRet", formatCentsOrNull(data.vBCSTRet)),
    optionalField("pST", formatCentsOrNull(data.pST, 4)),
    optionalField("vICMSSubstituto", formatCentsOrNull(data.vICMSSubstituto)),
    requiredField("vICMSSTRet", formatCentsOrNull(data.vICMSSTRet)),
    optionalField("vBCFCPSTRet", formatCentsOrNull(data.vBCFCPSTRet)),
    optionalField("pFCPSTRet", formatCentsOrNull(data.pFCPSTRet, 4)),
    optionalField("vFCPSTRet", formatCentsOrNull(data.vFCPSTRet)),
    requiredField("vBCSTDest", formatCentsOrNull(data.vBCSTDest)),
    requiredField("vICMSSTDest", formatCentsOrNull(data.vICMSSTDest)),
    optionalField("pRedBCEfet", formatCentsOrNull(data.pRedBCEfet, 4)),
    optionalField("vBCEfet", formatCentsOrNull(data.vBCEfet)),
    optionalField("pICMSEfet", formatCentsOrNull(data.pICMSEfet, 4)),
    optionalField("vICMSEfet", formatCentsOrNull(data.vICMSEfet)),
  ]);

  const element: TaxElement = { outerTag: "ICMS", outerFields: [], variantTag: "ICMSST", fields };
  return { xml: serializeTaxElement(element), totals };
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

  const fields = filterFields([
    requiredField("vBCUFDest", formatCentsOrNull(data.vBCUFDest)),
    optionalField("vBCFCPUFDest", formatCentsOrNull(data.vBCFCPUFDest)),
    optionalField("pFCPUFDest", formatCentsOrNull(data.pFCPUFDest, 4)),
    requiredField("pICMSUFDest", formatCentsOrNull(data.pICMSUFDest, 4)),
    requiredField("pICMSInter", formatCentsOrNull(data.pICMSInter, 2)),
    requiredField("pICMSInterPart", "100.0000"),
    optionalField("vFCPUFDest", formatCentsOrNull(data.vFCPUFDest)),
    requiredField("vICMSUFDest", formatCentsOrNull(data.vICMSUFDest)),
    requiredField("vICMSUFRemet", formatCentsOrNull(data.vICMSUFRemet ?? 0)),
  ]);

  const element: TaxElement = { outerTag: null, outerFields: [], variantTag: "ICMSUFDest", fields };
  return { xml: serializeTaxElement(element), totals };
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

// ── Domain field-block helpers ──────────────────────────────────────────────
//
// These helpers model real NF-e schema groups. Each represents a well-known
// fiscal concept (FCP, ST, desoneration) and returns a nullable field array
// that can be spread into filterFields().

/** FCP (Fundo de Combate à Pobreza): vBCFCP, pFCP, vFCP */
function fcpFields(d: IcmsData): (TaxField | null)[] {
  return [
    optionalField("vBCFCP", formatCentsOrNull(d.vBCFCP)),
    optionalField("pFCP", formatCentsOrNull(d.pFCP, 4)),
    optionalField("vFCP", formatCentsOrNull(d.vFCP)),
  ];
}

/** FCP-ST: vBCFCPST, pFCPST, vFCPST */
function fcpStFields(d: IcmsData): (TaxField | null)[] {
  return [
    optionalField("vBCFCPST", formatCentsOrNull(d.vBCFCPST)),
    optionalField("pFCPST", formatCentsOrNull(d.pFCPST, 4)),
    optionalField("vFCPST", formatCentsOrNull(d.vFCPST)),
  ];
}

/** ST base (required modBCST): modBCST … vICMSST */
function stFields(d: IcmsData): (TaxField | null)[] {
  return [
    requiredField("modBCST", d.modBCST),
    optionalField("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalField("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    requiredField("vBCST", formatCentsOrNull(d.vBCST)),
    requiredField("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    requiredField("vICMSST", formatCentsOrNull(d.vICMSST)),
  ];
}

/** Desoneration: vICMSDeson, motDesICMS, indDeduzDeson */
function desonerationFields(d: IcmsData): (TaxField | null)[] {
  return [
    optionalField("vICMSDeson", formatCentsOrNull(d.vICMSDeson)),
    optionalField("motDesICMS", d.motDesICMS),
    optionalField("indDeduzDeson", d.indDeduzDeson),
  ];
}

/** ST desoneration: vICMSSTDeson, motDesICMSST */
function stDesonerationFields(d: IcmsData): (TaxField | null)[] {
  return [
    optionalField("vICMSSTDeson", formatCentsOrNull(d.vICMSSTDeson)),
    optionalField("motDesICMSST", d.motDesICMSST),
  ];
}

// ── CST builders (regime Normal) ────────────────────────────────────────────

interface CstResult {
  variantTag: string;
  fields: TaxField[];
}

function calculateCst(data: IcmsData, totals: IcmsTotals): CstResult {
  switch (data.CST) {
    case "00":
      return calcCst00(data, totals);
    case "02":
      return calcCst02(data, totals);
    case "10":
      return calcCst10(data, totals);
    case "15":
      return calcCst15(data, totals);
    case "20":
      return calcCst20(data, totals);
    case "30":
      return calcCst30(data, totals);
    case "40":
    case "41":
    case "50":
      return calcCst40(data, totals);
    case "51":
      return calcCst51(data, totals);
    case "53":
      return calcCst53(data, totals);
    case "60":
      return calcCst60(data, totals);
    case "61":
      return calcCst61(data, totals);
    case "70":
      return calcCst70(data, totals);
    case "90":
      return calcCst90(data, totals);
    default:
      throw new Error(`Unsupported ICMS CST: ${data.CST}`);
  }
}

/** CST 00 — Tributada integralmente */
function calcCst00(d: IcmsData, t: IcmsTotals): CstResult {
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return { variantTag: "ICMS00", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    requiredField("modBC", d.modBC),
    requiredField("vBC", formatCentsOrNull(d.vBC)),
    requiredField("pICMS", formatCentsOrNull(d.pICMS, 4)),
    requiredField("vICMS", formatCentsOrNull(d.vICMS)),
    optionalField("pFCP", formatCentsOrNull(d.pFCP, 4)),
    optionalField("vFCP", formatCentsOrNull(d.vFCP)),
  ]) };
}

/** CST 02 — Tributacao monofasica propria sobre combustiveis */
function calcCst02(d: IcmsData, t: IcmsTotals): CstResult {
  t.qBCMono = accum(t.qBCMono, d.qBCMono);
  t.vICMSMono = accum(t.vICMSMono, d.vICMSMono);

  return { variantTag: "ICMS02", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    optionalField("qBCMono", formatCentsOrNull(d.qBCMono, 4)),
    requiredField("adRemICMS", formatCentsOrNull(d.adRemICMS, 4)),
    requiredField("vICMSMono", formatCentsOrNull(d.vICMSMono)),
  ]) };
}

/** CST 10 — Tributada e com cobranca do ICMS por ST */
function calcCst10(d: IcmsData, t: IcmsTotals): CstResult {
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);
  t.vFCPST = accum(t.vFCPST, d.vFCPST);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return { variantTag: "ICMS10", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    requiredField("modBC", d.modBC),
    requiredField("vBC", formatCentsOrNull(d.vBC)),
    requiredField("pICMS", formatCentsOrNull(d.pICMS, 4)),
    requiredField("vICMS", formatCentsOrNull(d.vICMS)),
    ...fcpFields(d),
    ...stFields(d),
    ...fcpStFields(d),
    ...stDesonerationFields(d),
  ]) };
}

/** CST 15 — Tributacao monofasica propria e com responsabilidade pela retencao sobre combustiveis */
function calcCst15(d: IcmsData, t: IcmsTotals): CstResult {
  t.qBCMono = accum(t.qBCMono, d.qBCMono);
  t.vICMSMono = accum(t.vICMSMono, d.vICMSMono);
  t.qBCMonoReten = accum(t.qBCMonoReten, d.qBCMonoReten);
  t.vICMSMonoReten = accum(t.vICMSMonoReten, d.vICMSMonoReten);

  const fields = filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    optionalField("qBCMono", formatCentsOrNull(d.qBCMono, 4)),
    requiredField("adRemICMS", formatCentsOrNull(d.adRemICMS, 4)),
    requiredField("vICMSMono", formatCentsOrNull(d.vICMSMono)),
    optionalField("qBCMonoReten", formatCentsOrNull(d.qBCMonoReten, 4)),
    requiredField("adRemICMSReten", formatCentsOrNull(d.adRemICMSReten, 4)),
    requiredField("vICMSMonoReten", formatCentsOrNull(d.vICMSMonoReten)),
  ]);

  if (d.pRedAdRem != null) {
    fields.push(requiredField("pRedAdRem", formatCentsOrNull(d.pRedAdRem)));
    fields.push(requiredField("motRedAdRem", d.motRedAdRem));
  }

  return { variantTag: "ICMS15", fields };
}

/** CST 20 — Com reducao de base de calculo */
function calcCst20(d: IcmsData, t: IcmsTotals): CstResult {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return { variantTag: "ICMS20", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    requiredField("modBC", d.modBC),
    requiredField("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    requiredField("vBC", formatCentsOrNull(d.vBC)),
    requiredField("pICMS", formatCentsOrNull(d.pICMS, 4)),
    requiredField("vICMS", formatCentsOrNull(d.vICMS)),
    ...fcpFields(d),
    ...desonerationFields(d),
  ]) };
}

/** CST 30 — Isenta ou nao tributada e com cobranca do ICMS por ST */
function calcCst30(d: IcmsData, t: IcmsTotals): CstResult {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);
  t.vFCPST = accum(t.vFCPST, d.vFCPST);

  return { variantTag: "ICMS30", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    ...stFields(d),
    ...fcpStFields(d),
    ...desonerationFields(d),
  ]) };
}

/** CST 40/41/50 — Isenta / Nao tributada / Suspensao */
function calcCst40(d: IcmsData, t: IcmsTotals): CstResult {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);

  return { variantTag: "ICMS40", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    ...desonerationFields(d),
  ]) };
}

/** CST 51 — Diferimento */
function calcCst51(d: IcmsData, t: IcmsTotals): CstResult {
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return { variantTag: "ICMS51", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    optionalField("modBC", d.modBC),
    optionalField("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    optionalField("cBenefRBC", d.cBenefRBC),
    optionalField("vBC", formatCentsOrNull(d.vBC)),
    optionalField("pICMS", formatCentsOrNull(d.pICMS, 4)),
    optionalField("vICMSOp", formatCentsOrNull(d.vICMSOp)),
    optionalField("pDif", formatCentsOrNull(d.pDif, 4)),
    optionalField("vICMSDif", formatCentsOrNull(d.vICMSDif)),
    optionalField("vICMS", formatCentsOrNull(d.vICMS)),
    optionalField("vBCFCP", formatCentsOrNull(d.vBCFCP)),
    optionalField("pFCP", formatCentsOrNull(d.pFCP, 4)),
    optionalField("vFCP", formatCentsOrNull(d.vFCP)),
    optionalField("pFCPDif", formatCentsOrNull(d.pFCPDif, 4)),
    optionalField("vFCPDif", formatCentsOrNull(d.vFCPDif)),
    optionalField("vFCPEfet", formatCentsOrNull(d.vFCPEfet)),
  ]) };
}

/** CST 53 — Tributacao monofasica sobre combustiveis com recolhimento diferido */
function calcCst53(d: IcmsData, t: IcmsTotals): CstResult {
  t.qBCMono = accum(t.qBCMono, d.qBCMono);
  t.vICMSMono = accum(t.vICMSMono, d.vICMSMono);
  t.qBCMonoReten = accum(t.qBCMonoReten, d.qBCMonoReten);
  t.vICMSMonoReten = accum(t.vICMSMonoReten, d.vICMSMonoReten);

  return { variantTag: "ICMS53", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    optionalField("qBCMono", formatCentsOrNull(d.qBCMono, 4)),
    optionalField("adRemICMS", formatCentsOrNull(d.adRemICMS, 4)),
    optionalField("vICMSMonoOp", formatCentsOrNull(d.vICMSMonoOp)),
    optionalField("pDif", formatCentsOrNull(d.pDif, 4)),
    optionalField("vICMSMonoDif", formatCentsOrNull(d.vICMSMonoDif)),
    optionalField("vICMSMono", formatCentsOrNull(d.vICMSMono)),
  ]) };
}

/** CST 60 — ICMS cobrado anteriormente por ST */
function calcCst60(d: IcmsData, t: IcmsTotals): CstResult {
  t.vFCPSTRet = accum(t.vFCPSTRet, d.vFCPSTRet);

  return { variantTag: "ICMS60", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    optionalField("vBCSTRet", formatCentsOrNull(d.vBCSTRet)),
    optionalField("pST", formatCentsOrNull(d.pST, 4)),
    optionalField("vICMSSubstituto", formatCentsOrNull(d.vICMSSubstituto)),
    optionalField("vICMSSTRet", formatCentsOrNull(d.vICMSSTRet)),
    optionalField("vBCFCPSTRet", formatCentsOrNull(d.vBCFCPSTRet)),
    optionalField("pFCPSTRet", formatCentsOrNull(d.pFCPSTRet, 4)),
    optionalField("vFCPSTRet", formatCentsOrNull(d.vFCPSTRet)),
    optionalField("pRedBCEfet", formatCentsOrNull(d.pRedBCEfet, 4)),
    optionalField("vBCEfet", formatCentsOrNull(d.vBCEfet)),
    optionalField("pICMSEfet", formatCentsOrNull(d.pICMSEfet, 4)),
    optionalField("vICMSEfet", formatCentsOrNull(d.vICMSEfet)),
  ]) };
}

/** CST 61 — Tributacao monofasica sobre combustiveis cobrada anteriormente */
function calcCst61(d: IcmsData, t: IcmsTotals): CstResult {
  t.qBCMonoRet = accum(t.qBCMonoRet, d.qBCMonoRet);
  t.vICMSMonoRet = accum(t.vICMSMonoRet, d.vICMSMonoRet);

  return { variantTag: "ICMS61", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    optionalField("qBCMonoRet", formatCentsOrNull(d.qBCMonoRet, 4)),
    requiredField("adRemICMSRet", formatCentsOrNull(d.adRemICMSRet, 4)),
    requiredField("vICMSMonoRet", formatCentsOrNull(d.vICMSMonoRet)),
  ]) };
}

/** CST 70 — Reducao de BC e cobranca do ICMS por ST */
function calcCst70(d: IcmsData, t: IcmsTotals): CstResult {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);
  t.vFCPST = accum(t.vFCPST, d.vFCPST);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return { variantTag: "ICMS70", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    requiredField("modBC", d.modBC),
    requiredField("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    requiredField("vBC", formatCentsOrNull(d.vBC)),
    requiredField("pICMS", formatCentsOrNull(d.pICMS, 4)),
    requiredField("vICMS", formatCentsOrNull(d.vICMS)),
    ...fcpFields(d),
    ...stFields(d),
    ...fcpStFields(d),
    ...desonerationFields(d),
    ...stDesonerationFields(d),
  ]) };
}

/** CST 90 — Outros */
function calcCst90(d: IcmsData, t: IcmsTotals): CstResult {
  t.vICMSDeson = accum(t.vICMSDeson, d.vICMSDeson);
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);
  t.vFCPST = accum(t.vFCPST, d.vFCPST);
  t.vFCP = accum(t.vFCP, d.vFCP);

  return { variantTag: "ICMS90", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CST", d.CST),
    optionalField("modBC", d.modBC),
    optionalField("vBC", formatCentsOrNull(d.vBC)),
    optionalField("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    optionalField("cBenefRBC", d.cBenefRBC),
    optionalField("pICMS", formatCentsOrNull(d.pICMS, 4)),
    optionalField("vICMSOp", formatCentsOrNull(d.vICMSOp)),
    optionalField("pDif", formatCentsOrNull(d.pDif, 4)),
    optionalField("vICMSDif", formatCentsOrNull(d.vICMSDif)),
    optionalField("vICMS", formatCentsOrNull(d.vICMS)),
    ...fcpFields(d),
    optionalField("pFCPDif", formatCentsOrNull(d.pFCPDif, 4)),
    optionalField("vFCPDif", formatCentsOrNull(d.vFCPDif)),
    optionalField("vFCPEfet", formatCentsOrNull(d.vFCPEfet)),
    // ST fields are all optional for CST 90 (can't use stFields helper)
    optionalField("modBCST", d.modBCST),
    optionalField("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalField("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    optionalField("vBCST", formatCentsOrNull(d.vBCST)),
    optionalField("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    optionalField("vICMSST", formatCentsOrNull(d.vICMSST)),
    ...fcpStFields(d),
    ...desonerationFields(d),
    ...stDesonerationFields(d),
  ]) };
}

// ── CSOSN builders (Simples Nacional) ───────────────────────────────────────

function calculateCsosn(data: IcmsData, totals: IcmsTotals): CstResult {
  // Generic SN totals
  totals.vFCPST = accum(totals.vFCPST, data.vFCPST);
  totals.vFCPSTRet = accum(totals.vFCPSTRet, data.vFCPSTRet);

  switch (data.CSOSN) {
    case "101":
      return calcCsosn101(data, totals);
    case "102":
    case "103":
    case "300":
    case "400":
      return calcCsosn102(data, totals);
    case "201":
      return calcCsosn201(data, totals);
    case "202":
    case "203":
      return calcCsosn202(data, totals);
    case "500":
      return calcCsosn500(data, totals);
    case "900":
      return calcCsosn900(data, totals);
    default:
      throw new Error(`Unsupported ICMS CSOSN: ${data.CSOSN}`);
  }
}

/** CSOSN 101 — Tributada pelo Simples Nacional com permissao de credito */
function calcCsosn101(d: IcmsData, _t: IcmsTotals): CstResult {
  return { variantTag: "ICMSSN101", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CSOSN", d.CSOSN),
    requiredField("pCredSN", formatCentsOrNull(d.pCredSN, 4)),
    requiredField("vCredICMSSN", formatCentsOrNull(d.vCredICMSSN)),
  ]) };
}

/** CSOSN 102/103/300/400 — Tributada sem permissao de credito / Imune / Nao tributada */
function calcCsosn102(d: IcmsData, _t: IcmsTotals): CstResult {
  return { variantTag: "ICMSSN102", fields: filterFields([
    optionalField("orig", d.orig), // may be null for CRT=4
    requiredField("CSOSN", d.CSOSN),
  ]) };
}

/** CSOSN 201 — Tributada com permissao de credito e com cobranca do ICMS por ST */
function calcCsosn201(d: IcmsData, t: IcmsTotals): CstResult {
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);

  return { variantTag: "ICMSSN201", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CSOSN", d.CSOSN),
    ...stFields(d),
    ...fcpStFields(d),
    optionalField("pCredSN", formatCentsOrNull(d.pCredSN, 4)),
    optionalField("vCredICMSSN", formatCentsOrNull(d.vCredICMSSN)),
  ]) };
}

/** CSOSN 202/203 — Tributada sem permissao de credito e com cobranca do ICMS por ST */
function calcCsosn202(d: IcmsData, t: IcmsTotals): CstResult {
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);

  return { variantTag: "ICMSSN202", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CSOSN", d.CSOSN),
    ...stFields(d),
    ...fcpStFields(d),
  ]) };
}

/** CSOSN 500 — ICMS cobrado anteriormente por ST ou por antecipacao */
function calcCsosn500(d: IcmsData, _t: IcmsTotals): CstResult {
  return { variantTag: "ICMSSN500", fields: filterFields([
    requiredField("orig", d.orig),
    requiredField("CSOSN", d.CSOSN),
    optionalField("vBCSTRet", formatCentsOrNull(d.vBCSTRet)),
    optionalField("pST", formatCentsOrNull(d.pST, 4)),
    optionalField("vICMSSubstituto", formatCentsOrNull(d.vICMSSubstituto)),
    optionalField("vICMSSTRet", formatCentsOrNull(d.vICMSSTRet)),
    optionalField("vBCFCPSTRet", formatCentsOrNull(d.vBCFCPSTRet, 2)),
    optionalField("pFCPSTRet", formatCentsOrNull(d.pFCPSTRet, 4)),
    optionalField("vFCPSTRet", formatCentsOrNull(d.vFCPSTRet)),
    optionalField("pRedBCEfet", formatCentsOrNull(d.pRedBCEfet, 4)),
    optionalField("vBCEfet", formatCentsOrNull(d.vBCEfet)),
    optionalField("pICMSEfet", formatCentsOrNull(d.pICMSEfet, 4)),
    optionalField("vICMSEfet", formatCentsOrNull(d.vICMSEfet)),
  ]) };
}

/** CSOSN 900 — Outros */
function calcCsosn900(d: IcmsData, t: IcmsTotals): CstResult {
  t.vBC = accum(t.vBC, d.vBC);
  t.vICMS = accum(t.vICMS, d.vICMS);
  t.vBCST = accum(t.vBCST, d.vBCST);
  t.vST = accum(t.vST, d.vICMSST);

  return { variantTag: "ICMSSN900", fields: filterFields([
    optionalField("orig", d.orig), // may be null for CRT=4
    requiredField("CSOSN", d.CSOSN),
    optionalField("modBC", d.modBC),
    optionalField("vBC", formatCentsOrNull(d.vBC)),
    optionalField("pRedBC", formatCentsOrNull(d.pRedBC, 4)),
    optionalField("pICMS", formatCentsOrNull(d.pICMS, 4)),
    optionalField("vICMS", formatCentsOrNull(d.vICMS)),
    // ST fields are all optional for CSOSN 900 (can't use stFields helper)
    optionalField("modBCST", d.modBCST),
    optionalField("pMVAST", formatCentsOrNull(d.pMVAST, 4)),
    optionalField("pRedBCST", formatCentsOrNull(d.pRedBCST, 4)),
    optionalField("vBCST", formatCentsOrNull(d.vBCST)),
    optionalField("pICMSST", formatCentsOrNull(d.pICMSST, 4)),
    optionalField("vICMSST", formatCentsOrNull(d.vICMSST)),
    ...fcpStFields(d),
    optionalField("pCredSN", formatCentsOrNull(d.pCredSN, 4)),
    optionalField("vCredICMSSN", formatCentsOrNull(d.vCredICMSSN)),
  ]) };
}

