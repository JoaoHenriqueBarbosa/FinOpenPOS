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
  if (!accessKey) throw new Error("Access key is required for cancellation");
  if (!reason) throw new Error("Cancellation reason (xJust) is required");
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

/**
 * Build receipt query request XML (consReciNFe).
 */
export function buildReceiptQueryXml(
  receiptNumber: string,
  environment: 1 | 2
): string {
  if (!receiptNumber) {
    throw new Error("Receipt number (recibo) is required");
  }
  return [
    `<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
    `<tpAmb>${environment}</tpAmb>`,
    `<nRec>${receiptNumber}</nRec>`,
    `</consReciNFe>`,
  ].join("");
}

/**
 * Build access key query request XML (consSitNFe).
 */
export function buildAccessKeyQueryXml(
  accessKey: string,
  environment: 1 | 2
): string {
  if (!accessKey) {
    throw new Error("Access key (chave) is required");
  }
  if (accessKey.length !== 44) {
    throw new Error(`Invalid access key "${accessKey}": must be 44 digits`);
  }
  if (!/^\d+$/.test(accessKey)) {
    throw new Error(`Invalid access key "${accessKey}": must be numeric`);
  }
  return [
    `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
    `<tpAmb>${environment}</tpAmb>`,
    `<xServ>CONSULTAR</xServ>`,
    `<chNFe>${accessKey}</chNFe>`,
    `</consSitNFe>`,
  ].join("");
}

/**
 * Build batch submission request XML (enviNFe).
 */
export function buildBatchSubmissionXml(
  xmlDocuments: string[],
  lotId: string,
  syncMode: 0 | 1 = 0,
  compress: boolean = false
): string {
  if (!Array.isArray(xmlDocuments)) {
    throw new TypeError("xmlDocuments must be an array");
  }
  if (syncMode === 1 && xmlDocuments.length > 1) {
    throw new Error(
      "Synchronous mode must be used to send a single document at a time. " +
      "You are trying to send multiple."
    );
  }
  const cleaned = xmlDocuments.map((xml) =>
    xml.replace(/<\?xml[^?]*\?>\s*/g, "").trim()
  );
  const joined = cleaned.join("");
  const request = [
    `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
    `<idLote>${lotId}</idLote>`,
    `<indSinc>${syncMode}</indSinc>`,
    joined,
    `</enviNFe>`,
  ].join("");

  if (compress) {
    // Return the raw request XML (compression is handled at transport layer)
    return request;
  }
  return request;
}

/**
 * Build cadastro query request XML (ConsCad).
 */
export function buildCadastroQueryXml(
  stateCode: string,
  cnpj: string = "",
  ie: string = "",
  cpf: string = ""
): string {
  let filter = "";
  if (cnpj) {
    filter = `<CNPJ>${cnpj}</CNPJ>`;
  } else if (ie) {
    filter = `<IE>${ie}</IE>`;
  } else if (cpf) {
    filter = `<CPF>${cpf}</CPF>`;
  }
  if (!stateCode || !filter) {
    throw new Error("State code and at least one of CNPJ/IE/CPF are required");
  }
  return [
    `<ConsCad xmlns="http://www.portalfiscal.inf.br/nfe" versao="2.00">`,
    `<infCons>`,
    `<xServ>CONS-CAD</xServ>`,
    `<UF>${stateCode}</UF>`,
    filter,
    `</infCons>`,
    `</ConsCad>`,
  ].join("");
}

/**
 * Build DFe distribution query XML (distDFeInt).
 */
export function buildDistDFeQueryXml(
  environment: 1 | 2,
  stateCode: string,
  taxId: string,
  lastNSU: number = 0,
  specificNSU: number = 0,
  accessKey?: string,
  isCpf: boolean = false
): string {
  const { STATE_CODES } = require("./constants");
  const cUF = STATE_CODES[stateCode];

  let queryTag: string;
  if (accessKey) {
    queryTag = `<consChNFe><chNFe>${accessKey}</chNFe></consChNFe>`;
  } else if (specificNSU > 0) {
    const paddedNSU = String(specificNSU).padStart(15, "0");
    queryTag = `<consNSU><NSU>${paddedNSU}</NSU></consNSU>`;
  } else {
    const paddedNSU = String(lastNSU).padStart(15, "0");
    queryTag = `<distNSU><ultNSU>${paddedNSU}</ultNSU></distNSU>`;
  }

  const taxIdTag = isCpf ? `<CPF>${taxId}</CPF>` : `<CNPJ>${taxId}</CNPJ>`;

  return [
    `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">`,
    `<tpAmb>${environment}</tpAmb>`,
    `<cUFAutor>${cUF}</cUFAutor>`,
    taxIdTag,
    queryTag,
    `</distDFeInt>`,
  ].join("");
}

