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

// ── PIS ─────────────────────────────────────────────────────────────────────

/**
 * Build `<PIS>` XML group (Q01) for a det item.
 *
 * Routes to the correct child tag based on CST:
 * - PISAliq  (CST 01, 02)
 * - PISQtde  (CST 03)
 * - PISNT    (CST 04-09)
 * - PISOutr  (CST 49, 50-75, 98, 99)
 */
export function calculatePis(data: PisData): TaxElement {
  let variantTag: string;
  let fields: TaxField[];

  if (PIS_COFINS_ALIQ_CSTS.has(data.CST)) {
    variantTag = "PISAliq";
    fields = [
      { name: "CST", value: data.CST },
      { name: "vBC", value: formatCentsOrZero(data.vBC) },
      { name: "pPIS", value: formatRate4OrZero(data.pPIS) },
      { name: "vPIS", value: formatCentsOrZero(data.vPIS) },
    ];
  } else if (PIS_COFINS_QTDE_CSTS.has(data.CST)) {
    variantTag = "PISQtde";
    fields = [
      { name: "CST", value: data.CST },
      { name: "qBCProd", value: formatRate4OrZero(data.qBCProd) },
      { name: "vAliqProd", value: formatRate4OrZero(data.vAliqProd) },
      { name: "vPIS", value: formatCentsOrZero(data.vPIS) },
    ];
  } else if (PIS_COFINS_NT_CSTS.has(data.CST)) {
    variantTag = "PISNT";
    fields = [{ name: "CST", value: data.CST }];
  } else if (PIS_COFINS_OUTR_CSTS.has(data.CST)) {
    variantTag = "PISOutr";
    fields = calculatePisOutrFields(data);
  } else {
    variantTag = "PISNT";
    fields = [{ name: "CST", value: data.CST }];
  }

  return { outerTag: "PIS", outerFields: [], variantTag, fields };
}

export function buildPisXml(data: PisData): string {
  return serializeTaxElement(calculatePis(data));
}

function calculatePisOutrFields(data: PisData): TaxField[] {
  const fields: TaxField[] = [{ name: "CST", value: data.CST }];

  if (data.qBCProd != null) {
    fields.push({ name: "qBCProd", value: formatRate4OrZero(data.qBCProd) });
    fields.push({ name: "vAliqProd", value: formatRate4OrZero(data.vAliqProd) });
  } else {
    fields.push({ name: "vBC", value: formatCentsOrZero(data.vBC) });
    fields.push({ name: "pPIS", value: formatRate4OrZero(data.pPIS) });
  }

  fields.push({ name: "vPIS", value: formatCentsOrZero(data.vPIS) });
  return fields;
}

export function calculatePisSt(data: PisStData): TaxElement {
  const fields: TaxField[] = [];

  if (data.qBCProd != null) {
    fields.push({ name: "qBCProd", value: formatRate4OrZero(data.qBCProd) });
    fields.push({ name: "vAliqProd", value: formatRate4OrZero(data.vAliqProd) });
  } else {
    fields.push({ name: "vBC", value: formatCentsOrZero(data.vBC) });
    fields.push({ name: "pPIS", value: formatRate4OrZero(data.pPIS) });
  }

  fields.push({ name: "vPIS", value: formatCentsOrZero(data.vPIS) });

  if (data.indSomaPISST != null) {
    fields.push({ name: "indSomaPISST", value: String(data.indSomaPISST) });
  }

  return { outerTag: null, outerFields: [], variantTag: "PISST", fields };
}

export function buildPisStXml(data: PisStData): string {
  return serializeTaxElement(calculatePisSt(data));
}

// ── COFINS ──────────────────────────────────────────────────────────────────

/**
 * Build `<COFINS>` XML group (S01) for a det item.
 *
 * Routes to the correct child tag based on CST:
 * - COFINSAliq  (CST 01, 02)
 * - COFINSQtde  (CST 03)
 * - COFINSNT    (CST 04-09)
 * - COFINSOutr  (CST 49, 50-75, 98, 99)
 */
export function calculateCofins(data: CofinsData): TaxElement {
  let variantTag: string;
  let fields: TaxField[];

  if (PIS_COFINS_ALIQ_CSTS.has(data.CST)) {
    variantTag = "COFINSAliq";
    fields = [
      { name: "CST", value: data.CST },
      { name: "vBC", value: formatCentsOrZero(data.vBC) },
      { name: "pCOFINS", value: formatRate4OrZero(data.pCOFINS) },
      { name: "vCOFINS", value: formatCentsOrZero(data.vCOFINS) },
    ];
  } else if (PIS_COFINS_QTDE_CSTS.has(data.CST)) {
    variantTag = "COFINSQtde";
    fields = [
      { name: "CST", value: data.CST },
      { name: "qBCProd", value: formatRate4OrZero(data.qBCProd) },
      { name: "vAliqProd", value: formatRate4OrZero(data.vAliqProd) },
      { name: "vCOFINS", value: formatCentsOrZero(data.vCOFINS) },
    ];
  } else if (PIS_COFINS_NT_CSTS.has(data.CST)) {
    variantTag = "COFINSNT";
    fields = [{ name: "CST", value: data.CST }];
  } else if (PIS_COFINS_OUTR_CSTS.has(data.CST)) {
    variantTag = "COFINSOutr";
    fields = calculateCofinsOutrFields(data);
  } else {
    variantTag = "COFINSNT";
    fields = [{ name: "CST", value: data.CST }];
  }

  return { outerTag: "COFINS", outerFields: [], variantTag, fields };
}

export function buildCofinsXml(data: CofinsData): string {
  return serializeTaxElement(calculateCofins(data));
}

function calculateCofinsOutrFields(data: CofinsData): TaxField[] {
  const fields: TaxField[] = [{ name: "CST", value: data.CST }];

  if (data.qBCProd != null) {
    fields.push({ name: "qBCProd", value: formatRate4OrZero(data.qBCProd) });
    fields.push({ name: "vAliqProd", value: formatRate4OrZero(data.vAliqProd) });
  } else {
    fields.push({ name: "vBC", value: formatCentsOrZero(data.vBC) });
    fields.push({ name: "pCOFINS", value: formatRate4OrZero(data.pCOFINS) });
  }

  fields.push({ name: "vCOFINS", value: formatCentsOrZero(data.vCOFINS) });
  return fields;
}

export function calculateCofinsSt(data: CofinsStData): TaxElement {
  const fields: TaxField[] = [];

  if (data.qBCProd != null) {
    fields.push({ name: "qBCProd", value: formatRate4OrZero(data.qBCProd) });
    fields.push({ name: "vAliqProd", value: formatRate4OrZero(data.vAliqProd) });
  } else {
    fields.push({ name: "vBC", value: formatCentsOrZero(data.vBC) });
    fields.push({ name: "pCOFINS", value: formatRate4OrZero(data.pCOFINS) });
  }

  fields.push({ name: "vCOFINS", value: formatCentsOrZero(data.vCOFINS) });

  if (data.indSomaCOFINSST != null) {
    fields.push({ name: "indSomaCOFINSST", value: String(data.indSomaCOFINSST) });
  }

  return { outerTag: null, outerFields: [], variantTag: "COFINSST", fields };
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
