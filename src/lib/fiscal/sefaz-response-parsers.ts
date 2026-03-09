import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

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

// ── Private helpers ─────────────────────────────────────────────────────────

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
