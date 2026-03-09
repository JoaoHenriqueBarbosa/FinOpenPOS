import { formatCents, formatRate } from "./format-utils";
import { tag } from "./xml-builder";

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
 * Build ISSQN XML element and accumulate totals.
 * Goes inside <imposto> as an alternative to ICMS (services vs goods).
 */
export function buildIssqnXml(
  data: IssqnData,
  totals?: IssqnTotals
): string {
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

  const children: string[] = [
    tag("vBC", {}, formatCents(data.vBC)),
    tag("vAliq", {}, formatRate(data.vAliq)),
    tag("vISSQN", {}, formatCents(data.vISSQN)),
    tag("cMunFG", {}, data.cMunFG),
    tag("cListServ", {}, data.cListServ),
  ];

  if (data.vDeducao != null) children.push(tag("vDeducao", {}, formatCents(data.vDeducao)));
  if (data.vOutro != null) children.push(tag("vOutro", {}, formatCents(data.vOutro)));
  if (data.vDescIncond != null) children.push(tag("vDescIncond", {}, formatCents(data.vDescIncond)));
  if (data.vDescCond != null) children.push(tag("vDescCond", {}, formatCents(data.vDescCond)));
  if (data.vISSRet != null) children.push(tag("vISSRet", {}, formatCents(data.vISSRet)));

  children.push(tag("indISS", {}, data.indISS));

  if (data.cServico) children.push(tag("cServico", {}, data.cServico));
  if (data.cMun) children.push(tag("cMun", {}, data.cMun));
  if (data.cPais) children.push(tag("cPais", {}, data.cPais));
  if (data.nProcesso) children.push(tag("nProcesso", {}, data.nProcesso));

  children.push(tag("indIncentivo", {}, data.indIncentivo));

  return tag("ISSQN", {}, children);
}

/**
 * Build impostoDevol XML element.
 * Goes inside <det> after <imposto>, for returned merchandise.
 *
 * @param pDevol - Percentage returned (0-100), stored as hundredths (10000 = 100.00%)
 * @param vIPIDevol - IPI value returned in cents
 */
export function buildImpostoDevol(pDevol: number, vIPIDevol: number): string {
  return tag("impostoDevol", {}, [
    tag("pDevol", {}, (pDevol / 100).toFixed(2)),
    tag("IPI", {}, [
      tag("vIPIDevol", {}, formatCents(vIPIDevol)),
    ]),
  ]);
}
