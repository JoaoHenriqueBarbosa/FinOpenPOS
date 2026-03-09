import { formatCentsOrZero, formatRate4OrZero } from "./format-utils";
import {
  type TaxElement,
  type TaxField,
  requiredField,
  filterFields,
  serializeTaxElement,
} from "./tax-element";

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * All monetary amounts are in cents (integer).
 * Rate/percentage fields are in basis points or raw percentage * 10000
 * (e.g., 1.65% = 165 with 2-decimal, or 16500 with 4-decimal).
 *
 * Callers must pass amounts in cents; rates as integer representations
 * that will be formatted with the appropriate decimal places.
 */

export interface PisData {
  /** CST code as 2-digit string (e.g. "01", "04", "49", "99") */
  CST: string;
  /** Base de calculo in cents */
  vBC?: number;
  /** Aliquota PIS — stored as rate * 10000 (4 decimal places) */
  pPIS?: number;
  /** Valor do PIS in cents */
  vPIS?: number;
  /** Quantidade BC Prod — stored as qty * 10000 (4 decimal places) */
  qBCProd?: number;
  /** Aliquota em reais — stored as value * 10000 (4 decimal places) */
  vAliqProd?: number;
}

export interface PisStData {
  /** Base de calculo in cents */
  vBC?: number;
  /** Aliquota PIS — rate * 10000 (4 decimal places) */
  pPIS?: number;
  /** Quantidade BC Prod — qty * 10000 (4 decimal places) */
  qBCProd?: number;
  /** Aliquota em reais — value * 10000 (4 decimal places) */
  vAliqProd?: number;
  /** Valor do PIS in cents */
  vPIS: number;
  /** Indica se o valor compoe o total (0 or 1) */
  indSomaPISST?: number;
}

export interface CofinsData {
  /** CST code as 2-digit string */
  CST: string;
  /** Base de calculo in cents */
  vBC?: number;
  /** Aliquota COFINS — rate * 10000 (4 decimal places) */
  pCOFINS?: number;
  /** Valor da COFINS in cents */
  vCOFINS?: number;
  /** Quantidade BC Prod — qty * 10000 (4 decimal places) */
  qBCProd?: number;
  /** Aliquota em reais — value * 10000 (4 decimal places) */
  vAliqProd?: number;
}

export interface CofinsStData {
  /** Base de calculo in cents */
  vBC?: number;
  /** Aliquota COFINS — rate * 10000 (4 decimal places) */
  pCOFINS?: number;
  /** Quantidade BC Prod — qty * 10000 (4 decimal places) */
  qBCProd?: number;
  /** Aliquota em reais — value * 10000 (4 decimal places) */
  vAliqProd?: number;
  /** Valor da COFINS in cents */
  vCOFINS: number;
  /** Indica se o valor compoe o total (0 or 1) */
  indSomaCOFINSST?: number;
}

export interface IpiData {
  /** CST code as 2-digit string (e.g. "00", "50", "99", "01") */
  CST: string;
  /** Codigo de enquadramento legal do IPI */
  cEnq: string;
  /** CNPJ do produtor (optional) */
  CNPJProd?: string;
  /** Codigo do selo de controle (optional) */
  cSelo?: string;
  /** Quantidade de selo de controle (optional) */
  qSelo?: number;
  /** Base de calculo in cents */
  vBC?: number;
  /** Aliquota IPI — rate * 10000 (4 decimal places) */
  pIPI?: number;
  /** Quantidade na unidade padrao — qty * 10000 (4 decimal places) */
  qUnid?: number;
  /** Valor por unidade tributavel — value * 10000 (4 decimal places) */
  vUnid?: number;
  /** Valor do IPI in cents */
  vIPI?: number;
}

export interface IiData {
  /** Base de calculo in cents */
  vBC: number;
  /** Valor despesas aduaneiras in cents */
  vDespAdu: number;
  /** Valor do imposto de importacao in cents */
  vII: number;
  /** Valor do IOF in cents */
  vIOF: number;
}

// ── CST classification sets ─────────────────────────────────────────────────

const PIS_COFINS_ALIQ_CSTS = new Set(["01", "02"]);
const PIS_COFINS_QTDE_CSTS = new Set(["03"]);
const PIS_COFINS_NT_CSTS = new Set(["04", "05", "06", "07", "08", "09"]);
const PIS_COFINS_OUTR_CSTS = new Set([
  "49", "50", "51", "52", "53", "54", "55", "56",
  "60", "61", "62", "63", "64", "65", "66", "67",
  "70", "71", "72", "73", "74", "75",
  "98", "99",
]);

