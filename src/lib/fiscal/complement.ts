import { XMLParser } from "fast-xml-parser";
import { NFE_NAMESPACE, NFE_VERSION } from "./constants";

// ── XML Parser (reusable, configured for NFe) ──────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  parseTagValue: false,
  trimValues: false,
});

// ── Attach Protocol (NFe authorization) ─────────────────────────────────────

/**
 * Attach the SEFAZ authorization protocol to a signed NFe XML,
 * producing the `nfeProc` wrapper required for storage and DANFE.
 *
 * Output format:
 * ```xml
 * <nfeProc xmlns="..." versao="4.00">
 *   <NFe>...</NFe>
 *   <protNFe>...</protNFe>
 * </nfeProc>
 * ```
 *
 * @param requestXml  Signed NFe XML (contains `<NFe>`)
 * @param responseXml SEFAZ response XML (contains `<protNFe>`)
 * @returns The `nfeProc` XML string
 */
export function attachProtocol(
  requestXml: string,
  responseXml: string
): string {
  if (!requestXml) {
    throw new Error("Request XML (NFe) is empty");
  }
  if (!responseXml) {
    throw new Error("Response XML (protocol) is empty");
  }

  const nfeContent = extractTag(requestXml, "NFe");
  if (!nfeContent) {
    throw new Error("Could not find <NFe> tag in request XML");
  }

  // Find the matching protNFe — verify digest and access key match
  const parsedReq = xmlParser.parse(requestXml);
  const infNFe = deepGet(parsedReq, "NFe", "infNFe");
  const nfeId: string = infNFe?.["@_Id"] ?? "";
  const accessKey = nfeId.replace(/^NFe/, "");
  const digestNFe = deepGet(parsedReq, "NFe", "Signature", "SignedInfo", "Reference", "DigestValue");

  const parsedRes = xmlParser.parse(responseXml);

  // Response may contain multiple protNFe (batch) or a single one
  const protNFeNodes = findAllProtNFe(parsedRes);
  let matchedProtXml: string | null = null;

  for (const prot of protNFeNodes) {
    const infProt = prot?.infProt;
    if (!infProt) continue;

    const cStat = String(infProt.cStat);
    const chNFe = String(infProt.chNFe ?? "");
    const digVal = infProt.digVal;

    if (digVal && digVal === digestNFe && chNFe === accessKey) {
      const validStatuses = ["100", "150", "110", "205", "301", "302", "303"];
      if (!validStatuses.includes(cStat)) {
        const xMotivo = infProt.xMotivo ?? "";
        throw new Error(`NFe rejected by SEFAZ: [${cStat}] ${xMotivo}`);
      }
      matchedProtXml = extractProtNFeByKey(responseXml, chNFe);
      break;
    }
  }

  if (!matchedProtXml) {
    // Try single protNFe without digest match (some responses omit digVal)
    const singleProt = extractTag(responseXml, "protNFe");
    if (!singleProt) {
      throw new Error("Could not find matching <protNFe> in response XML");
    }

    const parsedProt = xmlParser.parse(singleProt);
    const infProt = deepGet(parsedProt, "protNFe", "infProt") ?? parsedProt?.infProt;
    if (infProt) {
      const cStat = String(infProt.cStat);
      const xMotivo = infProt.xMotivo ?? "";
      const validStatuses = ["100", "150", "110", "205", "301", "302", "303"];
      if (!validStatuses.includes(cStat)) {
        throw new Error(`NFe rejected by SEFAZ: [${cStat}] ${xMotivo}`);
      }
    }
    matchedProtXml = singleProt;
  }

  return joinXml(nfeContent, matchedProtXml, "nfeProc", NFE_VERSION);
}

// ── Attach Cancellation ─────────────────────────────────────────────────────

/**
 * Attach a cancellation event response to an authorized nfeProc XML.
 *
 * Appends the `<retEvento>` node from the cancellation response
 * inside the `<nfeProc>` wrapper. This marks the NFe as cancelled.
 *
 * @param nfeProcXml      The authorized nfeProc XML
 * @param cancelResponseXml The SEFAZ cancellation event response
 * @returns Modified nfeProc XML with retEvento appended
 */
