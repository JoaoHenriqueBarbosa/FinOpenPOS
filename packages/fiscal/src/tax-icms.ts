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

/**
 * Tax regime: 1 or 2 = Simples Nacional (CSOSN), 3 = Normal (CST).
 *
 * [pt-BR] Regime tributário: 1 ou 2 = Simples Nacional (CSOSN), 3 = Normal (CST).
 */
export type TaxRegime = 1 | 2 | 3;

/**
 * Unified input data for all ICMS variations.
 * All monetary fields in cents; rate fields in hundredths or * 10000.
 *
 * [pt-BR] Dados unificados para todas as variações de ICMS.
 * Valores monetários em centavos; alíquotas em centésimos ou * 10000.
 */
export interface IcmsData {
  /** Tax regime [pt-BR] Regime tributário */
  taxRegime: TaxRegime;

  // -- Common fields --
  /** Origin of goods (0-8) [pt-BR] Origem da mercadoria (0-8) */
  orig: string;

  // CST (regime 3) or CSOSN (regime 1/2)
  /** Tax situation code (regime Normal) [pt-BR] Código da situação tributária (regime Normal) */
  CST?: string;
  /** Tax situation code (Simples Nacional) [pt-BR] Código da situação da operação no Simples Nacional */
  CSOSN?: string;

  // -- Base calculation --
  /** BC determination method [pt-BR] Modalidade de determinação da BC */
  modBC?: string;
  /** ICMS base value in cents [pt-BR] Valor da base de cálculo do ICMS em centavos */
  vBC?: number;
  /** BC reduction % (hundredths, 4dp) [pt-BR] Percentual de redução da BC (centésimos, 4dp) */
  pRedBC?: number;
  /** ICMS rate (hundredths, 4dp) [pt-BR] Alíquota do ICMS (centésimos, 4dp) */
  pICMS?: number;
  /** ICMS value in cents [pt-BR] Valor do ICMS em centavos */
  vICMS?: number;

  // -- FCP (Fundo de Combate a Pobreza) --
  /** FCP base value in cents [pt-BR] Valor da base de cálculo do FCP em centavos */
  vBCFCP?: number;
  /** FCP rate (hundredths, 4dp) [pt-BR] Alíquota do FCP (centésimos, 4dp) */
  pFCP?: number;
  /** FCP value in cents [pt-BR] Valor do FCP em centavos */
  vFCP?: number;

  // -- ST (Substituicao Tributaria) --
  /** ST BC determination method [pt-BR] Modalidade de determinação da BC da ST */
  modBCST?: string;
  /** MVA ST % (hundredths, 4dp) [pt-BR] Percentual da margem de valor adicionado do ICMS ST (centésimos, 4dp) */
  pMVAST?: number;
  /** ST BC reduction % (hundredths, 4dp) [pt-BR] Percentual de redução da BC da ST (centésimos, 4dp) */
  pRedBCST?: number;
  /** ST base value in cents [pt-BR] Valor da base de cálculo da ST em centavos */
  vBCST?: number;
  /** ST ICMS rate (hundredths, 4dp) [pt-BR] Alíquota do ICMS ST (centésimos, 4dp) */
  pICMSST?: number;
  /** ST ICMS value in cents [pt-BR] Valor do ICMS ST em centavos */
  vICMSST?: number;

  // -- FCP ST --
  /** FCP ST base value in cents [pt-BR] Valor da base de cálculo do FCP ST em centavos */
  vBCFCPST?: number;
  /** FCP ST rate (hundredths, 4dp) [pt-BR] Alíquota do FCP ST (centésimos, 4dp) */
  pFCPST?: number;
  /** FCP ST value in cents [pt-BR] Valor do FCP ST em centavos */
  vFCPST?: number;

  // -- Desoneration --
  /** Desonerated ICMS value in cents [pt-BR] Valor do ICMS desonerado em centavos */
  vICMSDeson?: number;
  /** Desoneration reason [pt-BR] Motivo da desoneração */
  motDesICMS?: string;
  /** Deduct desonerated from item value (0/1) [pt-BR] Indica se deduz o valor desonerado do item (0/1) */
  indDeduzDeson?: string;

