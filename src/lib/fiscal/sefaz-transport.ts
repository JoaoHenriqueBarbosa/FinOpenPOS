import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SOAP_ENVELOPE_NS, NFE_WSDL_NS } from "./constants";
import type { SefazService } from "./types";

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