/** Event type constants matching PHP sped-nfe */
export const EVENT_TYPES = {
  CCE: 110110,
  CANCELLATION: 110111,
  CANCELLATION_BY_SUBSTITUTION: 110112,
  EPEC: 110140,
  INTERESTED_ACTOR: 110150,
  DELIVERY_PROOF: 110130,
  DELIVERY_PROOF_CANCELLATION: 110131,
  EXTENSION_REQUEST_1: 111500,
  EXTENSION_REQUEST_2: 111501,
  EXTENSION_CANCELLATION_1: 111502,
  EXTENSION_CANCELLATION_2: 111503,
  DELIVERY_FAILURE: 110192,
  DELIVERY_FAILURE_CANCELLATION: 110193,
  CONFIRMATION: 210200,
  AWARENESS: 210210,
  UNKNOWN_OPERATION: 210220,
  OPERATION_NOT_PERFORMED: 210240,
} as const;

/** Map event type to its description */
export function getEventDescription(eventType: number): string {
  const descriptions: Record<number, string> = {
    [EVENT_TYPES.CCE]: "Carta de Correcao",
    [EVENT_TYPES.CANCELLATION]: "Cancelamento",
    [EVENT_TYPES.CANCELLATION_BY_SUBSTITUTION]: "Cancelamento por substituicao",
    [EVENT_TYPES.EPEC]: "EPEC",
    [EVENT_TYPES.INTERESTED_ACTOR]: "Ator interessado na NF-e",
    [EVENT_TYPES.DELIVERY_PROOF]: "Comprovante de Entrega da NF-e",
    [EVENT_TYPES.DELIVERY_PROOF_CANCELLATION]: "Cancelamento Comprovante de Entrega da NF-e",
    [EVENT_TYPES.EXTENSION_REQUEST_1]: "Pedido de Prorrogacao",
    [EVENT_TYPES.EXTENSION_REQUEST_2]: "Pedido de Prorrogacao",
    [EVENT_TYPES.EXTENSION_CANCELLATION_1]: "Cancelamento de Pedido de Prorrogacao",
    [EVENT_TYPES.EXTENSION_CANCELLATION_2]: "Cancelamento de Pedido de Prorrogacao",
    [EVENT_TYPES.CONFIRMATION]: "Confirmacao da Operacao",
    [EVENT_TYPES.AWARENESS]: "Ciencia da Operacao",
    [EVENT_TYPES.UNKNOWN_OPERATION]: "Desconhecimento da Operacao",
    [EVENT_TYPES.OPERATION_NOT_PERFORMED]: "Operacao nao Realizada",
    [EVENT_TYPES.DELIVERY_FAILURE]: "Insucesso na Entrega da NF-e",
    [EVENT_TYPES.DELIVERY_FAILURE_CANCELLATION]: "Cancelamento Insucesso na Entrega da NF-e",
  };
  return descriptions[eventType] ?? "";
}

/**
 * Build a generic SEFAZ event XML (evento inside envEvento).
 * This produces the unsigned inner evento XML. Signing is done separately.
 */
