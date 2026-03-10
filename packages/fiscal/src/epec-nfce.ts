/**
 * EPEC NFC-e (Evento Previo de Emissao em Contingencia) for NFC-e model 65.
 *
 * [pt-BR] EPEC NFC-e (Evento Previo de Emissao em Contingencia) para NFC-e modelo 65.
 *
 * Mirrors PHP TraitEPECNfce -- parses an NFC-e XML, extracts data,
 * and builds an EPEC event XML.
 * [pt-BR] Espelha o PHP TraitEPECNfce -- faz parsing de um XML NFC-e, extrai dados
 * e constroi um XML de evento EPEC.
 */

import { XMLParser } from "fast-xml-parser";
import { buildEventId, defaultLotId } from "./sefaz-event-types";
import { STATE_IBGE_CODES } from "./state-codes";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

/**
 * Configuration for EPEC NFC-e event building.
 *
 * [pt-BR] Configuracao para construcao de evento EPEC NFC-e.
 */
export interface EpecNfceConfig {
  /** State abbreviation, e.g. "SP" / [pt-BR] Sigla do estado, ex. "SP" */
  stateCode: string;
  /** Tax environment: 1=production, 2=homologation / [pt-BR] Ambiente fiscal: 1=producao, 2=homologacao */
  tpAmb: number;
  /** CNPJ of the company / [pt-BR] CNPJ da empresa */
  cnpj: string;
  /** Application version (from setVerAplic) / [pt-BR] Versao do aplicativo */
  appVersion?: string;
}

function getNodeValue(obj: any, tagName: string): string | undefined {
  if (obj == null) return undefined;
  const val = obj[tagName];
  if (val == null) return undefined;
  return String(val);
}

/**
 * Build EPEC event XML for an NFC-e (model 65).
 *
 * [pt-BR] Constroi XML do evento EPEC para NFC-e (modelo 65).
 *
 * @param nfceXml - The NFC-e XML string
 * [pt-BR] @param nfceXml - String XML da NFC-e
 * @param config - EPEC configuration
 * [pt-BR] @param config - Configuracao EPEC
 * @param verAplic - Optional explicit verAplic override
 * [pt-BR] @param verAplic - Substituicao explicita opcional do verAplic
 * @returns The EPEC event XML string
 * [pt-BR] @returns String XML do evento EPEC
 */
