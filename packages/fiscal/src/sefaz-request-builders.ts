import { TaxId } from "./value-objects/tax-id";
import { EVENT_TYPES, getEventDescription, buildEventId, defaultLotId } from "./sefaz-event-types";

/**
 * Build the status service request XML.
 *
 * [pt-BR] Constroi o XML de consulta de status do servico (consStatServ).
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
 *
 * [pt-BR] Constroi o XML de autorizacao (envelope enviNFe para transmissao da NF-e).
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
    `<idLote>${defaultLotId()}</idLote>`,
    `<indSinc>1</indSinc>`,
    nfeContent,
    `</enviNFe>`,
  ].join("");
}

/**
 * Build cancellation event XML.
 *
 * [pt-BR] Constroi o XML do evento de cancelamento da NF-e.
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

  return buildEventXml({
    accessKey,
    eventType: EVENT_TYPES.CANCELLATION,
    sequenceNumber: 1,
    taxId,
    orgCode: "91",
    environment,
    eventDateTime: new Date().toISOString(),
    additionalTags: `<nProt>${protocolNumber}</nProt><xJust>${reason}</xJust>`,
  });
}

/**
 * Build number voiding (inutilizacao) request XML.
 *
 * [pt-BR] Constroi o XML de inutilizacao de numeracao (inutNFe).
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
 *
 * [pt-BR] Constroi o XML de consulta de recibo (consReciNFe).
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
 *
 * [pt-BR] Constroi o XML de consulta por chave de acesso (consSitNFe).
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
 *
 * [pt-BR] Constroi o XML de envio em lote (enviNFe).
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
 *
 * [pt-BR] Constroi o XML de consulta cadastral (ConsCad) por CNPJ, IE ou CPF.
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
 *
 * [pt-BR] Constroi o XML de consulta de distribuicao de DF-e (distDFeInt).
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

  const taxIdTag = new TaxId(taxId).toXmlTag();

  return [
    `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">`,
    `<tpAmb>${environment}</tpAmb>`,
    `<cUFAutor>${cUF}</cUFAutor>`,
    taxIdTag,
    queryTag,
    `</distDFeInt>`,
  ].join("");
}

/**
 * Build a generic SEFAZ event XML (evento inside envEvento).
 * This produces the unsigned inner evento XML. Signing is done separately.
 *
 * [pt-BR] Constroi o XML generico de evento SEFAZ (evento dentro de envEvento).
 * Produz o XML interno sem assinatura. A assinatura e feita separadamente.
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

  const eventId = buildEventId(eventType, accessKey, sequenceNumber);
  const descEvento = getEventDescription(eventType);
  const taxIdTag = new TaxId(taxId).toXmlTag();
  const lot = defaultLotId(lotId);

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
 *
 * [pt-BR] Constroi o XML do evento Carta de Correcao Eletronica (CC-e).
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
 *
 * [pt-BR] Constroi o XML do evento Ator Interessado na NF-e.
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

  const actorTag = new TaxId(actorTaxId).toXmlTag();

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
 *
 * [pt-BR] Constroi o XML do evento de Pedido de Prorrogacao (EPP).
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
 *
 * [pt-BR] Constroi o XML do evento de Cancelamento de Pedido de Prorrogacao (ECPP).
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

  const idPedidoCancelado = buildEventId(origEvent, accessKey, sequenceNumber);

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
 *
 * [pt-BR] Constroi o XML do evento de cancelamento (via construtor generico de eventos).
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
 *
 * [pt-BR] Constroi o XML do evento de cancelamento por substituicao (apenas NFC-e modelo 65).
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
 *
 * [pt-BR] Constroi o XML do evento de manifestacao do destinatario.
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
 *
 * [pt-BR] Constroi o XML do evento Comprovante de Entrega da NF-e.
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
 *
 * [pt-BR] Constroi o XML do evento de cancelamento do Comprovante de Entrega.
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
 *
 * [pt-BR] Constroi o XML do evento de Insucesso na Entrega da NF-e.
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
 *
 * [pt-BR] Constroi o XML do evento de cancelamento do Insucesso na Entrega.
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
 *
 * [pt-BR] Constroi o XML de manifestacao em lote (multiplos eventos em um envelope).
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

  const lot = defaultLotId(lotId);
  const taxIdTag = new TaxId(taxId).toXmlTag();

  const eventoElements = events
    .filter((e) => validManifestTypes.includes(e.eventType))
    .map((e) => {
      const seqNum = e.sequenceNumber ?? 1;
      const eventId = buildEventId(e.eventType, e.accessKey, seqNum);
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
 *
 * [pt-BR] Constroi o XML generico de eventos em lote (multiplos eventos em um envelope).
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
  const lot = defaultLotId(lotId);
  const taxIdTag = new TaxId(taxId).toXmlTag();

  const eventoElements = events
    .filter((e) => e.eventType !== EVENT_TYPES.EPEC)
    .map((e) => {
      const seqNum = e.sequenceNumber ?? 1;
      const eventId = buildEventId(e.eventType, e.accessKey, seqNum);
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
 *
 * [pt-BR] Constroi o XML de administracao do CSC para NFC-e (admCscNFCe).
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
 *
 * [pt-BR] Constroi o XML do evento de Conciliacao Financeira.
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

  const eventId = buildEventId(eventType, accessKey, sequenceNumber);
  const taxIdTag = new TaxId(taxId).toXmlTag();
  const lot = defaultLotId(lotId);

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
 *
 * [pt-BR] Constroi o XML do evento Informacao de Pagamento Integral (tpEvento 112110).
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
 *
 * [pt-BR] Constroi o XML de consulta de status EPEC NFC-e (apenas SP, modelo 65).
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
 *
 * [pt-BR] Valida o formato da chave de acesso (44 digitos numericos) e lanca erro se invalida.
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
 *
 * [pt-BR] Anexa a tag B2B (NFeB2BFin) ao XML do nfeProc.
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