const IPI_TRIB_CSTS = new Set(["00", "49", "50", "99"]);

// ── Contribution tax (PIS / COFINS) generic engine ─────────────────────────
//
// PIS and COFINS are two variants of the same "contribuição social" domain
// concept. They share identical calculation logic — only the XML tag names
// and field names differ.  A ContributionTaxConfig captures those differences
// so a single set of private functions handles both taxes.

interface ContributionTaxConfig {
  taxName: string;      // "PIS" | "COFINS"
  rateField: string;    // "pPIS" | "pCOFINS"
  valueField: string;   // "vPIS" | "vCOFINS"
  stTag: string;        // "PISST" | "COFINSST"
  stIndicator: string;  // "indSomaPISST" | "indSomaCOFINSST"
}

const PIS_CONFIG: ContributionTaxConfig = {
  taxName: "PIS", rateField: "pPIS", valueField: "vPIS",
  stTag: "PISST", stIndicator: "indSomaPISST",
};

const COFINS_CONFIG: ContributionTaxConfig = {
  taxName: "COFINS", rateField: "pCOFINS", valueField: "vCOFINS",
  stTag: "COFINSST", stIndicator: "indSomaCOFINSST",
};

interface ContributionTaxInput {
  CST: string;
  vBC?: number;
  rate?: number;
  value?: number;
  qBCProd?: number;
  vAliqProd?: number;
}

interface ContributionTaxStInput {
  vBC?: number;
  rate?: number;
  qBCProd?: number;
  vAliqProd?: number;
  value: number;
  stIndicator?: number;
}

function calculateContributionTax(
  d: ContributionTaxInput,
  cfg: ContributionTaxConfig,
): TaxElement {
  let variantTag: string;
  let fields: TaxField[];

  if (PIS_COFINS_ALIQ_CSTS.has(d.CST)) {
    variantTag = `${cfg.taxName}Aliq`;
    fields = [
      { name: "CST", value: d.CST },
      { name: "vBC", value: formatCentsOrZero(d.vBC) },
      { name: cfg.rateField, value: formatRate4OrZero(d.rate) },
      { name: cfg.valueField, value: formatCentsOrZero(d.value) },
    ];
  } else if (PIS_COFINS_QTDE_CSTS.has(d.CST)) {
    variantTag = `${cfg.taxName}Qtde`;
    fields = [
      { name: "CST", value: d.CST },
      { name: "qBCProd", value: formatRate4OrZero(d.qBCProd) },
      { name: "vAliqProd", value: formatRate4OrZero(d.vAliqProd) },
      { name: cfg.valueField, value: formatCentsOrZero(d.value) },
    ];
  } else if (PIS_COFINS_NT_CSTS.has(d.CST)) {
    variantTag = `${cfg.taxName}NT`;
    fields = [{ name: "CST", value: d.CST }];
  } else if (PIS_COFINS_OUTR_CSTS.has(d.CST)) {
    variantTag = `${cfg.taxName}Outr`;
    fields = buildContributionOutrFields(d, cfg);
  } else {
    variantTag = `${cfg.taxName}NT`;
    fields = [{ name: "CST", value: d.CST }];
  }

  return { outerTag: cfg.taxName, outerFields: [], variantTag, fields };
}

function buildContributionOutrFields(
  d: ContributionTaxInput,
  cfg: ContributionTaxConfig,
): TaxField[] {
  const fields: TaxField[] = [{ name: "CST", value: d.CST }];

  if (d.qBCProd != null) {
    fields.push({ name: "qBCProd", value: formatRate4OrZero(d.qBCProd) });
    fields.push({ name: "vAliqProd", value: formatRate4OrZero(d.vAliqProd) });
  } else {
    fields.push({ name: "vBC", value: formatCentsOrZero(d.vBC) });
    fields.push({ name: cfg.rateField, value: formatRate4OrZero(d.rate) });
  }

  fields.push({ name: cfg.valueField, value: formatCentsOrZero(d.value) });
  return fields;
}

function calculateContributionTaxSt(
  d: ContributionTaxStInput,
  cfg: ContributionTaxConfig,
): TaxElement {
  const fields: TaxField[] = [];

  if (d.qBCProd != null) {
    fields.push({ name: "qBCProd", value: formatRate4OrZero(d.qBCProd) });
    fields.push({ name: "vAliqProd", value: formatRate4OrZero(d.vAliqProd) });
  } else {
    fields.push({ name: "vBC", value: formatCentsOrZero(d.vBC) });
    fields.push({ name: cfg.rateField, value: formatRate4OrZero(d.rate) });
  }

  fields.push({ name: cfg.valueField, value: formatCentsOrZero(d.value) });

  if (d.stIndicator != null) {
    fields.push({ name: cfg.stIndicator, value: String(d.stIndicator) });
  }

  return { outerTag: null, outerFields: [], variantTag: cfg.stTag, fields };
}