export function attachCancellation(
  nfeProcXml: string,
  cancelResponseXml: string
): string {
  if (!nfeProcXml) {
    throw new Error("nfeProc XML is empty");
  }
  if (!cancelResponseXml) {
    throw new Error("Cancellation response XML is empty");
  }

  // Extract the access key from the authorized nfeProc
  const parsedProc = xmlParser.parse(nfeProcXml);
  const protNFe = deepGet(parsedProc, "nfeProc", "protNFe");
  if (!protNFe) {
    throw new Error("Could not find <protNFe> in nfeProc XML — is the NFe authorized?");
  }
  const chaveNFe = String(protNFe.infProt?.chNFe ?? "");

  // Parse the cancellation response to find the matching retEvento
  const parsedCancel = xmlParser.parse(cancelResponseXml);
  const retEventos = findAllNodes(parsedCancel, "retEvento");

  const cancelEventTypes = ["110111", "110112"]; // EVT_CANCELA, EVT_CANCELASUBSTITUICAO
  const validStatuses = ["135", "136", "155"];

  let matchedRetEvento: string | null = null;

  for (const retEvento of retEventos) {
    const infEvento = retEvento?.infEvento;
    if (!infEvento) continue;

    const cStat = String(infEvento.cStat);
    const chNFe = String(infEvento.chNFe ?? "");
    const tpEvento = String(infEvento.tpEvento ?? "");

    if (
      validStatuses.includes(cStat) &&
      cancelEventTypes.includes(tpEvento) &&
      chNFe === chaveNFe
    ) {
      matchedRetEvento = extractRetEventoByKey(cancelResponseXml, chaveNFe);
      break;
    }
  }

  if (!matchedRetEvento) {
    // No matching cancellation event found — return original
    return nfeProcXml;
  }

  // Insert the retEvento before the closing </nfeProc> tag
  const closingTag = "</nfeProc>";
  const insertPos = nfeProcXml.lastIndexOf(closingTag);
  if (insertPos === -1) {
    throw new Error("Could not find closing </nfeProc> tag");
  }

  return (
    nfeProcXml.slice(0, insertPos) +
    matchedRetEvento +
    nfeProcXml.slice(insertPos)
  );
}

// ── Attach Inutilizacao ─────────────────────────────────────────────────────

/**
 * Attach the SEFAZ inutilizacao response to the request,
 * producing the `procInutNFe` wrapper.
 *
 * Output format:
 * ```xml
 * <ProcInutNFe xmlns="..." versao="4.00">
 *   <inutNFe>...</inutNFe>
 *   <retInutNFe>...</retInutNFe>
 * </ProcInutNFe>
 * ```
 *
 * @param requestXml  The inutNFe request XML
 * @param responseXml The SEFAZ retInutNFe response XML
 * @returns The `ProcInutNFe` XML string
 */
export function attachInutilizacao(
  requestXml: string,
  responseXml: string
): string {
  if (!requestXml) {
    throw new Error("Inutilizacao request XML is empty");
  }
  if (!responseXml) {
    throw new Error("Inutilizacao response XML is empty");
  }

  const inutContent = extractTag(requestXml, "inutNFe");
  if (!inutContent) {
    throw new Error("Could not find <inutNFe> tag in request XML");
  }

  const retInutContent = extractTag(responseXml, "retInutNFe");
  if (!retInutContent) {
    throw new Error("Could not find <retInutNFe> tag in response XML");
  }

  // Validate the response status
  const parsedRes = xmlParser.parse(responseXml);
  const retInfInut =
    deepGet(parsedRes, "retInutNFe", "infInut") ??
    deepGet(parsedRes, "nfeInutilizacaoNF", "retInutNFe", "infInut");

  if (retInfInut) {
    const cStat = String(retInfInut.cStat);
    if (cStat !== "102") {
      const xMotivo = retInfInut.xMotivo ?? "";
      throw new Error(`Inutilizacao rejected by SEFAZ: [${cStat}] ${xMotivo}`);
    }
  }

  // Get version from request
  const parsedReq = xmlParser.parse(requestXml);
  const inutNFe = parsedReq?.inutNFe;
  const versao = inutNFe?.["@_versao"] ?? NFE_VERSION;

  return joinXml(inutContent, retInutContent, "ProcInutNFe", versao);
}

// ── Attach Event Protocol (generic) ─────────────────────────────────────────

/**
 * Attach an event protocol response to the event request,
 * producing the `procEventoNFe` wrapper.
 *
 * @param requestXml  The envEvento request XML (contains `<evento>`)
 * @param responseXml The SEFAZ retEnvEvento response XML (contains `<retEvento>`)
 * @returns The `procEventoNFe` XML string
 */
