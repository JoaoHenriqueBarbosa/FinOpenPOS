import { formatCents, formatRate } from "./format-utils";
import {
  type TaxElement,
  type TaxField,
  requiredField,
  optionalField,
  filterFields,
  serializeTaxElement,
} from "./tax-element";

/**
 * ISSQN (ISS - Imposto Sobre Serviços) data.
 * All monetary amounts in cents, rates as hundredths.
 */
export interface IssqnData {
  /** Base de cálculo in cents */
  vBC: number;
  /** Alíquota ISS as hundredths (500 = 5.00%) */
  vAliq: number;
  /** Valor do ISSQN in cents */
  vISSQN: number;
  /** Código município fato gerador (IBGE 7 digits) */
  cMunFG: string;
  /** Item da lista de serviços (LC 116/2003) */
  cListServ: string;
  /** Indicador exigibilidade ISS: 1-7 */
  indISS: string;
  /** Indicador incentivo fiscal: 1=sim, 2=não */
  indIncentivo: string;
  /** Valor dedução (optional) in cents */
  vDeducao?: number;
  /** Valor outras retenções (optional) in cents */
  vOutro?: number;
  /** Valor desconto incondicionado (optional) in cents */
  vDescIncond?: number;
  /** Valor desconto condicionado (optional) in cents */
  vDescCond?: number;
  /** Valor retenção ISS (optional) in cents */
  vISSRet?: number;
  /** Código serviço município (optional) */
  cServico?: string;
  /** Código município incidência (optional, IBGE) */
  cMun?: string;
  /** Código país (optional) */
  cPais?: string;
  /** Número processo judicial (optional) */
  nProcesso?: string;
}

/**
 * ISSQN totals accumulator — mirrors PHP stdISSQNTot.
 */
export interface IssqnTotals {
  vBC: number;
  vISS: number;
  vISSRet: number;
  vDeducao: number;
  vOutro: number;
  vDescIncond: number;
  vDescCond: number;
}

export function createIssqnTotals(): IssqnTotals {
  return { vBC: 0, vISS: 0, vISSRet: 0, vDeducao: 0, vOutro: 0, vDescIncond: 0, vDescCond: 0 };
}

/**
 * Calculate ISSQN tax element and accumulate totals (domain logic, no XML).
 */
export function calculateIssqn(
  data: IssqnData,
  totals?: IssqnTotals
): TaxElement {
  // Accumulate totals only when vBC > 0 (matching PHP behavior)
  if (totals && data.vBC > 0) {
    totals.vBC += data.vBC;
    totals.vISS += data.vISSQN;
    totals.vISSRet += data.vISSRet ?? 0;
    totals.vDeducao += data.vDeducao ?? 0;
    totals.vOutro += data.vOutro ?? 0;
    totals.vDescIncond += data.vDescIncond ?? 0;
    totals.vDescCond += data.vDescCond ?? 0;
  }

  const fields: Array<TaxField | null> = [
    requiredField("vBC", formatCents(data.vBC)),
    requiredField("vAliq", formatRate(data.vAliq)),
    requiredField("vISSQN", formatCents(data.vISSQN)),
    requiredField("cMunFG", data.cMunFG),
    requiredField("cListServ", data.cListServ),
    optionalField("vDeducao", data.vDeducao != null ? formatCents(data.vDeducao) : null),
    optionalField("vOutro", data.vOutro != null ? formatCents(data.vOutro) : null),
    optionalField("vDescIncond", data.vDescIncond != null ? formatCents(data.vDescIncond) : null),
    optionalField("vDescCond", data.vDescCond != null ? formatCents(data.vDescCond) : null),
    optionalField("vISSRet", data.vISSRet != null ? formatCents(data.vISSRet) : null),
    requiredField("indISS", data.indISS),
    optionalField("cServico", data.cServico ?? null),
    optionalField("cMun", data.cMun ?? null),
    optionalField("cPais", data.cPais ?? null),
    optionalField("nProcesso", data.nProcesso ?? null),
    requiredField("indIncentivo", data.indIncentivo),
  ];

  return {
    outerTag: null,
    outerFields: [],
    variantTag: "ISSQN",
    fields: filterFields(fields),
  };
}

/**
 * Build ISSQN XML string and accumulate totals (backward-compatible wrapper).
 */
export function buildIssqnXml(
  data: IssqnData,
  totals?: IssqnTotals
): string {
  return serializeTaxElement(calculateIssqn(data, totals));
}

/**
 * Calculate impostoDevol element (domain logic, no XML).
 *
 * @param pDevol - Percentage returned (0-100), stored as hundredths (10000 = 100.00%)
 * @param vIPIDevol - IPI value returned in cents
 */
export function calculateImpostoDevol(pDevol: number, vIPIDevol: number): TaxElement {
  return {
    outerTag: "impostoDevol",
    outerFields: [{ name: "pDevol", value: (pDevol / 100).toFixed(2) }],
    variantTag: "IPI",
    fields: [{ name: "vIPIDevol", value: formatCents(vIPIDevol) }],
  };
}

/**
 * Build impostoDevol XML string (backward-compatible wrapper).
 */
export function buildImpostoDevol(pDevol: number, vIPIDevol: number): string {
  return serializeTaxElement(calculateImpostoDevol(pDevol, vIPIDevol));
}
