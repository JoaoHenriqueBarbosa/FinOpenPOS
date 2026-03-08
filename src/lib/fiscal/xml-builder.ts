import crypto from "node:crypto";
import { STATE_CODES, NFE_NAMESPACE, NFE_VERSION, PAYMENT_TYPES } from "./constants";
import type {
  AccessKeyParams,
  InvoiceBuildData,
  InvoiceItemData,
  PaymentData,
  InvoiceModel,
  EmissionType,
} from "./types";

/**
 * Build a complete NF-e or NFC-e XML (unsigned).
 * The XML follows layout 4.00 as defined by MOC.
 */
export function buildInvoiceXml(data: InvoiceBuildData): {
  xml: string;
  accessKey: string;
} {
  const stateIbge = STATE_CODES[data.issuer.stateCode];
  if (!stateIbge) {
    throw new Error(`Unknown state code: ${data.issuer.stateCode}`);
  }

  const numericCode = generateNumericCode();
  const yearMonth = formatYearMonth(data.issuedAt);

  const accessKeyParams: AccessKeyParams = {
    stateCode: stateIbge,
    yearMonth,
    taxId: data.issuer.taxId,
    model: data.model,
    series: data.series,
    number: data.number,
    emissionType: data.emissionType,
    numericCode,
  };

  const accessKey = buildAccessKey(accessKeyParams);
  const infNFeId = `NFe${accessKey}`;

  // Calculate totals
  const totalProducts = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalIcms = data.items.reduce((sum, item) => sum + item.icmsAmount, 0);

  const infNFe = tag("infNFe", { xmlns: NFE_NAMESPACE, versao: NFE_VERSION, Id: infNFeId }, [
    buildIde(data, stateIbge, numericCode, accessKey),
    buildEmit(data),
    ...(data.recipient ? [buildDest(data)] : []),
    ...data.items.map((item) => buildDet(item, data.model)),
    buildTotal(totalProducts, totalIcms),
    buildTransp(),
    buildPag(data.payments),
    buildInfAdic(data),
  ]);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>${tag("NFe", { xmlns: NFE_NAMESPACE }, [infNFe])}`;

  return { xml, accessKey };
}

/**
 * Build the access key (chave de acesso) — 44 digits.
 *
 * Format: cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9)
 *         + tpEmis(1) + cNF(8) + cDV(1)
 */
export function buildAccessKey(params: AccessKeyParams): string {
  const parts = [
    params.stateCode.padStart(2, "0"),
    params.yearMonth,
    params.taxId.padStart(14, "0"),
    String(params.model).padStart(2, "0"),
    String(params.series).padStart(3, "0"),
    String(params.number).padStart(9, "0"),
    String(params.emissionType),
    params.numericCode.padStart(8, "0"),
  ].join("");

  const checkDigit = calculateMod11(parts);
  return parts + checkDigit;
}

/**
 * Build NFC-e QR Code URL.
 *
 * Format varies by version; using version 2 (current):
 * {base_url}?p={chNFe}|{nVersao}|{tpAmb}|{cDest}|{dhEmi_hex}|{vNF}|{vICMS}|{digVal_hex}|{cIdToken}|{hashQRCode}
 */
export function buildNfceQrCode(
  accessKey: string,
  environment: 1 | 2,
  cscId: string,
  cscToken: string,
  qrCodeBaseUrl: string
): string {
  // Simplified QR Code (version 2) for online mode
  const payload = `${accessKey}|${2}|${environment}|${cscId}`;
  const hashInput = payload + cscToken;
  const hash = crypto.createHash("sha1").update(hashInput).digest("hex");

  return `${qrCodeBaseUrl}?p=${payload}|${hash}`;
}

// ── XML group builders ──────────────────────────────────────────────────────

function buildIde(
  data: InvoiceBuildData,
  stateIbge: string,
  numericCode: string,
  accessKey: string
): string {
  const isNfce = data.model === 65;
  const destOperation = isNfce ? "1" : "1"; // 1=internal, 2=interstate, 3=foreign
  const consumerType = isNfce ? "1" : "0"; // 1=final consumer, 0=normal
  const buyerPresence = isNfce ? "1" : "0"; // 1=in-person, 0=not applicable

  return tag("ide", {}, [
    tag("cUF", {}, stateIbge),
    tag("cNF", {}, numericCode),
    tag("natOp", {}, data.operationNature),
    tag("mod", {}, String(data.model)),
    tag("serie", {}, String(data.series)),
    tag("nNF", {}, String(data.number)),
    tag("dhEmi", {}, formatDateTimeNfe(data.issuedAt, data.issuer.stateCode)),
    tag("tpNF", {}, "1"), // 0=inbound, 1=outbound
    tag("idDest", {}, destOperation),
    tag("cMunFG", {}, data.issuer.cityCode),
    tag("tpImp", {}, isNfce ? "4" : "1"), // 1=portrait DANFE, 4=NFC-e DANFCE
    tag("tpEmis", {}, String(data.emissionType)),
    tag("cDV", {}, accessKey.slice(-1)),
    tag("tpAmb", {}, String(data.environment)),
    tag("finNFe", {}, "1"), // 1=normal
    tag("indFinal", {}, consumerType),
    tag("indPres", {}, buyerPresence),
    tag("indIntermed", {}, "0"), // 0=no intermediary
    tag("procEmi", {}, "0"), // 0=own application
    tag("verProc", {}, "FinOpenPOS 1.0"),
  ]);
}

function buildEmit(data: InvoiceBuildData): string {
  return tag("emit", {}, [
    tag("CNPJ", {}, data.issuer.taxId),
    tag("xNome", {}, data.issuer.companyName),
    ...(data.issuer.tradeName ? [tag("xFant", {}, data.issuer.tradeName)] : []),
    tag("enderEmit", {}, [
      tag("xLgr", {}, data.issuer.street),
      tag("nro", {}, data.issuer.streetNumber),
      ...(data.issuer.addressComplement
        ? [tag("xCpl", {}, data.issuer.addressComplement)]
        : []),
      tag("xBairro", {}, data.issuer.district),
      tag("cMun", {}, data.issuer.cityCode),
      tag("xMun", {}, ""), // City name (filled by caller or lookup)
      tag("UF", {}, data.issuer.stateCode),
      tag("CEP", {}, data.issuer.zipCode),
      tag("cPais", {}, "1058"),
      tag("xPais", {}, "Brasil"),
    ]),
    tag("IE", {}, data.issuer.stateTaxId),
    tag("CRT", {}, String(data.issuer.taxRegime)),
  ]);
}

function buildDest(data: InvoiceBuildData): string {
  if (!data.recipient) return "";

  const taxIdTag =
    data.recipient.taxId.length <= 11
      ? tag("CPF", {}, data.recipient.taxId.padStart(11, "0"))
      : tag("CNPJ", {}, data.recipient.taxId.padStart(14, "0"));

  const isNfce = data.model === 65;

  return tag("dest", {}, [
    taxIdTag,
    ...(data.recipient.name ? [tag("xNome", {}, data.recipient.name)] : []),
    ...(!isNfce
      ? [
          tag("enderDest", {}, [
            tag("xLgr", {}, ""),
            tag("nro", {}, ""),
            tag("xBairro", {}, ""),
            tag("cMun", {}, ""),
            tag("xMun", {}, ""),
            tag("UF", {}, data.recipient.stateCode || data.issuer.stateCode),
            tag("CEP", {}, ""),
            tag("cPais", {}, "1058"),
            tag("xPais", {}, "Brasil"),
          ]),
        ]
      : []),
    tag("indIEDest", {}, "9"), // 9=non-contributor
  ]);
}

function buildDet(item: InvoiceItemData, model: InvoiceModel): string {
  const isSimples = true; // TODO: derive from tax regime

  return tag("det", { nItem: String(item.itemNumber) }, [
    tag("prod", {}, [
      tag("cProd", {}, item.productCode),
      tag("cEAN", {}, "SEM GTIN"),
      tag("xProd", {}, item.description),
      tag("NCM", {}, item.ncm),
      tag("CFOP", {}, item.cfop),
      tag("uCom", {}, item.unitOfMeasure),
      tag("qCom", {}, formatDecimal(item.quantity, 4)),
      tag("vUnCom", {}, formatCents(item.unitPrice, 10)),
      tag("vProd", {}, formatCents(item.totalPrice)),
      tag("cEANTrib", {}, "SEM GTIN"),
      tag("uTrib", {}, item.unitOfMeasure),
      tag("qTrib", {}, formatDecimal(item.quantity, 4)),
      tag("vUnTrib", {}, formatCents(item.unitPrice, 10)),
      tag("indTot", {}, "1"), // 1=included in total
    ]),
    tag("imposto", {}, [
      buildIcms(item, isSimples),
      buildPis(item),
      buildCofins(item),
    ]),
  ]);
}

function buildIcms(item: InvoiceItemData, isSimples: boolean): string {
  if (isSimples) {
    // Simples Nacional — CSOSN 102 (without credit)
    return tag("ICMS", {}, [
      tag("ICMSSN102", {}, [
        tag("orig", {}, "0"), // 0=national
        tag("CSOSN", {}, "102"),
      ]),
    ]);
  }

  return tag("ICMS", {}, [
    tag("ICMS00", {}, [
      tag("orig", {}, "0"),
      tag("CST", {}, item.icmsCst),
      tag("modBC", {}, "0"), // 0=margin value
      tag("vBC", {}, formatCents(item.totalPrice)),
      tag("pICMS", {}, formatDecimal(item.icmsRate / 100, 4)),
      tag("vICMS", {}, formatCents(item.icmsAmount)),
    ]),
  ]);
}

function buildPis(item: InvoiceItemData): string {
  return tag("PIS", {}, [
    tag("PISOutr", {}, [
      tag("CST", {}, item.pisCst),
      tag("vBC", {}, "0.00"),
      tag("pPIS", {}, "0.0000"),
      tag("vPIS", {}, "0.00"),
    ]),
  ]);
}

function buildCofins(item: InvoiceItemData): string {
  return tag("COFINS", {}, [
    tag("COFINSOutr", {}, [
      tag("CST", {}, item.cofinsCst),
      tag("vBC", {}, "0.00"),
      tag("pCOFINS", {}, "0.0000"),
      tag("vCOFINS", {}, "0.00"),
    ]),
  ]);
}

function buildTotal(totalProducts: number, totalIcms: number): string {
  const vProd = formatCents(totalProducts);
  const vICMS = formatCents(totalIcms);

  return tag("total", {}, [
    tag("ICMSTot", {}, [
      tag("vBC", {}, totalIcms > 0 ? vProd : "0.00"),
      tag("vICMS", {}, vICMS),
      tag("vICMSDeson", {}, "0.00"),
      tag("vFCPUFDest", {}, "0.00"),
      tag("vICMSUFDest", {}, "0.00"),
      tag("vICMSUFRemet", {}, "0.00"),
      tag("vFCP", {}, "0.00"),
      tag("vBCST", {}, "0.00"),
      tag("vST", {}, "0.00"),
      tag("vFCPST", {}, "0.00"),
      tag("vFCPSTRet", {}, "0.00"),
      tag("vProd", {}, vProd),
      tag("vFrete", {}, "0.00"),
      tag("vSeg", {}, "0.00"),
      tag("vDesc", {}, "0.00"),
      tag("vII", {}, "0.00"),
      tag("vIPI", {}, "0.00"),
      tag("vIPIDevol", {}, "0.00"),
      tag("vPIS", {}, "0.00"),
      tag("vCOFINS", {}, "0.00"),
      tag("vOutro", {}, "0.00"),
      tag("vNF", {}, vProd),
    ]),
  ]);
}

function buildTransp(): string {
  return tag("transp", {}, [
    tag("modFrete", {}, "9"), // 9=no freight
  ]);
}

function buildPag(payments: PaymentData[]): string {
  if (payments.length === 0) {
    return tag("pag", {}, [
      tag("detPag", {}, [
        tag("tPag", {}, PAYMENT_TYPES.none),
        tag("vPag", {}, "0.00"),
      ]),
    ]);
  }

  return tag("pag", {}, payments.map((p) =>
    tag("detPag", {}, [
      tag("tPag", {}, p.method),
      tag("vPag", {}, formatCents(p.amount)),
    ])
  ));
}

function buildInfAdic(data: InvoiceBuildData): string {
  const notes: string[] = [];

  if (data.contingency) {
    notes.push(
      `Emitida em contingencia (${data.contingency.type}). ` +
      `Motivo: ${data.contingency.reason}`
    );
  }

  if (data.environment === 2) {
    notes.push("EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL");
  }

  if (notes.length === 0) return "";

  return tag("infAdic", {}, [
    tag("infCpl", {}, notes.join("; ")),
  ]);
}

// ── Utility functions ───────────────────────────────────────────────────────

/**
 * Build an XML tag with optional attributes and children.
 */
export function tag(
  name: string,
  attrs: Record<string, string> = {},
  children?: string | string[]
): string {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join("");

  if (children === undefined || children === "") {
    return `<${name}${attrStr}></${name}>`;
  }

  const content = Array.isArray(children) ? children.join("") : escapeXml(children);
  return `<${name}${attrStr}>${content}</${name}>`;
}

/** Escape special XML characters in text content */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Generate 8-digit random numeric code */
function generateNumericCode(): string {
  return String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
}

/** Format date as AAMM */
function formatYearMonth(date: Date): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return yy + mm;
}

/**
 * Format date/time for NF-e (ISO 8601 with timezone offset).
 * Example: 2025-01-15T10:30:00-03:00
 */
function formatDateTimeNfe(date: Date, stateCode: string): string {
  // Brazil timezone offsets by state
  const offsets: Record<string, string> = {
    AC: "-05:00", AM: "-04:00", AP: "-03:00", PA: "-03:00", RO: "-04:00",
    RR: "-04:00", TO: "-03:00", MT: "-04:00", MS: "-04:00",
    // All others are -03:00 (Brasilia time)
  };
  const offset = offsets[stateCode] || "-03:00";

  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  return `${y}-${m}-${d}T${h}:${min}:${s}${offset}`;
}

/** Format cents to decimal string (e.g., 1050 → "10.50") */
function formatCents(cents: number, decimalPlaces = 2): string {
  return (cents / 100).toFixed(decimalPlaces);
}

/** Format a number with N decimal places */
function formatDecimal(value: number, decimalPlaces: number): string {
  return value.toFixed(decimalPlaces);
}

/**
 * Calculate modulo 11 check digit (used for access key).
 * Weights cycle from 2 to 9 right-to-left.
 * Result: if remainder < 2 → digit 0; else 11 - remainder.
 */
function calculateMod11(digits: string): string {
  let sum = 0;
  let weight = 2;

  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i]) * weight;
    weight = weight >= 9 ? 2 : weight + 1;
  }

  const remainder = sum % 11;
  const digit = remainder < 2 ? 0 : 11 - remainder;
  return String(digit);
}