  // -- ST desoneration --
  /** ST desonerated value in cents [pt-BR] Valor do ICMS ST desonerado em centavos */
  vICMSSTDeson?: number;
  /** ST desoneration reason [pt-BR] Motivo da desoneração do ICMS ST */
  motDesICMSST?: string;

  // -- ST retained --
  /** Retained ST base value in cents [pt-BR] Valor da BC do ICMS ST retido em centavos */
  vBCSTRet?: number;
  /** Consumer final rate (hundredths, 4dp) [pt-BR] Alíquota suportada pelo consumidor final (centésimos, 4dp) */
  pST?: number;
  /** Substitute own ICMS value in cents [pt-BR] Valor do ICMS próprio do substituto em centavos */
  vICMSSubstituto?: number;
  /** Retained ST ICMS value in cents [pt-BR] Valor do ICMS ST retido em centavos */
  vICMSSTRet?: number;

  // -- FCP ST retained --
  /** FCP ST retained base value in cents [pt-BR] Valor da BC do FCP ST retido em centavos */
  vBCFCPSTRet?: number;
  /** FCP ST retained rate (hundredths, 4dp) [pt-BR] Alíquota do FCP ST retido (centésimos, 4dp) */
  pFCPSTRet?: number;
  /** FCP ST retained value in cents [pt-BR] Valor do FCP ST retido em centavos */
  vFCPSTRet?: number;

  // -- Effective values (CST 60, ICMSSN500) --
  /** Effective BC reduction % (hundredths, 4dp) [pt-BR] Percentual de redução da BC efetiva (centésimos, 4dp) */
  pRedBCEfet?: number;
  /** Effective base value in cents [pt-BR] Valor da BC efetiva em centavos */
  vBCEfet?: number;
  /** Effective ICMS rate (hundredths, 4dp) [pt-BR] Alíquota do ICMS efetiva (centésimos, 4dp) */
  pICMSEfet?: number;
  /** Effective ICMS value in cents [pt-BR] Valor do ICMS efetivo em centavos */
  vICMSEfet?: number;

  // -- Deferral (CST 51, 53, 90) --
  /** ICMS of the operation in cents [pt-BR] Valor do ICMS da operação em centavos */
  vICMSOp?: number;
  /** Deferral % (hundredths, 4dp) [pt-BR] Percentual do diferimento (centésimos, 4dp) */
  pDif?: number;
  /** Deferred ICMS value in cents [pt-BR] Valor do ICMS diferido em centavos */
  vICMSDif?: number;

  // -- FCP deferral (CST 51, 90) --
  /** FCP deferral % (hundredths, 4dp) [pt-BR] Percentual do diferimento do FCP (centésimos, 4dp) */
  pFCPDif?: number;
  /** Deferred FCP value in cents [pt-BR] Valor do FCP diferido em centavos */
  vFCPDif?: number;
  /** Effective FCP value in cents [pt-BR] Valor do FCP efetivo em centavos */
  vFCPEfet?: number;