// ── PIS (public API) ───────────────────────────────────────────────────────

export function calculatePis(data: PisData): TaxElement {
  return calculateContributionTax(
    { CST: data.CST, vBC: data.vBC, rate: data.pPIS, value: data.vPIS, qBCProd: data.qBCProd, vAliqProd: data.vAliqProd },
    PIS_CONFIG,
  );
}

export function buildPisXml(data: PisData): string {
  return serializeTaxElement(calculatePis(data));
}

export function calculatePisSt(data: PisStData): TaxElement {
  return calculateContributionTaxSt(
    { vBC: data.vBC, rate: data.pPIS, value: data.vPIS, qBCProd: data.qBCProd, vAliqProd: data.vAliqProd, stIndicator: data.indSomaPISST },
    PIS_CONFIG,
  );
}

export function buildPisStXml(data: PisStData): string {
  return serializeTaxElement(calculatePisSt(data));
}

// ── COFINS (public API) ────────────────────────────────────────────────────

export function calculateCofins(data: CofinsData): TaxElement {
  return calculateContributionTax(
    { CST: data.CST, vBC: data.vBC, rate: data.pCOFINS, value: data.vCOFINS, qBCProd: data.qBCProd, vAliqProd: data.vAliqProd },
    COFINS_CONFIG,
  );
}

export function buildCofinsXml(data: CofinsData): string {
  return serializeTaxElement(calculateCofins(data));
}

export function calculateCofinsSt(data: CofinsStData): TaxElement {
  return calculateContributionTaxSt(
    { vBC: data.vBC, rate: data.pCOFINS, value: data.vCOFINS, qBCProd: data.qBCProd, vAliqProd: data.vAliqProd, stIndicator: data.indSomaCOFINSST },
    COFINS_CONFIG,
  );
}

export function buildCofinsStXml(data: CofinsStData): string {
  return serializeTaxElement(calculateCofinsSt(data));
}

// ── IPI ─────────────────────────────────────────────────────────────────────

export function calculateIpi(data: IpiData): TaxElement {
  const outerFields: TaxField[] = [];

  if (data.CNPJProd) outerFields.push({ name: "CNPJProd", value: data.CNPJProd });
  if (data.cSelo) outerFields.push({ name: "cSelo", value: data.cSelo });
  if (data.qSelo != null) outerFields.push({ name: "qSelo", value: String(data.qSelo) });
  outerFields.push({ name: "cEnq", value: data.cEnq });

  let variantTag: string;
  let fields: TaxField[];

  if (IPI_TRIB_CSTS.has(data.CST)) {
    variantTag = "IPITrib";
    fields = [{ name: "CST", value: data.CST }];

    if (data.vBC != null && data.pIPI != null) {
      fields.push({ name: "vBC", value: formatCentsOrZero(data.vBC) });
      fields.push({ name: "pIPI", value: formatRate4OrZero(data.pIPI) });
    } else {
      fields.push({ name: "qUnid", value: formatRate4OrZero(data.qUnid) });
      fields.push({ name: "vUnid", value: formatRate4OrZero(data.vUnid) });
    }

    fields.push({ name: "vIPI", value: formatCentsOrZero(data.vIPI) });
  } else {
    variantTag = "IPINT";
    fields = [{ name: "CST", value: data.CST }];
  }

  return { outerTag: "IPI", outerFields, variantTag, fields };
}

export function buildIpiXml(data: IpiData): string {
  return serializeTaxElement(calculateIpi(data));
}

// ── II (Imposto de Importacao) ──────────────────────────────────────────────

export function calculateIi(data: IiData): TaxElement {
  return {
    outerTag: null,
    outerFields: [],
    variantTag: "II",
    fields: [
      { name: "vBC", value: formatCentsOrZero(data.vBC) },
      { name: "vDespAdu", value: formatCentsOrZero(data.vDespAdu) },
      { name: "vII", value: formatCentsOrZero(data.vII) },
      { name: "vIOF", value: formatCentsOrZero(data.vIOF) },
    ],
  };
}

export function buildIiXml(data: IiData): string {
  return serializeTaxElement(calculateIi(data));
}
