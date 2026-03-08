import { tag } from "./xml-builder";

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

// ── Formatting helpers ──────────────────────────────────────────────────────

/** Format cents (integer) to a decimal string with N places. Default 2. */
function fmtCents(cents: number | undefined, decimals = 2): string {
  if (cents == null) return (0).toFixed(decimals);
  return (cents / 100).toFixed(decimals);
}

/** Format a 4-decimal-place integer (value * 10000) to decimal string. */
function fmt4(value: number | undefined): string {
  if (value == null) return (0).toFixed(4);
  return (value / 10000).toFixed(4);
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
export function buildPisXml(data: PisData): string {
  let inner: string;

  if (PIS_COFINS_ALIQ_CSTS.has(data.CST)) {
    inner = tag("PISAliq", {}, [
      tag("CST", {}, data.CST),
      tag("vBC", {}, fmtCents(data.vBC)),
      tag("pPIS", {}, fmt4(data.pPIS)),
      tag("vPIS", {}, fmtCents(data.vPIS)),
    ]);
  } else if (PIS_COFINS_QTDE_CSTS.has(data.CST)) {
    inner = tag("PISQtde", {}, [
      tag("CST", {}, data.CST),
      tag("qBCProd", {}, fmt4(data.qBCProd)),
      tag("vAliqProd", {}, fmt4(data.vAliqProd)),
      tag("vPIS", {}, fmtCents(data.vPIS)),
    ]);
  } else if (PIS_COFINS_NT_CSTS.has(data.CST)) {
    inner = tag("PISNT", {}, [
      tag("CST", {}, data.CST),
    ]);
  } else if (PIS_COFINS_OUTR_CSTS.has(data.CST)) {
    inner = buildPisOutrInner(data);
  } else {
    // Fallback: treat unknown CSTs as PISNT
    inner = tag("PISNT", {}, [
      tag("CST", {}, data.CST),
    ]);
  }

  return tag("PIS", {}, [inner]);
}

function buildPisOutrInner(data: PisData): string {
  const children: string[] = [tag("CST", {}, data.CST)];

  if (data.qBCProd != null) {
    // Quantity-based calculation
    children.push(tag("qBCProd", {}, fmt4(data.qBCProd)));
    children.push(tag("vAliqProd", {}, fmt4(data.vAliqProd)));
  } else {
    // Percentage-based calculation
    children.push(tag("vBC", {}, fmtCents(data.vBC)));
    children.push(tag("pPIS", {}, fmt4(data.pPIS)));
  }

  children.push(tag("vPIS", {}, fmtCents(data.vPIS)));

  return tag("PISOutr", {}, children);
}

/**
 * Build `<PISST>` XML group (R01) for a det item.
 * PIS Substituicao Tributaria (optional).
 */
export function buildPisStXml(data: PisStData): string {
  const children: string[] = [];

  if (data.qBCProd != null) {
    children.push(tag("qBCProd", {}, fmt4(data.qBCProd)));
    children.push(tag("vAliqProd", {}, fmt4(data.vAliqProd)));
  } else {
    children.push(tag("vBC", {}, fmtCents(data.vBC)));
    children.push(tag("pPIS", {}, fmt4(data.pPIS)));
  }

  children.push(tag("vPIS", {}, fmtCents(data.vPIS)));

  if (data.indSomaPISST != null) {
    children.push(tag("indSomaPISST", {}, String(data.indSomaPISST)));
  }

  return tag("PISST", {}, children);
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
export function buildCofinsXml(data: CofinsData): string {
  let inner: string;

  if (PIS_COFINS_ALIQ_CSTS.has(data.CST)) {
    inner = tag("COFINSAliq", {}, [
      tag("CST", {}, data.CST),
      tag("vBC", {}, fmtCents(data.vBC)),
      tag("pCOFINS", {}, fmt4(data.pCOFINS)),
      tag("vCOFINS", {}, fmtCents(data.vCOFINS)),
    ]);
  } else if (PIS_COFINS_QTDE_CSTS.has(data.CST)) {
    inner = tag("COFINSQtde", {}, [
      tag("CST", {}, data.CST),
      tag("qBCProd", {}, fmt4(data.qBCProd)),
      tag("vAliqProd", {}, fmt4(data.vAliqProd)),
      tag("vCOFINS", {}, fmtCents(data.vCOFINS)),
    ]);
  } else if (PIS_COFINS_NT_CSTS.has(data.CST)) {
    inner = tag("COFINSNT", {}, [
      tag("CST", {}, data.CST),
    ]);
  } else if (PIS_COFINS_OUTR_CSTS.has(data.CST)) {
    inner = buildCofinsOutrInner(data);
  } else {
    // Fallback: treat unknown CSTs as COFINSNT
    inner = tag("COFINSNT", {}, [
      tag("CST", {}, data.CST),
    ]);
  }

  return tag("COFINS", {}, [inner]);
}

function buildCofinsOutrInner(data: CofinsData): string {
  const children: string[] = [tag("CST", {}, data.CST)];

  if (data.qBCProd != null) {
    children.push(tag("qBCProd", {}, fmt4(data.qBCProd)));
    children.push(tag("vAliqProd", {}, fmt4(data.vAliqProd)));
  } else {
    children.push(tag("vBC", {}, fmtCents(data.vBC)));
    children.push(tag("pCOFINS", {}, fmt4(data.pCOFINS)));
  }

  children.push(tag("vCOFINS", {}, fmtCents(data.vCOFINS)));

  return tag("COFINSOutr", {}, children);
}

/**
 * Build `<COFINSST>` XML group (T01) for a det item.
 * COFINS Substituicao Tributaria (optional).
 */
export function buildCofinsStXml(data: CofinsStData): string {
  const children: string[] = [];

  if (data.qBCProd != null) {
    children.push(tag("qBCProd", {}, fmt4(data.qBCProd)));
    children.push(tag("vAliqProd", {}, fmt4(data.vAliqProd)));
  } else {
    children.push(tag("vBC", {}, fmtCents(data.vBC)));
    children.push(tag("pCOFINS", {}, fmt4(data.pCOFINS)));
  }

  children.push(tag("vCOFINS", {}, fmtCents(data.vCOFINS)));

  if (data.indSomaCOFINSST != null) {
    children.push(tag("indSomaCOFINSST", {}, String(data.indSomaCOFINSST)));
  }

  return tag("COFINSST", {}, children);
}

// ── IPI ─────────────────────────────────────────────────────────────────────

/**
 * Build `<IPI>` XML group (O01) for a det item.
 *
 * Routes based on CST:
 * - IPITrib (CST 00, 49, 50, 99): vBC+pIPI or qUnid+vUnid, then vIPI
 * - IPINT   (all other CSTs): just CST
 */
export function buildIpiXml(data: IpiData): string {
  const children: string[] = [];

  // Optional header fields
  if (data.CNPJProd) {
    children.push(tag("CNPJProd", {}, data.CNPJProd));
  }
  if (data.cSelo) {
    children.push(tag("cSelo", {}, data.cSelo));
  }
  if (data.qSelo != null) {
    children.push(tag("qSelo", {}, String(data.qSelo)));
  }

  // cEnq is required
  children.push(tag("cEnq", {}, data.cEnq));

  if (IPI_TRIB_CSTS.has(data.CST)) {
    // IPITrib
    const tribChildren: string[] = [tag("CST", {}, data.CST)];

    if (data.vBC != null && data.pIPI != null) {
      // Percentage-based
      tribChildren.push(tag("vBC", {}, fmtCents(data.vBC)));
      tribChildren.push(tag("pIPI", {}, fmt4(data.pIPI)));
    } else {
      // Unit-based
      tribChildren.push(tag("qUnid", {}, fmt4(data.qUnid)));
      tribChildren.push(tag("vUnid", {}, fmt4(data.vUnid)));
    }

    tribChildren.push(tag("vIPI", {}, fmtCents(data.vIPI)));

    children.push(tag("IPITrib", {}, tribChildren));
  } else {
    // IPINT (non-taxed)
    children.push(tag("IPINT", {}, [
      tag("CST", {}, data.CST),
    ]));
  }

  return tag("IPI", {}, children);
}

// ── II (Imposto de Importacao) ──────────────────────────────────────────────

/**
 * Build `<II>` XML group (P01) for a det item.
 * Import tax — all fields required.
 */
export function buildIiXml(data: IiData): string {
  return tag("II", {}, [
    tag("vBC", {}, fmtCents(data.vBC)),
    tag("vDespAdu", {}, fmtCents(data.vDespAdu)),
    tag("vII", {}, fmtCents(data.vII)),
    tag("vIOF", {}, fmtCents(data.vIOF)),
  ]);
}