export function attachEventProtocol(
  requestXml: string,
  responseXml: string
): string {
  if (!requestXml) {
    throw new Error("Event request XML is empty");
  }
  if (!responseXml) {
    throw new Error("Event response XML is empty");
  }

  const eventoContent = extractTag(requestXml, "evento");
  if (!eventoContent) {
    throw new Error("Could not find <evento> tag in request XML");
  }

  const retEventoContent = extractTag(responseXml, "retEvento");
  if (!retEventoContent) {
    throw new Error("Could not find <retEvento> tag in response XML");
  }

  // Get version from the evento tag
  const parsedReq = xmlParser.parse(requestXml);
  const evento =
    deepGet(parsedReq, "envEvento", "evento") ?? parsedReq?.evento;
  const versao = evento?.["@_versao"] ?? NFE_VERSION;

  // Validate status
  const parsedRes = xmlParser.parse(responseXml);
  const retEvento =
    deepGet(parsedRes, "retEnvEvento", "retEvento") ?? parsedRes?.retEvento;
  const infEvento = retEvento?.infEvento;
  if (infEvento) {
    const cStat = String(infEvento.cStat);
    const validStatuses = ["135", "136", "155"];
    if (!validStatuses.includes(cStat)) {
      const xMotivo = infEvento.xMotivo ?? "";
      throw new Error(`Event rejected by SEFAZ: [${cStat}] ${xMotivo}`);
    }
  }

  return joinXml(eventoContent, retEventoContent, "procEventoNFe", versao);
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Join two XML fragments into a wrapper element with namespace and version.
 */
function joinXml(
  first: string,
  second: string,
  nodeName: string,
  versao: string
): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<${nodeName} versao="${versao}" xmlns="${NFE_NAMESPACE}">` +
    first +
    second +
    `</${nodeName}>`
  );
}

/**
 * Extract a complete XML tag (including its content) by tag name.
 * Returns the outermost match, preserving nested content and attributes.
 */
function extractTag(xml: string, tagName: string): string | null {
  // Handle self-closing and regular tags
  const openPattern = new RegExp(`<${tagName}[\\s>/]`);
  const match = openPattern.exec(xml);
  if (!match) return null;

  const start = match.index;
  const closeTag = `</${tagName}>`;
  const closeIndex = xml.lastIndexOf(closeTag);
  if (closeIndex === -1) return null;

  return xml.slice(start, closeIndex + closeTag.length);
}

/**
 * Extract the <protNFe> node whose <chNFe> matches the given access key.
 */
function extractProtNFeByKey(xml: string, accessKey: string): string | null {
  const regex = /<protNFe[\s\S]*?<\/protNFe>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    if (match[0].includes(`<chNFe>${accessKey}</chNFe>`)) {
      return match[0];
    }
  }
  return null;
}

/**
 * Extract the <retEvento> node whose <chNFe> matches the given access key.
 */
function extractRetEventoByKey(
  xml: string,
  accessKey: string
): string | null {
  const regex = /<retEvento[\s\S]*?<\/retEvento>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    if (match[0].includes(`<chNFe>${accessKey}</chNFe>`)) {
      return match[0];
    }
  }
  return null;
}

/**
 * Deeply navigate a parsed XML object by key path.
 */
function deepGet(obj: unknown, ...keys: string[]): any {
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Find all protNFe nodes from a parsed response (handles both single and array).
 */
function findAllProtNFe(parsed: Record<string, unknown>): any[] {
  return findAllNodes(parsed, "protNFe");
}

/**
 * Find all nodes with a given tag name in a parsed XML tree.
 * Handles cases where a tag appears as a direct child, nested in a wrapper,
 * or as an array.
 */
function findAllNodes(
  obj: unknown,
  tagName: string
): any[] {
  if (obj == null || typeof obj !== "object") return [];

  const results: Record<string, unknown>[] = [];
  const record = obj as Record<string, unknown>;

  if (tagName in record) {
    const value = record[tagName];
    if (Array.isArray(value)) {
      results.push(...(value as Record<string, unknown>[]));
    } else if (typeof value === "object" && value !== null) {
      results.push(value as Record<string, unknown>);
    }
  }

  // Recurse into child objects (but not arrays to avoid duplication)
  for (const key of Object.keys(record)) {
    if (key === tagName) continue;
    const child = record[key];
    if (child != null && typeof child === "object" && !Array.isArray(child)) {
      results.push(...findAllNodes(child, tagName));
    }
  }

  return results;
}
