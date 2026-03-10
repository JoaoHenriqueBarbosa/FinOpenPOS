import crypto from "node:crypto";
import type { EmissionType, SefazEnvironment } from "./types";
import { extractXmlTagValue } from "./xml-utils";

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * QR Code version: 200 (v2) or 300 (v3, NT 2025.001).
 *
 * [pt-BR] Versao do QR Code: 200 (v2) ou 300 (v3, NT 2025.001).
 */
export type QrCodeVersion = 200 | 300;

/**
 * Destination ID type (tp_idDest): 1=CNPJ, 2=CPF, 3=foreign, ""=none.
 *
 * [pt-BR] Tipo de identificacao do destinatario: 1=CNPJ, 2=CPF, 3=estrangeiro, ""=sem dest.
 */
export type DestIdType = "" | 1 | 2 | 3;

/**
 * Parameters for building an NFC-e QR Code URL.
 *
 * [pt-BR] Parametros para construcao da URL do QR Code NFC-e.
 */
export interface NfceQrCodeParams {
  /** 44-digit access key / [pt-BR] Chave de acesso de 44 digitos */
  accessKey: string;
  /** QR Code version (200 or 300) / [pt-BR] Versao do QR Code (200 ou 300) */
  version: QrCodeVersion;
  /** Environment: 1=production, 2=homologation / [pt-BR] Ambiente: 1=producao, 2=homologacao */
  environment: SefazEnvironment;
  /** Emission type (1=normal, 9=offline contingency, etc.) / [pt-BR] Tipo de emissao */
  emissionType: EmissionType;
  /** QR Code base URL (state-specific) / [pt-BR] URL base do QR Code (por estado) */
  qrCodeBaseUrl: string;
  /** CSC token (required for v200) / [pt-BR] Token CSC (obrigatorio para v200) */
  cscToken?: string;
  /** CSC numeric ID (required for v200) / [pt-BR] ID numerico do CSC (obrigatorio para v200) */
  cscId?: string;
  /** Emission date/time ISO string (required for offline) / [pt-BR] Data/hora de emissao ISO (obrigatorio para offline) */
  issuedAt?: string;
  /** Total invoice value as string e.g. "150.00" (required for offline) / [pt-BR] Valor total da nota, ex. "150.00" */
  totalValue?: string;
  /** Total ICMS value as string e.g. "0.00" (required for v200 offline) / [pt-BR] Valor total ICMS */
  totalIcms?: string;
  /** DigestValue from XML signature Base64 (required for v200 offline) / [pt-BR] DigestValue da assinatura XML */
  digestValue?: string;
  /** Destination document (CPF/CNPJ/idEstrangeiro) / [pt-BR] Documento do destinatario */
  destDocument?: string;
  /** Destination ID type (required for v300 offline) / [pt-BR] Tipo de ID do destinatario */
  destIdType?: DestIdType;
  /** Sign function for v300 offline -- receives payload, returns base64 signature / [pt-BR] Funcao de assinatura para v300 offline */
  signFn?: (payload: string) => Promise<string> | string;
}

// ── QR Code URL builder ─────────────────────────────────────────────────────

/**
 * Build the NFC-e QR Code URL.
 *
 * [pt-BR] Constroi a URL do QR Code NFC-e.
 *
 * Supports version 2 (v200) and version 3 (v300, NT 2025.001).
 * Online mode uses a simplified format; offline (tpEmis=9) includes
 * additional fields for validation without network.
 *
 * [pt-BR] Suporta versao 2 (v200) e versao 3 (v300, NT 2025.001).
 * Modo online usa formato simplificado; offline (tpEmis=9) inclui
 * campos adicionais para validacao sem rede.
 */
export async function buildNfceQrCodeUrl(
  params: NfceQrCodeParams
): Promise<string> {
  const url = ensureQueryParam(params.qrCodeBaseUrl);

  if (params.version >= 300) {
    return buildV300(url, params);
  }
  return buildV200(url, params);
}

// ── Version 200 ─────────────────────────────────────────────────────────────