export function buildEventXml(options: {
  accessKey: string;
  eventType: number;
  sequenceNumber: number;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  additionalTags?: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    eventType,
    sequenceNumber,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags = "",
    lotId,
    isCpf = false,
  } = options;

  const seqPadded = String(sequenceNumber).padStart(2, "0");
  const eventId = `ID${eventType}${accessKey}${seqPadded}`;
  const descEvento = getEventDescription(eventType);
  const taxIdTag = isCpf ? `<CPF>${taxId}</CPF>` : `<CNPJ>${taxId}</CNPJ>`;
  const lot = lotId ?? String(Date.now());

  return [
    `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
    `<idLote>${lot}</idLote>`,
    `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
    `<infEvento Id="${eventId}">`,
    `<cOrgao>${orgCode}</cOrgao>`,
    `<tpAmb>${environment}</tpAmb>`,
    taxIdTag,
    `<chNFe>${accessKey}</chNFe>`,
    `<dhEvento>${eventDateTime}</dhEvento>`,
    `<tpEvento>${eventType}</tpEvento>`,
    `<nSeqEvento>${sequenceNumber}</nSeqEvento>`,
    `<verEvento>1.00</verEvento>`,
    `<detEvento versao="1.00">`,
    `<descEvento>${descEvento}</descEvento>`,
    additionalTags,
    `</detEvento>`,
    `</infEvento>`,
    `</evento>`,
    `</envEvento>`,
  ].join("");
}

/**
 * Build Carta de Correcao (CCe) event XML.
 */