  // -- Monofasico (CST 02, 15, 53, 61) --
  /** Mono BC quantity (hundredths, 4dp) [pt-BR] Quantidade tributada na BC monofásica (centésimos, 4dp) */
  qBCMono?: number;
  /** Ad rem ICMS rate (hundredths, 4dp) [pt-BR] Alíquota ad rem do ICMS (centésimos, 4dp) */
  adRemICMS?: number;
  /** Mono ICMS value in cents [pt-BR] Valor do ICMS monofásico em centavos */
  vICMSMono?: number;
  /** Mono ICMS operation value in cents [pt-BR] Valor do ICMS da operação monofásica em centavos */
  vICMSMonoOp?: number;
  /** Ad rem retention rate (hundredths, 4dp) [pt-BR] Alíquota ad rem de retenção (centésimos, 4dp) */
  adRemICMSReten?: number;
  /** Mono BC retention quantity (hundredths, 4dp) [pt-BR] Quantidade tributada na BC monofásica de retenção (centésimos, 4dp) */
  qBCMonoReten?: number;
  /** Mono ICMS retention value in cents [pt-BR] Valor do ICMS monofásico de retenção em centavos */
  vICMSMonoReten?: number;
  /** Mono ICMS deferred value in cents [pt-BR] Valor do ICMS monofásico diferido em centavos */
  vICMSMonoDif?: number;
  /** Mono BC retained quantity (hundredths, 4dp) [pt-BR] Quantidade tributada na BC monofásica retida (centésimos, 4dp) */
  qBCMonoRet?: number;
  /** Ad rem retained rate (hundredths, 4dp) [pt-BR] Alíquota ad rem retida (centésimos, 4dp) */
  adRemICMSRet?: number;
  /** Mono ICMS retained value in cents [pt-BR] Valor do ICMS monofásico retido em centavos */
  vICMSMonoRet?: number;
  /** Ad rem reduction % (hundredths, 2dp) [pt-BR] Percentual de redução ad rem (centésimos, 2dp) */
  pRedAdRem?: number;
  /** Ad rem reduction reason [pt-BR] Motivo da redução ad rem */
  motRedAdRem?: string;

  // -- Benefit code (CST 51, 90) --
  /** Benefit code for BC reduction [pt-BR] Código de benefício fiscal para redução da BC */
  cBenefRBC?: string;

  // -- Simples Nacional credit --
  /** SN credit rate (hundredths, 2dp or 4dp) [pt-BR] Alíquota de crédito do Simples Nacional (centésimos, 2dp ou 4dp) */
  pCredSN?: number;
  /** SN credit value in cents [pt-BR] Valor do crédito do ICMS do Simples Nacional em centavos */
  vCredICMSSN?: number;

  // -- ICMSPart fields --
  /** Own operation BC % (hundredths, 4dp) [pt-BR] Percentual da BC da operação própria (centésimos, 4dp) */
  pBCOp?: number;
  /** ST destination state [pt-BR] UF de destino da ST */
  UFST?: string;

  // -- ICMSST repasse fields --
  /** ST base value at destination in cents [pt-BR] Valor da BC do ICMS ST no destino em centavos */
  vBCSTDest?: number;
  /** ST ICMS value at destination in cents [pt-BR] Valor do ICMS ST no destino em centavos */
  vICMSSTDest?: number;

  // -- ICMSUFDest fields --
  /** Base value in destination state in cents [pt-BR] Valor da BC na UF de destino em centavos */
  vBCUFDest?: number;
  /** FCP base value in destination state in cents [pt-BR] Valor da BC do FCP na UF de destino em centavos */
  vBCFCPUFDest?: number;
  /** FCP rate in destination (hundredths, 4dp) [pt-BR] Alíquota do FCP na UF de destino (centésimos, 4dp) */
  pFCPUFDest?: number;
  /** Internal ICMS rate in destination (hundredths, 4dp) [pt-BR] Alíquota interna do ICMS na UF de destino (centésimos, 4dp) */
  pICMSUFDest?: number;
  /** Interstate ICMS rate (hundredths, 2dp) [pt-BR] Alíquota interestadual do ICMS (centésimos, 2dp) */
  pICMSInter?: number;
  /** Interstate partition % (always 100) [pt-BR] Percentual provisório de partilha interestadual (sempre 100) */
  pICMSInterPart?: number;
  /** FCP value in destination in cents [pt-BR] Valor do FCP na UF de destino em centavos */
  vFCPUFDest?: number;
  /** ICMS value in destination in cents [pt-BR] Valor do ICMS na UF de destino em centavos */
  vICMSUFDest?: number;
  /** ICMS value for sender state in cents [pt-BR] Valor do ICMS para a UF do remetente em centavos */
  vICMSUFRemet?: number;
}

/**
 * Accumulated ICMS totals across all items.
 *
 * [pt-BR] Totais acumulados de ICMS entre todos os itens.
 */