function buildV200(url: string, params: NfceQrCodeParams): string {
  if (!params.cscToken) {
    throw new Error("CSC token is required for QR Code v200");
  }
  if (!params.cscId) {
    throw new Error("CSC ID is required for QR Code v200");
  }

  const ver = 2;
  const cscId = parseInt(params.cscId, 10);
  const csc = params.cscToken;

  if (params.emissionType !== 9) {
    // Online mode — simplified
    const seq = `${params.accessKey}|${ver}|${params.environment}|${cscId}`;
    const hash = sha1Hex(seq + csc);
    return `${url}${seq}|${hash}`;
  }

  // Offline mode — full format
  if (!params.issuedAt || !params.totalValue || !params.digestValue) {
    throw new Error(
      "issuedAt, totalValue, and digestValue are required for offline QR Code v200"
    );
  }

  const dia = extractDay(params.issuedAt);
  const valor = formatValue(params.totalValue);
  const digHex = str2Hex(params.digestValue);
  const seq = `${params.accessKey}|${ver}|${params.environment}|${dia}|${valor}|${digHex}|${cscId}`;
  const hash = sha1Hex(seq + csc);
  return `${url}${seq}|${hash}`;
}

// ── Version 300 (NT 2025.001) ───────────────────────────────────────────────

async function buildV300(
  url: string,
  params: NfceQrCodeParams
): Promise<string> {
  if (params.emissionType !== 9) {
    // Online mode — very simple
    return `${url}${params.accessKey}|3|${params.environment}`;
  }

  // Offline mode
  if (!params.issuedAt || !params.totalValue || !params.signFn) {
    throw new Error(
      "issuedAt, totalValue, and signFn are required for offline QR Code v300"
    );
  }

  const dia = extractDay(params.issuedAt);
  const valor = formatValue(params.totalValue);
  const tpIdDest = params.destIdType ?? "";
  // Foreign destination or unidentified: only separator, no value
  const cDest = tpIdDest === 3 ? "" : (params.destDocument ?? "");

  const payloadToSign = `${params.accessKey}|3|${params.environment}|${dia}|${valor}|${tpIdDest}|${cDest}`;
  const signature = await params.signFn(payloadToSign);

  return `${url}${payloadToSign}|${signature}`;
}

// ── Consult URL builder ─────────────────────────────────────────────────────

/**
 * Build the NFC-e urlChave tag content for consulting the NFe by access key.
 *
 * [pt-BR] Constroi o conteudo da tag urlChave para consulta da NFe pela chave de acesso.
 */
export function buildNfceConsultUrl(
  urlChave: string,
  accessKey: string,
  environment: SefazEnvironment
): string {
  const sep = urlChave.includes("?") ? "&" : "?";
  return `${urlChave}${sep}p=${accessKey}|${environment}`;
}

// ── Utility functions ───────────────────────────────────────────────────────

/** Ensure the URL ends with "?p=" */
function ensureQueryParam(url: string): string {
  if (url.includes("?p=")) return url;
  return `${url}?p=`;
}

/** SHA-1 hex digest (uppercase) */
function sha1Hex(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex").toUpperCase();
}

