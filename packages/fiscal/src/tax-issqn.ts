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
 * ISSQN (ISS - Imposto Sobre Servicos) input data.
 * All monetary amounts in cents, rates as hundredths.
 *
 * [pt-BR] Dados de entrada do ISSQN (ISS - Imposto Sobre Serviços).
 * Valores monetários em centavos, alíquotas em centésimos.
 */
export interface IssqnData {
  /** Base de calculo in cents / [pt-BR] Base de cálculo em centavos */
  vBC: number;
  /** ISS rate as hundredths (500 = 5.00%) / [pt-BR] Alíquota ISS em centésimos (500 = 5,00%) */
  vAliq: number;
  /** ISSQN value in cents / [pt-BR] Valor do ISSQN em centavos */
  vISSQN: number;
  /** Municipality code of taxable event (IBGE 7 digits) / [pt-BR] Código município do fato gerador (IBGE 7 dígitos) */
  cMunFG: string;
  /** Service list item (LC 116/2003) / [pt-BR] Item da lista de serviços (LC 116/2003) */
  cListServ: string;
  /** ISS enforceability indicator: 1-7 / [pt-BR] Indicador de exigibilidade do ISS: 1-7 */
  indISS: string;
  /** Tax incentive indicator: 1=yes, 2=no / [pt-BR] Indicador de incentivo fiscal: 1=sim, 2=não */
  indIncentivo: string;
  /** Deduction value (optional) in cents / [pt-BR] Valor da dedução (opcional) em centavos */
  vDeducao?: number;
  /** Other retention value (optional) in cents / [pt-BR] Valor de outras retenções (opcional) em centavos */
  vOutro?: number;
  /** Unconditional discount (optional) in cents / [pt-BR] Desconto incondicionado (opcional) em centavos */
  vDescIncond?: number;
  /** Conditional discount (optional) in cents / [pt-BR] Desconto condicionado (opcional) em centavos */
  vDescCond?: number;
  /** ISS retention value (optional) in cents / [pt-BR] Valor da retenção do ISS (opcional) em centavos */
  vISSRet?: number;
  /** Municipal service code (optional) / [pt-BR] Código do serviço no município (opcional) */
  cServico?: string;
  /** Municipality of incidence (optional, IBGE) / [pt-BR] Código do município de incidência (opcional, IBGE) */
  cMun?: string;
  /** Country code (optional) / [pt-BR] Código do país (opcional) */
  cPais?: string;
  /** Judicial process number (optional) / [pt-BR] Número do processo judicial (opcional) */
  nProcesso?: string;
}

/**
 * ISSQN totals accumulator (mirrors PHP stdISSQNTot).
 *
 * [pt-BR] Acumulador de totais do ISSQN (espelha stdISSQNTot do PHP).
 */
export interface IssqnTotals {
  /** Total ISSQN base value [pt-BR] Valor total da base de cálculo do ISSQN */
  vBC: number;
  /** Total ISS value [pt-BR] Valor total do ISS */
  vISS: number;
  /** Total ISS retained value [pt-BR] Valor total do ISS retido */
  vISSRet: number;
  /** Total deduction value [pt-BR] Valor total das deduções */
  vDeducao: number;
  /** Total other retention value [pt-BR] Valor total de outras retenções */
  vOutro: number;
  /** Total unconditional discount [pt-BR] Valor total do desconto incondicionado */
  vDescIncond: number;
  /** Total conditional discount [pt-BR] Valor total do desconto condicionado */
  vDescCond: number;
}

/**
 * Create a zeroed-out ISSQN totals object.
 *
 * [pt-BR] Cria um objeto de totais ISSQN zerado.
 */
export function createIssqnTotals(): IssqnTotals {
  return { vBC: 0, vISS: 0, vISSRet: 0, vDeducao: 0, vOutro: 0, vDescIncond: 0, vDescCond: 0 };
}

/**
 * Calculate ISSQN tax element and accumulate totals (domain logic, no XML).
 *
 * [pt-BR] Calcula o elemento ISSQN e acumula totais (lógica de domínio, sem XML).
 *
 * @param data - ISSQN input data with base, rate, and service codes
 * [pt-BR] @param data - Dados de entrada do ISSQN com base, alíquota e códigos de serviço
 * @param totals - Optional accumulator to merge item totals into
 * [pt-BR] @param totals - Acumulador opcional para mesclar totais do item
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
 *
 * [pt-BR] Gera a string XML do ISSQN e acumula totais (wrapper compatível).
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
 * [pt-BR] Calcula o elemento impostoDevol (lógica de domínio, sem XML).
 *
 * @param pDevol - Percentage returned (0-100), stored as hundredths (10000 = 100.00%)
 * [pt-BR] @param pDevol - Percentual devolvido (0-100), armazenado em centésimos (10000 = 100,00%)
 * @param vIPIDevol - IPI value returned in cents
 * [pt-BR] @param vIPIDevol - Valor do IPI devolvido em centavos
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
 *
 * [pt-BR] Gera a string XML do impostoDevol (wrapper compatível).
 */
export function buildImpostoDevol(pDevol: number, vIPIDevol: number): string {
  return serializeTaxElement(calculateImpostoDevol(pDevol, vIPIDevol));
}