export interface IcmsTotals {
  /** Total ICMS base value [pt-BR] Valor total da base de cálculo do ICMS */
  vBC: number;
  /** Total ICMS value [pt-BR] Valor total do ICMS */
  vICMS: number;
  /** Total desonerated ICMS value [pt-BR] Valor total do ICMS desonerado */
  vICMSDeson: number;
  /** Total ST base value [pt-BR] Valor total da base de cálculo da ST */
  vBCST: number;
  /** Total ST value [pt-BR] Valor total da ST */
  vST: number;
  /** Total FCP value [pt-BR] Valor total do FCP */
  vFCP: number;
  /** Total FCP ST value [pt-BR] Valor total do FCP ST */
  vFCPST: number;
  /** Total FCP ST retained value [pt-BR] Valor total do FCP ST retido */
  vFCPSTRet: number;
  /** Total FCP destination value [pt-BR] Valor total do FCP na UF de destino */
  vFCPUFDest: number;
  /** Total ICMS destination value [pt-BR] Valor total do ICMS na UF de destino */
  vICMSUFDest: number;
  /** Total ICMS sender value [pt-BR] Valor total do ICMS para a UF do remetente */
  vICMSUFRemet: number;
  /** Total mono BC quantity [pt-BR] Quantidade total da BC monofásica */
  qBCMono: number;
  /** Total mono ICMS value [pt-BR] Valor total do ICMS monofásico */
  vICMSMono: number;
  /** Total mono BC retention quantity [pt-BR] Quantidade total da BC monofásica de retenção */
  qBCMonoReten: number;
  /** Total mono ICMS retention value [pt-BR] Valor total do ICMS monofásico de retenção */
  vICMSMonoReten: number;
  /** Total mono BC retained quantity [pt-BR] Quantidade total da BC monofásica retida */
  qBCMonoRet: number;
  /** Total mono ICMS retained value [pt-BR] Valor total do ICMS monofásico retido */
  vICMSMonoRet: number;
}

/**
 * Create a zeroed-out ICMS totals object.
 *
 * [pt-BR] Cria um objeto de totais ICMS zerado.
 */
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
 * Calculate ICMS for a single item (domain logic, no XML dependency).
 * Returns structured TaxElement + accumulated totals.
 *
 * [pt-BR] Calcula o ICMS de um item (lógica de domínio, sem dependência de XML).
 * Retorna TaxElement estruturado + totais acumulados.
 *
 * @param data - ICMS input data with tax regime, CST/CSOSN, rates, and amounts
 * [pt-BR] @param data - Dados de entrada do ICMS com regime, CST/CSOSN, alíquotas e valores
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
 * Build ICMS XML string (backward-compatible wrapper around calculateIcms).
 *
 * [pt-BR] Gera a string XML do ICMS (wrapper compatível sobre calculateIcms).
 */
export function buildIcmsXml(data: IcmsData): { xml: string; totals: IcmsTotals } {
  const { element, totals } = calculateIcms(data);
  return { xml: serializeTaxElement(element), totals };
}

/**
 * Build the ICMSPart XML group (partition between states).
 * Used inside `<ICMS>` for CST 10 or 90 with interstate partition.
 *
 * [pt-BR] Gera o grupo XML ICMSPart (partilha entre estados).
 * Usado dentro de `<ICMS>` para CST 10 ou 90 com partilha interestadual.
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
 *
 * [pt-BR] Gera o grupo XML ICMSST (repasse de ST).
 * Usado dentro de `<ICMS>` para CST 41 ou 60 com repasse interestadual de ST.
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
 *
 * [pt-BR] Gera o grupo XML ICMSUFDest (interestadual para consumidor final).
 * É irmão de `<ICMS>`, posicionado diretamente dentro de `<imposto>`.
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
 * Merge item-level ICMS totals into an accumulator.
 *
 * [pt-BR] Mescla os totais ICMS de um item no acumulador.
 *
 * @param target - Accumulator to merge into
 * [pt-BR] @param target - Acumulador para mesclar
 * @param source - Item-level totals to add
 * [pt-BR] @param source - Totais do item a adicionar
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