/** Convert a string to its hexadecimal ASCII representation */
function str2Hex(str: string): string {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

/** Extract the day (dd) from an ISO date string */
function extractDay(isoDate: string): string {
  const date = new Date(isoDate);
  return String(date.getDate()).padStart(2, "0");
}

/** Format a numeric value to 2 decimal places */
function formatValue(value: string): string {
  return parseFloat(value).toFixed(2);
}

// ── putQRTag — Insert QR Code into NFC-e XML ─────────────────────────────────

/**
 * Parameters for inserting QR Code into NFC-e XML.
 *
 * [pt-BR] Parametros para insercao do QR Code no XML da NFC-e.
 */
export interface PutQRTagParams {
  /** Signed NFC-e XML string / [pt-BR] XML assinado da NFC-e */
  xml: string;
  /** CSC token / [pt-BR] Token CSC */
  cscToken: string;
  /** CSC ID (e.g. "000001") / [pt-BR] ID do CSC (ex. "000001") */
  cscId: string;
  /** QR Code version string (e.g. "200") / [pt-BR] Versao do QR Code (ex. "200") */
  version: string;
  /** QR Code base URL / [pt-BR] URL base do QR Code */
  qrCodeBaseUrl: string;
  /** URL for chave consultation (urlChave) / [pt-BR] URL para consulta pela chave */
  urlChave: string;
}

/**
 * Insert QR Code and urlChave tags into a signed NFC-e XML.
 *
 * [pt-BR] Insere tags de QR Code e urlChave em um XML de NFC-e assinado.
 *
 * Ported from PHP NFePHP\NFe\Factories\QRCode::putQRTag().
 * Creates an <infNFeSupl> element with <qrCode> and <urlChave> children,
 * and inserts it before the <Signature> element in the NFe.
 *
 * [pt-BR] Cria um elemento <infNFeSupl> com filhos <qrCode> e <urlChave>,
 * e insere antes do elemento <Signature> na NFe.
 *
 * @returns Modified XML string with infNFeSupl inserted
 * [pt-BR] @returns String XML modificada com infNFeSupl inserido
 */
export async function putQRTag(params: PutQRTagParams): Promise<string> {
  const { xml, cscToken, cscId, version, qrCodeBaseUrl, urlChave } = params;

  const ver = version.trim() || "200";
  const token = cscToken.trim();
  const tokenId = cscId.trim();
  const urlqr = qrCodeBaseUrl.trim();
  const urichave = urlChave.trim();

  if (parseInt(ver) < 300) {
    if (!token) {
      throw new Error("CSC token is required");
    }
    if (!tokenId) {
      throw new Error("CSC ID is required");
    }
  }
  if (!urlqr) {
    throw new Error("QR Code URL is required");
  }

  // Extract fields from XML
  const chNFe = extractXmlTagAttr(xml, "infNFe", "Id")?.replace(/^NFe/, "") ?? "";
  const tpAmb = extractXmlTagValue(xml, "tpAmb") ?? "";
  const dhEmi = extractXmlTagValue(xml, "dhEmi") ?? "";
  const tpEmis = parseInt(extractXmlTagValue(xml, "tpEmis") ?? "1");
  const vNF = extractXmlTagValue(xml, "vNF") ?? "0.00";
  const vICMS = extractXmlTagValue(xml, "vICMS") ?? "0.00";
  const digestValue = extractXmlTagValue(xml, "DigestValue") ?? "";

  // Determine destination document
  const destBlock = xml.match(/<dest>([\s\S]*?)<\/dest>/)?.[1] ?? "";
  const cDest = extractFirstValue(destBlock, ["CNPJ", "CPF", "idEstrangeiro"]) ?? "";

  // Build QR Code URL
  const qrcode = await buildNfceQrCodeUrl({
    accessKey: chNFe,
    version: (parseInt(ver) === 100 || parseInt(ver) === 200) ? 200 : 300,
    environment: parseInt(tpAmb) as SefazEnvironment,
    emissionType: tpEmis as EmissionType,
    qrCodeBaseUrl: urlqr,
    cscToken: token,
    cscId: tokenId,
    issuedAt: dhEmi,
    totalValue: vNF,
    totalIcms: vICMS,
    digestValue: digestValue,
    destDocument: cDest,
  });

  // Build infNFeSupl element
  const infNFeSupl = `<infNFeSupl><qrCode>${qrcode}</qrCode><urlChave>${urichave}</urlChave></infNFeSupl>`;

  // Insert before <Signature
  const result = xml.replace(
    /(<Signature\s)/,
    `${infNFeSupl}<Signature `
  );

  return result;
}

// extractXmlTagValue imported from ./xml-utils

/** Extract an attribute value from an XML element */
function extractXmlTagAttr(xml: string, tagName: string, attrName: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]*)"`, "s"));
  return match?.[1];
}

/** Extract first matching tag value from a list of possible tag names */
function extractFirstValue(xml: string, tagNames: string[]): string | undefined {
  for (const tag of tagNames) {
    const val = extractXmlTagValue(xml, tag);
    if (val) return val;
  }
  return undefined;
}
