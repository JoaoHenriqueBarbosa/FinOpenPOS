import {
  type TaxElement,
  type TaxField,
  requiredField,
  optionalField,
  filterFields,
  serializeTaxElement,
} from "./tax-element";

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
 * Calculate IS tax element (domain logic, no XML dependency).
 *
 * Three mutually exclusive modes:
 * 1. vBCIS present → includes vBCIS, pIS, pISEspec
 * 2. uTrib+qTrib present → includes uTrib, qTrib
 * 3. Neither → only CSTIS, cClassTribIS, vIS
 */
export function calculateIs(data: IsData): TaxElement {
  const fields: Array<TaxField | null> = [
    requiredField("CSTIS", data.CSTIS),
    requiredField("cClassTribIS", data.cClassTribIS),
  ];

  if (data.vBCIS != null) {
    fields.push(requiredField("vBCIS", data.vBCIS));
    fields.push(optionalField("pIS", data.pIS));
    fields.push(optionalField("pISEspec", data.pISEspec));
  }

  if (data.uTrib && data.qTrib) {
    fields.push(requiredField("uTrib", data.uTrib));
    fields.push(requiredField("qTrib", data.qTrib));
  }

  fields.push(requiredField("vIS", data.vIS));

  return {
    outerTag: null,
    outerFields: [],
    variantTag: "IS",
    fields: filterFields(fields),
  };
}

/**
 * Build IS XML string (backward-compatible wrapper).
 */
export function buildIsXml(data: IsData): string {
  return serializeTaxElement(calculateIs(data));
}
