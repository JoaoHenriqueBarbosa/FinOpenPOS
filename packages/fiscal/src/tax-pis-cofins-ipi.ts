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
 * PIS tax input data. Monetary amounts in cents, rates as integer * 10000.
 *
 * [pt-BR] Dados de entrada do PIS. Valores monetários em centavos, alíquotas como inteiro * 10000.
 */
export interface PisData {
  /** CST code as 2-digit string (e.g. "01", "04", "49", "99") / [pt-BR] Código CST como string de 2 dígitos */
  CST: string;
  /** Tax base in cents / [pt-BR] Base de cálculo em centavos */
  vBC?: number;
  /** PIS rate -- stored as rate * 10000 (4dp) / [pt-BR] Alíquota PIS -- armazenada como taxa * 10000 (4dp) */
  pPIS?: number;
  /** PIS value in cents / [pt-BR] Valor do PIS em centavos */
  vPIS?: number;
  /** Product BC quantity -- stored as qty * 10000 (4dp) / [pt-BR] Quantidade BC Prod -- armazenada como qtd * 10000 (4dp) */
  qBCProd?: number;
  /** Rate in BRL -- stored as value * 10000 (4dp) / [pt-BR] Alíquota em reais -- armazenada como valor * 10000 (4dp) */
  vAliqProd?: number;
}

/**
 * PIS-ST (substituicao tributaria) input data.
 *
 * [pt-BR] Dados de entrada do PIS-ST (substituição tributária).
 */
export interface PisStData {
  /** Tax base in cents / [pt-BR] Base de cálculo em centavos */
  vBC?: number;
  /** PIS rate -- rate * 10000 (4dp) / [pt-BR] Alíquota PIS -- taxa * 10000 (4dp) */
  pPIS?: number;
  /** Product BC quantity -- qty * 10000 (4dp) / [pt-BR] Quantidade BC Prod -- qtd * 10000 (4dp) */
  qBCProd?: number;
  /** Rate in BRL -- value * 10000 (4dp) / [pt-BR] Alíquota em reais -- valor * 10000 (4dp) */
  vAliqProd?: number;
  /** PIS value in cents / [pt-BR] Valor do PIS em centavos */
  vPIS: number;
  /** Whether value composes total (0 or 1) / [pt-BR] Indica se o valor compõe o total (0 ou 1) */
  indSomaPISST?: number;
}

/**
 * COFINS tax input data. Monetary amounts in cents, rates as integer * 10000.
 *
 * [pt-BR] Dados de entrada da COFINS. Valores monetários em centavos, alíquotas como inteiro * 10000.
 */
export interface CofinsData {
  /** CST code as 2-digit string / [pt-BR] Código CST como string de 2 dígitos */
  CST: string;
  /** Tax base in cents / [pt-BR] Base de cálculo em centavos */
  vBC?: number;
  /** COFINS rate -- rate * 10000 (4dp) / [pt-BR] Alíquota COFINS -- taxa * 10000 (4dp) */
  pCOFINS?: number;
  /** COFINS value in cents / [pt-BR] Valor da COFINS em centavos */
  vCOFINS?: number;
  /** Product BC quantity -- qty * 10000 (4dp) / [pt-BR] Quantidade BC Prod -- qtd * 10000 (4dp) */
  qBCProd?: number;
  /** Rate in BRL -- value * 10000 (4dp) / [pt-BR] Alíquota em reais -- valor * 10000 (4dp) */
  vAliqProd?: number;
}

/**
 * COFINS-ST (substituicao tributaria) input data.
 *
 * [pt-BR] Dados de entrada da COFINS-ST (substituição tributária).
 */
export interface CofinsStData {
  /** Tax base in cents / [pt-BR] Base de cálculo em centavos */
  vBC?: number;
  /** COFINS rate -- rate * 10000 (4dp) / [pt-BR] Alíquota COFINS -- taxa * 10000 (4dp) */
  pCOFINS?: number;
  /** Product BC quantity -- qty * 10000 (4dp) / [pt-BR] Quantidade BC Prod -- qtd * 10000 (4dp) */
  qBCProd?: number;
  /** Rate in BRL -- value * 10000 (4dp) / [pt-BR] Alíquota em reais -- valor * 10000 (4dp) */
  vAliqProd?: number;
  /** COFINS value in cents / [pt-BR] Valor da COFINS em centavos */
  vCOFINS: number;
  /** Whether value composes total (0 or 1) / [pt-BR] Indica se o valor compõe o total (0 ou 1) */
  indSomaCOFINSST?: number;
}

/**
 * IPI (Imposto sobre Produtos Industrializados) input data.
 *
 * [pt-BR] Dados de entrada do IPI (Imposto sobre Produtos Industrializados).
 */
export interface IpiData {
  /** CST code as 2-digit string (e.g. "00", "50", "99", "01") / [pt-BR] Código CST como string de 2 dígitos */
  CST: string;
  /** IPI legal classification code / [pt-BR] Código de enquadramento legal do IPI */
  cEnq: string;
  /** Producer CNPJ (optional) / [pt-BR] CNPJ do produtor (opcional) */
  CNPJProd?: string;
  /** Control seal code (optional) / [pt-BR] Código do selo de controle (opcional) */
  cSelo?: string;
  /** Control seal quantity (optional) / [pt-BR] Quantidade de selo de controle (opcional) */
  qSelo?: number;
  /** Tax base in cents / [pt-BR] Base de cálculo em centavos */
  vBC?: number;
  /** IPI rate -- rate * 10000 (4dp) / [pt-BR] Alíquota IPI -- taxa * 10000 (4dp) */
  pIPI?: number;
  /** Standard unit quantity -- qty * 10000 (4dp) / [pt-BR] Quantidade na unidade padrão -- qtd * 10000 (4dp) */
  qUnid?: number;
  /** Value per taxable unit -- value * 10000 (4dp) / [pt-BR] Valor por unidade tributável -- valor * 10000 (4dp) */
  vUnid?: number;
  /** IPI value in cents / [pt-BR] Valor do IPI em centavos */
  vIPI?: number;
}