export function buildEpecNfceXml(
  nfceXml: string,
  config: EpecNfceConfig,
  verAplic?: string
): string {
  const parsed = xmlParser.parse(nfceXml);
  const nfe = parsed.NFe;
  const infNFe = nfe.infNFe;
  const ide = infNFe.ide;
  const emit = infNFe.emit;
  const dest = infNFe.dest;
  const total = infNFe.total;

  // Extract fields
  const tpEmis = Number(getNodeValue(ide, "tpEmis") ?? "1");
  const dhCont = getNodeValue(ide, "dhCont") ?? "";
  const xJust = getNodeValue(ide, "xJust") ?? "";

  if (tpEmis !== 4 || !dhCont || !xJust) {
    throw new Error(
      "A NFCe deve ser gerada em contingência EPEC para poder ser processada em contingência EPEC"
    );
  }

  // Extract chNFe from infNFe Id attribute
  const infNFeId: string = infNFe["@_Id"] ?? "";
  const chNFe = infNFeId.replace(/^NFe/, "");

  // Validate UF match
  const cOrgaoAutor = STATE_IBGE_CODES[config.stateCode];
  const ufChave = chNFe.substring(0, 2);
  if (cOrgaoAutor !== ufChave) {
    throw new Error(
      `O autor [${cOrgaoAutor}] não é da mesma UF que a NFe [${ufChave}]`
    );
  }

  const verProc = getNodeValue(ide, "verProc") ?? "1.0.0";
  const dhEmi = getNodeValue(ide, "dhEmi") ?? "";
  const tpNF = getNodeValue(ide, "tpNF") ?? "1";
  const emitIE = getNodeValue(emit, "IE") ?? "";

  let destUF = config.stateCode;
  if (dest?.enderDest?.UF) {
    destUF = String(dest.enderDest.UF);
  }

  const icmsTot = total.ICMSTot;
  const vNF = getNodeValue(icmsTot, "vNF") ?? "0.00";
  const vICMS = getNodeValue(icmsTot, "vICMS") ?? "0.00";

  // Build dest block
  let destBlock = "";
  if (dest) {
    let destID = "";
    const cnpjDest = getNodeValue(dest, "CNPJ");
    const cpfDest = getNodeValue(dest, "CPF");
    const idEstrangeiro = getNodeValue(dest, "idEstrangeiro");

    if (cnpjDest) {
      destID = `<CNPJ>${cnpjDest}</CNPJ>`;
    } else if (cpfDest) {
      destID = `<CPF>${cpfDest}</CPF>`;
    } else if (idEstrangeiro) {
      destID = `<idEstrangeiro>${idEstrangeiro}</idEstrangeiro>`;
    }

    let destIE = "";
    const ieDest = getNodeValue(dest, "IE");
    if (ieDest) {
      destIE = `<IE>${ieDest}</IE>`;
    }

    destBlock = `<dest><UF>${destUF}</UF>${destID}${destIE}</dest>`;
  }

  // Resolve verAplic
  let resolvedVerAplic = verAplic;
  if (!resolvedVerAplic) {
    resolvedVerAplic = config.appVersion || verProc;
  }

  const tagAdic = `<cOrgaoAutor>${cOrgaoAutor}</cOrgaoAutor>`
    + `<tpAutor>1</tpAutor>`
    + `<verAplic>${resolvedVerAplic}</verAplic>`
    + `<dhEmi>${dhEmi}</dhEmi>`
    + `<tpNF>${tpNF}</tpNF>`
    + `<IE>${emitIE}</IE>`
    + destBlock
    + `<vNF>${vNF}</vNF>`
    + `<vICMS>${vICMS}</vICMS>`;

  // Build the event envelope
  const tpEvento = "110140";
  const verEvento = "1.00";
  const nSeqEvento = 1;
  const eventId = buildEventId(tpEvento, chNFe, nSeqEvento);
  const cOrgao = cOrgaoAutor;
  const descEvento = "EPEC";
  const dhEvento = new Date().toISOString().replace("Z", "-03:00");
  const lote = defaultLotId();

  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="${verEvento}">`
    + `<idLote>${lote}</idLote>`
    + `<evento versao="${verEvento}">`
    + `<infEvento Id="${eventId}">`
    + `<cOrgao>${cOrgao}</cOrgao>`
    + `<tpAmb>${config.tpAmb}</tpAmb>`
    + `<CNPJ>${config.cnpj}</CNPJ>`
    + `<chNFe>${chNFe}</chNFe>`
    + `<dhEvento>${dhEvento}</dhEvento>`
    + `<tpEvento>${tpEvento}</tpEvento>`
    + `<nSeqEvento>${nSeqEvento}</nSeqEvento>`
    + `<verEvento>${verEvento}</verEvento>`
    + `<detEvento versao="${verEvento}">`
    + `<descEvento>${descEvento}</descEvento>`
    + tagAdic
    + `</detEvento>`
    + `</infEvento>`
    + `</evento>`
    + `</envEvento>`;
}

/**
 * Build consStatServ XML for EPEC NFC-e status check.
 *
 * [pt-BR] Constroi XML consStatServ para consulta de status EPEC NFC-e.
 */
export function buildEpecNfceStatusXml(
  config: EpecNfceConfig,
  uf?: string,
  tpAmb?: number
): string {
  const resolvedTpAmb = tpAmb ?? config.tpAmb;
  const resolvedUf = uf || config.stateCode;

  if (resolvedUf !== "SP") {
    throw new Error(
      "A consulta de status do servico EPEC NFCe (mod. 65) existe apenas em SP"
    );
  }

  const cUF = STATE_IBGE_CODES[resolvedUf];

  return `<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`
    + `<tpAmb>${resolvedTpAmb}</tpAmb>`
    + `<cUF>${cUF}</cUF>`
    + `<xServ>STATUS</xServ>`
    + `</consStatServ>`;
}

/**
 * Build a minimal NFC-e XML for testing EPEC.
 *
 * [pt-BR] Constroi XML minimo de NFC-e para testes de EPEC.
 *
 * Mirrors the PHP buildEpecNfceXml() test helper method.
 * [pt-BR] Espelha o metodo auxiliar de teste buildEpecNfceXml() do PHP.
 */
export function buildTestNfceXml(
  uf: string = "SP",
  cUF: string = "35",
  tpEmis: string = "4",
  destType: "CNPJ" | "CPF" | "idEstrangeiro" | "none" = "CNPJ"
): string {
  const cnpjEmit = "23285089000185";
  const chNFe = `${cUF}200323285089000185650010000013051817822496`;

  let destBlock = "";
  if (destType === "CNPJ") {
    destBlock = `<dest><CNPJ>10422724000187</CNPJ><xNome>DEST TESTE</xNome><enderDest><UF>${uf}</UF></enderDest></dest>`;
  } else if (destType === "CPF") {
    destBlock = `<dest><CPF>12345678901</CPF><xNome>DEST PESSOA FISICA</xNome><enderDest><UF>${uf}</UF></enderDest></dest>`;
  } else if (destType === "idEstrangeiro") {
    destBlock = `<dest><idEstrangeiro>FOREIGN123</idEstrangeiro><xNome>DEST ESTRANGEIRO</xNome><enderDest><UF>${uf}</UF></enderDest></dest>`;
  }

  let dhContBlock = "";
  let xJustBlock = "";
  if (tpEmis === "4") {
    dhContBlock = "<dhCont>2020-03-11T12:32:17-03:00</dhCont>";
    xJustBlock = "<xJust>Teste de contingência EPEC</xJust>";
  }

  return `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">`
    + `<infNFe Id="NFe${chNFe}" versao="4.00">`
    + `<ide>`
    + `<cUF>${cUF}</cUF>`
    + `<cNF>81782249</cNF>`
    + `<natOp>Venda de mercadoria</natOp>`
    + `<mod>65</mod>`
    + `<serie>1</serie>`
    + `<nNF>1305</nNF>`
    + `<dhEmi>2020-03-11T15:32:17-03:00</dhEmi>`
    + `<tpNF>1</tpNF>`
    + `<idDest>1</idDest>`
    + `<cMunFG>3550308</cMunFG>`
    + `<tpImp>4</tpImp>`
    + `<tpEmis>${tpEmis}</tpEmis>`
    + `<cDV>6</cDV>`
    + `<tpAmb>2</tpAmb>`
    + `<finNFe>1</finNFe>`
    + `<indFinal>1</indFinal>`
    + `<indPres>1</indPres>`
    + `<procEmi>0</procEmi>`
    + `<verProc>1.0.0</verProc>`
    + dhContBlock
    + xJustBlock
    + `</ide>`
    + `<emit>`
    + `<CNPJ>${cnpjEmit}</CNPJ>`
    + `<xNome>EMPRESA TESTE</xNome>`
    + `<enderEmit><UF>${uf}</UF></enderEmit>`
    + `<IE>9077361720</IE>`
    + `<CRT>1</CRT>`
    + `</emit>`
    + destBlock
    + `<total><ICMSTot>`
    + `<vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson>`
    + `<vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST>`
    + `<vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet>`
    + `<vProd>100.00</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg>`
    + `<vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI>`
    + `<vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS>`
    + `<vOutro>0.00</vOutro><vNF>100.00</vNF>`
    + `</ICMSTot></total>`
    + `</infNFe></NFe>`;
}
