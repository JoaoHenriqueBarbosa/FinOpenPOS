import { tag } from "./xml-builder";

/**
 * IS (Imposto Seletivo / IBS+CBS) data — PL_010 tax reform.
 * Goes inside <imposto> as an alternative/addition to ICMS.
 *
 * Values are passed as strings (to match XML output format directly),
 * following the PHP convention where values go into XML as-is.
 */
export interface IsData {
  /** Codigo de Situacao Tributaria do IS */
  CSTIS: string;
  /** Codigo de Classificacao Tributaria do IS */
  cClassTribIS: string;
  /** Base de calculo (optional, e.g. "100.00") */
  vBCIS?: string;
  /** Aliquota IS (optional, e.g. "5.0000") */
  pIS?: string;
  /** Aliquota especifica (optional, e.g. "1.5000") */
  pISEspec?: string;
  /** Unidade de medida tributavel (optional, e.g. "LT") */
  uTrib?: string;
  /** Quantidade tributavel (optional, e.g. "10.0000") */
  qTrib?: string;
  /** Valor do IS (e.g. "5.00") */
  vIS: string;
}

/**
 * Build IS (Imposto Seletivo) XML element.
 *
 * Three mutually exclusive modes:
 * 1. vBCIS present → includes vBCIS, pIS, pISEspec
 * 2. uTrib+qTrib present → includes uTrib, qTrib
 * 3. Neither → only CSTIS, cClassTribIS, vIS
 */
export function buildIsXml(data: IsData): string {
  const children: string[] = [
    tag("CSTIS", {}, data.CSTIS),
    tag("cClassTribIS", {}, data.cClassTribIS),
  ];

  if (data.vBCIS != null) {
    children.push(tag("vBCIS", {}, data.vBCIS));
    if (data.pIS != null) children.push(tag("pIS", {}, data.pIS));
    if (data.pISEspec != null) children.push(tag("pISEspec", {}, data.pISEspec));
  }

  if (data.uTrib && data.qTrib) {
    children.push(tag("uTrib", {}, data.uTrib));
    children.push(tag("qTrib", {}, data.qTrib));
  }

  children.push(tag("vIS", {}, data.vIS));

  return tag("IS", {}, children);
}