export function buildCCeXml(options: {
  accessKey: string;
  correction: string;
  sequenceNumber?: number;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  if (!options.accessKey) throw new Error("Access key is required for CCe");
  if (!options.correction) throw new Error("Correction text (xCorrecao) is required for CCe");
  const {
    accessKey,
    correction,
    sequenceNumber = 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const xCondUso =
    "A Carta de Correcao e disciplinada pelo paragrafo " +
    "1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 " +
    "e pode ser utilizada para regularizacao de erro ocorrido " +
    "na emissao de documento fiscal, desde que o erro nao esteja " +
    "relacionado com: I - as variaveis que determinam o valor " +
    "do imposto tais como: base de calculo, aliquota, " +
    "diferenca de preco, quantidade, valor da operacao ou da " +
    "prestacao; II - a correcao de dados cadastrais que implique " +
    "mudanca do remetente ou do destinatario; III - a data de " +
    "emissao ou de saida.";

  const additionalTags =
    `<xCorrecao>${correction}</xCorrecao>` +
    `<xCondUso>${xCondUso}</xCondUso>`;

  return buildEventXml({
    accessKey,
    eventType: EVENT_TYPES.CCE,
    sequenceNumber,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build Ator Interessado event XML.
 */
export function buildInterestedActorXml(options: {
  accessKey: string;
  authorType: number;
  appVersion: string;
  actorTaxId: string;
  actorIsCpf?: boolean;
  authorizationType: number;
  sequenceNumber?: number;
  taxId: string;
  stateCode: string;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    authorType,
    appVersion,
    actorTaxId,
    actorIsCpf = false,
    authorizationType,
    sequenceNumber = 1,
    taxId,
    stateCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const { STATE_CODES } = require("./constants");
  const cUF = STATE_CODES[stateCode];

  const xCondUso =
    "O emitente ou destinatário da NF-e, declara que permite o " +
    "transportador declarado no campo CNPJ/CPF deste evento a " +
    "autorizar os transportadores subcontratados ou redespachados a " +
    "terem acesso ao download da NF-e";

  const actorTag = actorIsCpf
    ? `<CPF>${actorTaxId}</CPF>`
    : `<CNPJ>${actorTaxId}</CNPJ>`;

  let additionalTags =
    `<cOrgaoAutor>${cUF}</cOrgaoAutor>` +
    `<tpAutor>${authorType}</tpAutor>` +
    `<verAplic>${appVersion}</verAplic>` +
    `<autXML>${actorTag}</autXML>` +
    `<tpAutorizacao>${authorizationType}</tpAutorizacao>`;

  if (authorizationType === 1) {
    additionalTags += `<xCondUso>${xCondUso}</xCondUso>`;
  }

  return buildEventXml({
    accessKey,
    eventType: EVENT_TYPES.INTERESTED_ACTOR,
    sequenceNumber,
    taxId,
    orgCode: "91",
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build EPP (extension request) event XML.
 */
export function buildExtensionRequestXml(options: {
  accessKey: string;
  protocolNumber: string;
  items: Array<[number, number]>;
  extensionType?: 1 | 2;
  sequenceNumber?: number;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    protocolNumber,
    items,
    extensionType = 1,
    sequenceNumber = 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const eventType =
    extensionType === 1
      ? EVENT_TYPES.EXTENSION_REQUEST_1
      : EVENT_TYPES.EXTENSION_REQUEST_2;

  let additionalTags = `<nProt>${protocolNumber}</nProt>`;
  for (const [numItem, qty] of items) {
    additionalTags += `<itemPedido numItem="${numItem}"><qtdeItem>${qty}</qtdeItem></itemPedido>`;
  }

  return buildEventXml({
    accessKey,
    eventType,
    sequenceNumber,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build ECPP (cancel extension request) event XML.
 */
export function buildExtensionCancellationXml(options: {
  accessKey: string;
  protocolNumber: string;
  extensionType: 1 | 2;
  sequenceNumber?: number;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    protocolNumber,
    extensionType,
    sequenceNumber = 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const eventType =
    extensionType === 1
      ? EVENT_TYPES.EXTENSION_CANCELLATION_1
      : EVENT_TYPES.EXTENSION_CANCELLATION_2;
  const origEvent =
    extensionType === 1
      ? EVENT_TYPES.EXTENSION_REQUEST_1
      : EVENT_TYPES.EXTENSION_REQUEST_2;

  const seqPadded = String(sequenceNumber).padStart(2, "0");
  const idPedidoCancelado = `ID${origEvent}${accessKey}${seqPadded}`;

  const additionalTags =
    `<idPedidoCancelado>${idPedidoCancelado}</idPedidoCancelado>` +
    `<nProt>${protocolNumber}</nProt>`;

  return buildEventXml({
    accessKey,
    eventType,
    sequenceNumber,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build cancellation event XML (using the generic event builder).
 */
export function buildCancellationEventXml(options: {
  accessKey: string;
  protocolNumber: string;
  reason: string;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    protocolNumber,
    reason,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const additionalTags =
    `<nProt>${protocolNumber}</nProt>` +
    `<xJust>${reason}</xJust>`;

  return buildEventXml({
    accessKey,
    eventType: EVENT_TYPES.CANCELLATION,
    sequenceNumber: 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build substitution cancellation event XML (for NFC-e model 65 only).
 */
export function buildSubstitutionCancellationXml(options: {
  accessKey: string;
  reason: string;
  protocolNumber: string;
  referenceAccessKey: string;
  appVersion: string;
  model: 55 | 65;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    reason,
    protocolNumber,
    referenceAccessKey,
    appVersion,
    model,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  if (model !== 65) {
    throw new Error(
      "Substitution cancellation must only be used with model 65 (NFC-e)"
    );
  }

  if (!appVersion) {
    throw new Error("verAplic is required for substitution cancellation");
  }

  const cOrgaoAutor = accessKey.substring(0, 2);

  const additionalTags =
    `<cOrgaoAutor>${cOrgaoAutor}</cOrgaoAutor>` +
    `<tpAutor>1</tpAutor>` +
    `<verAplic>${appVersion}</verAplic>` +
    `<nProt>${protocolNumber}</nProt>` +
    `<xJust>${reason}</xJust>` +
    `<chNFeRef>${referenceAccessKey}</chNFeRef>`;

  return buildEventXml({
    accessKey,
    eventType: EVENT_TYPES.CANCELLATION_BY_SUBSTITUTION,
    sequenceNumber: 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build recipient manifestation event XML.
 */
export function buildManifestationXml(options: {
  accessKey: string;
  eventType: number;
  reason?: string;
  sequenceNumber?: number;
  taxId: string;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    eventType,
    reason = "",
    sequenceNumber = 1,
    taxId,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  let additionalTags = "";
  if (eventType === EVENT_TYPES.OPERATION_NOT_PERFORMED && reason) {
    additionalTags = `<xJust>${reason}</xJust>`;
  }

  return buildEventXml({
    accessKey,
    eventType,
    sequenceNumber,
    taxId,
    orgCode: "91",
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build delivery proof event XML (Comprovante de Entrega da NF-e).
 */
export function buildDeliveryProofXml(options: {
  accessKey: string;
  appVersion: string;
  receiptDate: string;
  receiverDocument: string;
  receiverName: string;
  latitude?: string;
  longitude?: string;
  image: string;
  sequenceNumber?: number;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    appVersion,
    receiptDate,
    receiverDocument,
    receiverName,
    latitude = "",
    longitude = "",
    image,
    sequenceNumber = 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const crypto = require("node:crypto");
  const hashComprovante = crypto
    .createHash("sha256")
    .update(image)
    .digest("hex")
    .toUpperCase();

  let additionalTags =
    `<verAplic>${appVersion}</verAplic>` +
    `<dhEntrega>${receiptDate}</dhEntrega>` +
    `<nDoc>${receiverDocument}</nDoc>` +
    `<xNome>${receiverName}</xNome>`;

  if (latitude && longitude) {
    additionalTags +=
      `<latGPS>${latitude}</latGPS>` +
      `<longGPS>${longitude}</longGPS>`;
  }

  additionalTags += `<hashComprovante>${hashComprovante}</hashComprovante>`;

  return buildEventXml({
    accessKey,
    eventType: EVENT_TYPES.DELIVERY_PROOF,
    sequenceNumber,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build delivery proof cancellation event XML.
 */
export function buildDeliveryProofCancellationXml(options: {
  accessKey: string;
  appVersion: string;
  protocolNumber: string;
  sequenceNumber?: number;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    appVersion,
    protocolNumber,
    sequenceNumber = 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const additionalTags =
    `<verAplic>${appVersion}</verAplic>` +
    `<nProtEvento>${protocolNumber}</nProtEvento>`;

  return buildEventXml({
    accessKey,
    eventType: EVENT_TYPES.DELIVERY_PROOF_CANCELLATION,
    sequenceNumber,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build delivery failure event XML (Insucesso na Entrega da NF-e).
 */
export function buildDeliveryFailureXml(options: {
  accessKey: string;
  appVersion: string;
  attemptDate: string;
  attempts: number;
  failureReason: number;
  justification?: string;
  latitude?: string;
  longitude?: string;
  image: string;
  sequenceNumber?: number;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    appVersion,
    attemptDate,
    attempts,
    failureReason,
    justification = "",
    latitude = "",
    longitude = "",
    image,
    sequenceNumber = 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const crypto = require("node:crypto");
  const hashInsucesso = crypto
    .createHash("sha256")
    .update(image)
    .digest("hex")
    .toUpperCase();

  let additionalTags =
    `<verAplic>${appVersion}</verAplic>` +
    `<dhTentativaEntrega>${attemptDate}</dhTentativaEntrega>` +
    `<nTentativa>${attempts}</nTentativa>` +
    `<tpMotivo>${failureReason}</tpMotivo>`;

  if (failureReason === 4 && justification) {
    additionalTags += `<xJustMotivo>${justification}</xJustMotivo>`;
  }

  if (latitude && longitude) {
    additionalTags +=
      `<latGPS>${latitude}</latGPS>` +
      `<longGPS>${longitude}</longGPS>`;
  }

  additionalTags += `<hashTentativaEntrega>${hashInsucesso}</hashTentativaEntrega>`;

  return buildEventXml({
    accessKey,
    eventType: EVENT_TYPES.DELIVERY_FAILURE,
    sequenceNumber,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build delivery failure cancellation event XML.
 */
export function buildDeliveryFailureCancellationXml(options: {
  accessKey: string;
  appVersion: string;
  protocolNumber: string;
  sequenceNumber?: number;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    appVersion,
    protocolNumber,
    sequenceNumber = 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const additionalTags =
    `<verAplic>${appVersion}</verAplic>` +
    `<nProtEvento>${protocolNumber}</nProtEvento>`;

  return buildEventXml({
    accessKey,
    eventType: EVENT_TYPES.DELIVERY_FAILURE_CANCELLATION,
    sequenceNumber,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build batch manifestation XML (multiple events in one envelope).
 */
export function buildBatchManifestationXml(options: {
  events: Array<{
    eventType: number;
    accessKey: string;
    sequenceNumber?: number;
    reason?: string;
  }>;
  taxId: string;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const { events, taxId, environment, eventDateTime, lotId, isCpf = false } = options;

  if (!events || events.length === 0) {
    throw new Error("At least one event is required");
  }
  if (events.length > 20) {
    throw new Error("Maximum 20 events per batch");
  }

  const validManifestTypes = [
    EVENT_TYPES.CONFIRMATION,
    EVENT_TYPES.AWARENESS,
    EVENT_TYPES.UNKNOWN_OPERATION,
    EVENT_TYPES.OPERATION_NOT_PERFORMED,
  ];

  const lot = lotId ?? String(Date.now());
  const taxIdTag = isCpf ? `<CPF>${taxId}</CPF>` : `<CNPJ>${taxId}</CNPJ>`;

  const eventoElements = events
    .filter((e) => validManifestTypes.includes(e.eventType))
    .map((e) => {
      const seqNum = e.sequenceNumber ?? 1;
      const seqPadded = String(seqNum).padStart(2, "0");
      const eventId = `ID${e.eventType}${e.accessKey}${seqPadded}`;
      const descEvento = getEventDescription(e.eventType);

      let detContent = `<descEvento>${descEvento}</descEvento>`;
      if (e.eventType === EVENT_TYPES.OPERATION_NOT_PERFORMED && e.reason) {
        detContent += `<xJust>${e.reason}</xJust>`;
      }

      return [
        `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
        `<infEvento Id="${eventId}">`,
        `<cOrgao>91</cOrgao>`,
        `<tpAmb>${environment}</tpAmb>`,
        taxIdTag,
        `<chNFe>${e.accessKey}</chNFe>`,
        `<dhEvento>${eventDateTime}</dhEvento>`,
        `<tpEvento>${e.eventType}</tpEvento>`,
        `<nSeqEvento>${seqNum}</nSeqEvento>`,
        `<verEvento>1.00</verEvento>`,
        `<detEvento versao="1.00">`,
        detContent,
        `</detEvento>`,
        `</infEvento>`,
        `</evento>`,
      ].join("");
    });

  return [
    `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
    `<idLote>${lot}</idLote>`,
    ...eventoElements,
    `</envEvento>`,
  ].join("");
}

/**
 * Build batch event XML (generic, multiple events in one envelope).
 */
export function buildBatchEventXml(options: {
  stateCode: string;
  events: Array<{
    eventType: number;
    accessKey: string;
    sequenceNumber?: number;
    additionalTags?: string;
  }>;
  taxId: string;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const { stateCode, events, taxId, environment, eventDateTime, lotId, isCpf = false } = options;

  if (!stateCode) {
    throw new Error("State code (UF) is required");
  }
  if (!events || events.length === 0) {
    throw new Error("At least one event is required");
  }
  if (events.length > 20) {
    throw new Error("Maximum 20 events per batch");
  }

  const { STATE_CODES } = require("./constants");
  const cUF = STATE_CODES[stateCode];
  const lot = lotId ?? String(Date.now());
  const taxIdTag = isCpf ? `<CPF>${taxId}</CPF>` : `<CNPJ>${taxId}</CNPJ>`;

  const eventoElements = events
    .filter((e) => e.eventType !== EVENT_TYPES.EPEC)
    .map((e) => {
      const seqNum = e.sequenceNumber ?? 1;
      const seqPadded = String(seqNum).padStart(2, "0");
      const eventId = `ID${e.eventType}${e.accessKey}${seqPadded}`;
      const descEvento = getEventDescription(e.eventType);

      return [
        `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
        `<infEvento Id="${eventId}">`,
        `<cOrgao>${cUF}</cOrgao>`,
        `<tpAmb>${environment}</tpAmb>`,
        taxIdTag,
        `<chNFe>${e.accessKey}</chNFe>`,
        `<dhEvento>${eventDateTime}</dhEvento>`,
        `<tpEvento>${e.eventType}</tpEvento>`,
        `<nSeqEvento>${seqNum}</nSeqEvento>`,
        `<verEvento>1.00</verEvento>`,
        `<detEvento versao="1.00">`,
        `<descEvento>${descEvento}</descEvento>`,
        e.additionalTags ?? "",
        `</detEvento>`,
        `</infEvento>`,
        `</evento>`,
      ].join("");
    });

  return [
    `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
    `<idLote>${lot}</idLote>`,
    ...eventoElements,
    `</envEvento>`,
  ].join("");
}

/**
 * Build CSC admin request XML (admCscNFCe).
 */
export function buildCscXml(options: {
  indOp: number;
  model: 55 | 65;
  environment: 1 | 2;
  stateCode: string;
  taxId: string;
  cscId?: string;
  cscToken?: string;
}): string {
  const { indOp, model, environment, stateCode, taxId, cscId, cscToken } = options;

  if (indOp < 1 || indOp > 3) {
    throw new Error("indOp must be 1, 2, or 3");
  }
  if (model !== 65) {
    throw new Error("CSC admin is only available for NFC-e (model 65)");
  }

  let body = `<indOp>${indOp}</indOp>`;

  if (indOp === 3 && cscId && cscToken) {
    body += `<dadosCsc><idCsc>${cscId}</idCsc><codigoCsc>${cscToken}</codigoCsc></dadosCsc>`;
  }

  return [
    `<admCscNFCe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
    `<tpAmb>${environment}</tpAmb>`,
    `<CNPJ>${taxId}</CNPJ>`,
    body,
    `</admCscNFCe>`,
  ].join("");
}

/**
 * Build conciliation event XML.
 */
export function buildConciliacaoXml(options: {
  accessKey: string;
  appVersion: string;
  sequenceNumber?: number;
  cancel?: boolean;
  protocolNumber?: string;
  detPag?: Array<{ tPag: string; vPag: string; dPag: string }>;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    appVersion,
    sequenceNumber = 1,
    cancel = false,
    protocolNumber,
    detPag = [],
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  const eventType = cancel ? 110191 : 110190;
  const descEvento = cancel
    ? "Cancelamento Conciliacao Financeira"
    : "Conciliacao Financeira";

  let additionalTags = `<verAplic>${appVersion}</verAplic>`;

  if (cancel && protocolNumber) {
    additionalTags += `<nProtEvento>${protocolNumber}</nProtEvento>`;
  } else {
    for (const pag of detPag) {
      additionalTags +=
        `<detPag>` +
        `<tPag>${pag.tPag}</tPag>` +
        `<vPag>${pag.vPag}</vPag>` +
        `<dPag>${pag.dPag}</dPag>` +
        `</detPag>`;
    }
  }

  const seqPadded = String(sequenceNumber).padStart(2, "0");
  const eventId = `ID${eventType}${accessKey}${seqPadded}`;
  const taxIdTag = isCpf ? `<CPF>${taxId}</CPF>` : `<CNPJ>${taxId}</CNPJ>`;
  const lot = lotId ?? String(Date.now());

  return [
    `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
    `<idLote>${lot}</idLote>`,
    `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
    `<infEvento Id="${eventId}">`,
    `<cOrgao>${orgCode}</cOrgao>`,
    `<tpAmb>${environment}</tpAmb>`,
    taxIdTag,
    `<chNFe>${accessKey}</chNFe>`,
    `<dhEvento>${eventDateTime}</dhEvento>`,
    `<tpEvento>${eventType}</tpEvento>`,
    `<nSeqEvento>${sequenceNumber}</nSeqEvento>`,
    `<verEvento>1.00</verEvento>`,
    `<detEvento versao="1.00">`,
    `<descEvento>${descEvento}</descEvento>`,
    additionalTags,
    `</detEvento>`,
    `</infEvento>`,
    `</evento>`,
    `</envEvento>`,
  ].join("");
}

/**
 * Build info pagamento integral event XML (tpEvento 112110).
 */
export function buildInfoPagtoIntegralXml(options: {
  accessKey: string;
  model: 55 | 65;
  appVersion?: string;
  sequenceNumber?: number;
  taxId: string;
  orgCode: string | number;
  environment: 1 | 2;
  eventDateTime: string;
  lotId?: string;
  isCpf?: boolean;
}): string {
  const {
    accessKey,
    model,
    appVersion = "",
    sequenceNumber = 1,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    lotId,
    isCpf,
  } = options;

  if (model === 65) {
    throw new Error("Info pagamento integral is only for model 55");
  }

  // Check model in the access key (positions 20-21)
  const keyModel = accessKey.substring(20, 22);
  if (keyModel === "65") {
    throw new Error("Access key contains model 65, must be model 55");
  }

  const additionalTags =
    (appVersion ? `<verAplic>${appVersion}</verAplic>` : "") +
    `<indQuitacao>1</indQuitacao>`;

  return buildEventXml({
    accessKey,
    eventType: 112110,
    sequenceNumber,
    taxId,
    orgCode,
    environment,
    eventDateTime,
    additionalTags,
    lotId,
    isCpf,
  });
}

/**
 * Build EPEC NFC-e status request XML (same as status but for EPEC service).
 */
export function buildEpecStatusXml(options: {
  stateCode: string;
  model: 55 | 65;
  environment: 1 | 2;
}): string {
  const { stateCode, model, environment } = options;

  if (model !== 65) {
    throw new Error("EPEC NFC-e status is only for model 65");
  }
  if (stateCode !== "SP") {
    throw new Error("EPEC NFC-e status is only available for SP");
  }

  return buildStatusRequestXml(stateCode, environment);
}

/**
 * Validate access key format and throw if invalid.
 */
export function validateAccessKey(accessKey: string): void {
  if (!accessKey) {
    throw new Error("Access key is required");
  }
  if (accessKey.length !== 44) {
    throw new Error(`Invalid access key: must be exactly 44 digits, got ${accessKey.length}`);
  }
  if (!/^\d+$/.test(accessKey)) {
    throw new Error("Invalid access key: must contain only digits");
  }
}

/**
 * Build b2b tag for nfeProc.
 */
export function attachB2bTag(nfeProcXml: string, b2bXml: string): string {
  if (!nfeProcXml.includes("nfeProc")) {
    throw new Error("XML must contain nfeProc wrapper");
  }
  if (!b2bXml.includes("NFeB2BFin")) {
    throw new Error("B2B content must contain NFeB2BFin tag");
  }

  return nfeProcXml.replace("</nfeProc>", `${b2bXml}</nfeProc>`);
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
