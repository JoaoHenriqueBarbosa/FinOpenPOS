import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { SOAP_ENVELOPE_NS, NFE_WSDL_NS } from "./constants";
import type { SefazService } from "./types";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

interface SefazRequestOptions {
  /** Full URL of the SEFAZ web service endpoint */
  url: string;
  /** SOAP action / service name */
  service: SefazService;
  /** XML content to send inside the SOAP body */
  xmlContent: string;
  /** PFX certificate buffer for mTLS */
  pfx: Buffer;
  /** PFX password */
  passphrase: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

interface SefazRawResponse {
  /** HTTP status code */
  httpStatus: number;
  /** Raw XML response body */
  body: string;
  /** Extracted content from SOAP envelope */
  content: string;
}

/**
 * Send a SOAP 1.2 request to a SEFAZ web service with mutual TLS (client certificate).
 *
 * Uses curl with PEM cert/key extracted from PFX, because Bun's node:https
 * does not fully support mTLS with PFX (ECONNREFUSED on Agent with pfx option).
 */
export async function sefazRequest(options: SefazRequestOptions): Promise<SefazRawResponse> {
  const { url, service, xmlContent, pfx, passphrase, timeout = 30000 } = options;

  const soapEnvelope = buildSoapEnvelope(service, xmlContent);

  // Extract PEM cert/key from PFX for curl
  const tmpDir = os.tmpdir();
  const tmpPfx = path.join(tmpDir, `_sefaz_${Date.now()}.pfx`);
  const tmpCert = path.join(tmpDir, `_sefaz_${Date.now()}.cert.pem`);
  const tmpKey = path.join(tmpDir, `_sefaz_${Date.now()}.key.pem`);
  const tmpBody = path.join(tmpDir, `_sefaz_${Date.now()}.xml`);

  try {
    fs.writeFileSync(tmpPfx, pfx);
    fs.writeFileSync(tmpBody, soapEnvelope);

    // Extract cert and key from PFX
    execSync(
      `openssl pkcs12 -in ${tmpPfx} -clcerts -nokeys -passin pass:${passphrase} -legacy 2>/dev/null > ${tmpCert}`
    );
    execSync(
      `openssl pkcs12 -in ${tmpPfx} -nocerts -nodes -passin pass:${passphrase} -legacy 2>/dev/null > ${tmpKey}`
    );

    const timeoutSecs = Math.ceil(timeout / 1000);
    const result = execSync(
      `curl -s -k --cert ${tmpCert} --key ${tmpKey} ` +
      `-H "Content-Type: application/soap+xml; charset=utf-8" ` +
      `-d @${tmpBody} ` +
      `--max-time ${timeoutSecs} ` +
      `-w "\\n__HTTP_STATUS__%{http_code}" ` +
      `"${url}"`,
      { encoding: "utf-8", timeout: timeout + 5000 }
    );

    // Parse HTTP status from curl output
    const statusMatch = result.match(/__HTTP_STATUS__(\d+)$/);
    const httpStatus = statusMatch ? parseInt(statusMatch[1]) : 0;
    const body = result.replace(/__HTTP_STATUS__\d+$/, "").trim();
    const content = extractSoapContent(body);

    return { httpStatus, body, content };
  } catch (err: any) {
    if (err.message?.includes("ETIMEDOUT") || err.killed) {
      throw new Error(`SEFAZ request timed out after ${timeout}ms`);
    }
    throw new Error(`SEFAZ request failed: ${err.message}`);
  } finally {
    for (const f of [tmpPfx, tmpCert, tmpKey, tmpBody]) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

/**
 * Check SEFAZ service status (NfeStatusServico).
 */
export function parseStatusResponse(xml: string): {
  statusCode: number;
  statusMessage: string;
  averageTime?: number;
} {
  const parsed = xmlParser.parse(xml);
  const ret = findNested(parsed, "retConsStatServ") || parsed;

  return {
    statusCode: parseInt(String(ret.cStat ?? "0")),
    statusMessage: String(ret.xMotivo ?? "Unknown"),
    averageTime: ret.tMed ? parseInt(String(ret.tMed)) : undefined,
  };
}

/**
 * Parse authorization response (NfeAutorizacao / NfeRetAutorizacao).
 */
export function parseAuthorizationResponse(xml: string): {
  statusCode: number;
  statusMessage: string;
  protocolNumber?: string;
  protocolXml?: string;
  authorizedAt?: string;
} {
  const parsed = xmlParser.parse(xml);
  const ret = findNested(parsed, "retEnviNFe") || parsed;

  // Look for protocol inside protNFe > infProt
  const protNFe = findNested(ret, "protNFe");
  if (protNFe) {
    const infProt = protNFe.infProt || protNFe;
    // Extract the raw protNFe XML for storage
    const protNFeMatch = xml.match(/<protNFe[^>]*>[\s\S]*?<\/protNFe>/);

    return {
      statusCode: parseInt(String(infProt.cStat ?? "0")),
      statusMessage: String(infProt.xMotivo ?? ""),
      protocolNumber: infProt.nProt ? String(infProt.nProt) : undefined,
      protocolXml: protNFeMatch?.[0],
      authorizedAt: infProt.dhRecbto ? String(infProt.dhRecbto) : undefined,
    };
  }

  return {
    statusCode: parseInt(String(ret.cStat ?? "0")),
    statusMessage: String(ret.xMotivo ?? "Unknown"),
  };
}

/**
 * Parse cancellation event response.
 */
export function parseCancellationResponse(xml: string): {
  statusCode: number;
  statusMessage: string;
  protocolNumber?: string;
} {
  const parsed = xmlParser.parse(xml);
  const retEvento = findNested(parsed, "retEvento");
  const infEvento = retEvento ? (retEvento.infEvento || retEvento) : parsed;

  return {
    statusCode: parseInt(String(infEvento.cStat ?? "0")),
    statusMessage: String(infEvento.xMotivo ?? "Unknown"),
    protocolNumber: infEvento.nProt ? String(infEvento.nProt) : undefined,
  };
}

/**
 * Build the status service request XML.
 */
export function buildStatusRequestXml(
  stateCode: string,
  environment: 1 | 2
): string {
  const { STATE_CODES } = require("./constants");
  const cUF = STATE_CODES[stateCode];

  return [
    `<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
    `<tpAmb>${environment}</tpAmb>`,
    `<cUF>${cUF}</cUF>`,
    `<xServ>STATUS</xServ>`,
    `</consStatServ>`,
  ].join("");
}

/**
 * Build the authorization request XML (envelope for sending an NF-e).
 */
export function buildAuthorizationRequestXml(
  signedNfeXml: string,
  environment: 1 | 2,
  stateCode: string
): string {
  const { STATE_CODES } = require("./constants");
  const cUF = STATE_CODES[stateCode];

  // Remove XML declaration from signed NF-e (it goes inside SOAP)
  const nfeContent = signedNfeXml.replace(/<\?xml[^?]*\?>\s*/g, "");

  return [
    `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
    `<idLote>${Date.now()}</idLote>`,
    `<indSinc>1</indSinc>`,
    nfeContent,
    `</enviNFe>`,
  ].join("");
}

/**
 * Build cancellation event XML.
 */
export function buildCancellationXml(
  accessKey: string,
  protocolNumber: string,
  reason: string,
  taxId: string,
  environment: 1 | 2
): string {
  const eventId = `ID110111${accessKey}01`;
  const now = new Date().toISOString();

  return [
    `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
    `<idLote>${Date.now()}</idLote>`,
    `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
    `<infEvento Id="${eventId}">`,
    `<cOrgao>91</cOrgao>`,
    `<tpAmb>${environment}</tpAmb>`,
    `<CNPJ>${taxId}</CNPJ>`,
    `<chNFe>${accessKey}</chNFe>`,
    `<dhEvento>${now}</dhEvento>`,
    `<tpEvento>110111</tpEvento>`,
    `<nSeqEvento>1</nSeqEvento>`,
    `<verEvento>1.00</verEvento>`,
    `<detEvento versao="1.00">`,
    `<descEvento>Cancelamento</descEvento>`,
    `<nProt>${protocolNumber}</nProt>`,
    `<xJust>${reason}</xJust>`,
    `</detEvento>`,
    `</infEvento>`,
    `</evento>`,
    `</envEvento>`,
  ].join("");
}

/**
 * Build number voiding (inutilizacao) request XML.
 */
export function buildVoidingXml(
  stateCode: string,
  environment: 1 | 2,
  taxId: string,
  model: 55 | 65,
  series: number,
  startNumber: number,
  endNumber: number,
  reason: string,
  year: number
): string {
  const { STATE_CODES } = require("./constants");
  const cUF = STATE_CODES[stateCode];
  const yy = String(year).slice(2);

  const id = `ID${cUF}${yy}${taxId}${String(model).padStart(2, "0")}${String(series).padStart(3, "0")}${String(startNumber).padStart(9, "0")}${String(endNumber).padStart(9, "0")}`;

  return [
    `<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
    `<infInut Id="${id}">`,
    `<tpAmb>${environment}</tpAmb>`,
    `<xServ>INUTILIZAR</xServ>`,
    `<cUF>${cUF}</cUF>`,
    `<ano>${yy}</ano>`,
    `<CNPJ>${taxId}</CNPJ>`,
    `<mod>${model}</mod>`,
    `<serie>${series}</serie>`,
    `<nNFIni>${startNumber}</nNFIni>`,
    `<nNFFin>${endNumber}</nNFFin>`,
    `<xJust>${reason}</xJust>`,
    `</infInut>`,
    `</inutNFe>`,
  ].join("");
}

// ── Private helpers ─────────────────────────────────────────────────────────

/**
 * Build SOAP 1.2 envelope wrapping the NF-e request content.
 */
function buildSoapEnvelope(service: SefazService, xmlContent: string): string {
  const wsdlAction = `${NFE_WSDL_NS}/${service}`;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<soap12:Envelope xmlns:soap12="${SOAP_ENVELOPE_NS}">`,
    `<soap12:Header/>`,
    `<soap12:Body>`,
    `<nfeDadosMsg xmlns="${wsdlAction}">`,
    xmlContent,
    `</nfeDadosMsg>`,
    `</soap12:Body>`,
    `</soap12:Envelope>`,
  ].join("");
}

/**
 * Extract the meaningful content from a SOAP response envelope.
 * Looks for <nfeResultMsg> or falls back to <soap:Body> content.
 */
function extractSoapContent(soapXml: string): string {
  // Try <nfeResultMsg>
  const resultMatch = soapXml.match(/<nfeResultMsg[^>]*>([\s\S]*?)<\/nfeResultMsg>/);
  if (resultMatch) return resultMatch[1];

  // Try generic Body content
  const bodyMatch = soapXml.match(/<[^:]*:Body[^>]*>([\s\S]*?)<\/[^:]*:Body>/);
  if (bodyMatch) return bodyMatch[1];

  return soapXml;
}

/**
 * Recursively find a nested key in a parsed XML object.
 */
function findNested(obj: any, key: string): any {
  if (!obj || typeof obj !== "object") return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) {
    const found = findNested(v, key);
    if (found !== undefined) return found;
  }
  return undefined;
}
