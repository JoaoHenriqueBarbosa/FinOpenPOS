import {
  type TaxElement,
  type TaxField,
  requiredField,
  optionalField,
  filterFields,
  serializeTaxElement,
} from "./tax-element";

/**
 * IS (Imposto Seletivo / IBS+CBS) input data -- PL_010 tax reform.
 * Goes inside <imposto> as an alternative/addition to ICMS.
 *
 * [pt-BR] Dados de entrada do IS (Imposto Seletivo / IBS+CBS) -- reforma tributária PL_010.
 * Posicionado dentro de <imposto> como alternativa/adição ao ICMS.
 */
export interface IsData {
  /** IS tax situation code / [pt-BR] Código de Situação Tributária do IS */
  CSTIS: string;
  /** IS tax classification code / [pt-BR] Código de Classificação Tributária do IS */
  cClassTribIS: string;
  /** Tax base (optional, e.g. "100.00") / [pt-BR] Base de cálculo (opcional, ex: "100.00") */
  vBCIS?: string;
  /** IS rate (optional, e.g. "5.0000") / [pt-BR] Alíquota IS (opcional, ex: "5.0000") */
  pIS?: string;
  /** Specific rate (optional, e.g. "1.5000") / [pt-BR] Alíquota específica (opcional, ex: "1.5000") */
  pISEspec?: string;
  /** Taxable unit of measure (optional, e.g. "LT") / [pt-BR] Unidade de medida tributável (opcional, ex: "LT") */
  uTrib?: string;
  /** Taxable quantity (optional, e.g. "10.0000") / [pt-BR] Quantidade tributável (opcional, ex: "10.0000") */
  qTrib?: string;
  /** IS tax value (e.g. "5.00") / [pt-BR] Valor do IS (ex: "5.00") */
  vIS: string;
}

/**
 * Calculate IS tax element (domain logic, no XML dependency).
 * Three mutually exclusive modes based on which fields are present.
 *
 * [pt-BR] Calcula o elemento IS (lógica de domínio, sem dependência de XML).
 * Três modos mutuamente exclusivos conforme os campos presentes.
 *
 * @param data - IS input data with CST, classification code, and values
 * [pt-BR] @param data - Dados de entrada do IS com CST, código de classificação e valores
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
 *
 * [pt-BR] Gera a string XML do IS (wrapper compatível).
 */
export function buildIsXml(data: IsData): string {
  return serializeTaxElement(calculateIs(data));
}