/**
 * II (Imposto de Importacao) input data.
 *
 * [pt-BR] Dados de entrada do II (Imposto de Importação).
 */
export interface IiData {
  /** Tax base in cents / [pt-BR] Base de cálculo em centavos */
  vBC: number;
  /** Customs expenses in cents / [pt-BR] Despesas aduaneiras em centavos */
  vDespAdu: number;
  /** Import tax value in cents / [pt-BR] Valor do imposto de importação em centavos */
  vII: number;
  /** IOF value in cents / [pt-BR] Valor do IOF em centavos */
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

/**
 * Calculate PIS tax element (domain logic, no XML).
 *
 * [pt-BR] Calcula o elemento PIS (lógica de domínio, sem XML).
 */
export function calculatePis(data: PisData): TaxElement {
  return calculateContributionTax(
    { CST: data.CST, vBC: data.vBC, rate: data.pPIS, value: data.vPIS, qBCProd: data.qBCProd, vAliqProd: data.vAliqProd },
    PIS_CONFIG,
  );
}

/**
 * Build PIS XML string (backward-compatible wrapper).
 *
 * [pt-BR] Gera a string XML do PIS (wrapper compatível).
 */
export function buildPisXml(data: PisData): string {
  return serializeTaxElement(calculatePis(data));
}

/**
 * Calculate PIS-ST tax element (domain logic, no XML).
 *
 * [pt-BR] Calcula o elemento PIS-ST (lógica de domínio, sem XML).
 */
export function calculatePisSt(data: PisStData): TaxElement {
  return calculateContributionTaxSt(
    { vBC: data.vBC, rate: data.pPIS, value: data.vPIS, qBCProd: data.qBCProd, vAliqProd: data.vAliqProd, stIndicator: data.indSomaPISST },
    PIS_CONFIG,
  );
}

/**
 * Build PIS-ST XML string (backward-compatible wrapper).
 *
 * [pt-BR] Gera a string XML do PIS-ST (wrapper compatível).
 */
export function buildPisStXml(data: PisStData): string {
  return serializeTaxElement(calculatePisSt(data));
}

// ── COFINS (public API) ────────────────────────────────────────────────────

/**
 * Calculate COFINS tax element (domain logic, no XML).
 *
 * [pt-BR] Calcula o elemento COFINS (lógica de domínio, sem XML).
 */
export function calculateCofins(data: CofinsData): TaxElement {
  return calculateContributionTax(
    { CST: data.CST, vBC: data.vBC, rate: data.pCOFINS, value: data.vCOFINS, qBCProd: data.qBCProd, vAliqProd: data.vAliqProd },
    COFINS_CONFIG,
  );
}

/**
 * Build COFINS XML string (backward-compatible wrapper).
 *
 * [pt-BR] Gera a string XML da COFINS (wrapper compatível).
 */
export function buildCofinsXml(data: CofinsData): string {
  return serializeTaxElement(calculateCofins(data));
}

/**
 * Calculate COFINS-ST tax element (domain logic, no XML).
 *
 * [pt-BR] Calcula o elemento COFINS-ST (lógica de domínio, sem XML).
 */
export function calculateCofinsSt(data: CofinsStData): TaxElement {
  return calculateContributionTaxSt(
    { vBC: data.vBC, rate: data.pCOFINS, value: data.vCOFINS, qBCProd: data.qBCProd, vAliqProd: data.vAliqProd, stIndicator: data.indSomaCOFINSST },
    COFINS_CONFIG,
  );
}

/**
 * Build COFINS-ST XML string (backward-compatible wrapper).
 *
 * [pt-BR] Gera a string XML da COFINS-ST (wrapper compatível).
 */
export function buildCofinsStXml(data: CofinsStData): string {
  return serializeTaxElement(calculateCofinsSt(data));
}

// ── IPI ─────────────────────────────────────────────────────────────────────

/**
 * Calculate IPI tax element (domain logic, no XML).
 *
 * [pt-BR] Calcula o elemento IPI (lógica de domínio, sem XML).
 */
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

/**
 * Build IPI XML string (backward-compatible wrapper).
 *
 * [pt-BR] Gera a string XML do IPI (wrapper compatível).
 */
export function buildIpiXml(data: IpiData): string {
  return serializeTaxElement(calculateIpi(data));
}

// ── II (Imposto de Importacao) ──────────────────────────────────────────────

/**
 * Calculate II (import tax) element (domain logic, no XML).
 *
 * [pt-BR] Calcula o elemento II (Imposto de Importação) (lógica de domínio, sem XML).
 */
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

/**
 * Build II (import tax) XML string (backward-compatible wrapper).
 *
 * [pt-BR] Gera a string XML do II (Imposto de Importação) (wrapper compatível).
 */
export function buildIiXml(data: IiData): string {
  return serializeTaxElement(calculateIi(data));
}
