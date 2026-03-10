/**
 * Manual NFC-e emission test — model 65, production.
 * Run:  cd packages/fiscal && bun run src/manual-test-nfce.ts
 */

import fs from "node:fs";
import { loadCertificate, getCertificateInfo, signXml } from "./certificate";
import { buildInvoiceXml } from "./xml-builder";
import { buildAuthorizationRequestXml } from "./sefaz-request-builders";
import { parseAuthorizationResponse } from "./sefaz-response-parsers";
import { sefazRequest } from "./sefaz-transport";
import { getSefazUrl } from "./sefaz-urls";
import type { InvoiceBuildData } from "./types";

const PFX_PATH = "/home/john/Downloads/AUTO ELETRICA BARBOSA LTDA08943553000190.pfx";
const PFX_PASS = "14dezkal";
const CNPJ = "08943553000190";
const IE = "9041004980";
const STATE = "PR";
const CITY_CODE = "4106852"; // Cruzmaltina
const CITY_NAME = "Cruzmaltina";
const ENVIRONMENT = 2 as const; // homologation
const QRCODE_URL = "http://www.fazenda.pr.gov.br/nfce/qrcode";
const URL_CHAVE = "http://www.fazenda.pr.gov.br/nfce/consulta";

async function main() {
  const pfxBuffer = fs.readFileSync(PFX_PATH);
  const cert = loadCertificate(pfxBuffer, PFX_PASS);
  console.log("Certificate loaded OK");

  // Build NFC-e
  const invoiceData: InvoiceBuildData = {
    model: 65,
    series: 100,
    number: 1,
    emissionType: 1,
    environment: ENVIRONMENT,
    issuedAt: new Date(),
    operationNature: "VENDA DE MERCADORIA",
    operationType: 1,
    consumerType: "1",
    buyerPresence: "1",
    printFormat: "4", // NFC-e DANFCE

    issuer: {
      taxId: CNPJ, stateTaxId: IE,
      companyName: "AUTO ELETRICA BARBOSA LTDA",
      tradeName: "AUTO ELETRICA BARBOSA LTDA",
      taxRegime: 1, stateCode: STATE,
      cityCode: CITY_CODE, cityName: CITY_NAME,
      street: "RUA JOAO FERREIRA DE CASTRO", streetNumber: "92",
      district: "Centro", zipCode: "86855000", addressComplement: null,
    },

    items: [{
      itemNumber: 1, productCode: "001",
      description: "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
      ncm: "85119000", cfop: "5102", unitOfMeasure: "UN",
      quantity: 1, unitPrice: 1000, totalPrice: 1000, orig: "0",
      icmsCst: "102", icmsRate: 0, icmsAmount: 0,
      pisCst: "49", pisVBC: 0, pisPPIS: 0, pisVPIS: 0,
      cofinsCst: "49", cofinsVBC: 0, cofinsPCOFINS: 0, cofinsVCOFINS: 0,
    }],

    payments: [{ method: "01", amount: 1000 }],

    techResponsible: {
      taxId: "14363848000190", contact: "Solusys",
      email: "contato@solusys.com.br", phone: "4334771000",
    },
  };

  let { xml: unsignedXml, accessKey } = buildInvoiceXml(invoiceData);
  console.log(`Access Key: ${accessKey}`);

  // Sign
  const signedXml = signXml(unsignedXml, cert.privateKey, cert.certificate);

  // Insert QR Code v300 online (no CSC needed)
  const qrCodeUrl = `${QRCODE_URL}?p=${accessKey}|3|${ENVIRONMENT}`;
  const urlChaveTag = URL_CHAVE;
  const infNFeSupl = `<infNFeSupl><qrCode><![CDATA[${qrCodeUrl}]]></qrCode><urlChave>${urlChaveTag}</urlChave></infNFeSupl>`;

  // Insert infNFeSupl before <Signature
  const finalXml = signedXml.replace(
    /(<Signature\s)/,
    `${infNFeSupl}<Signature `
  );

  const outDir = "/tmp/nfe-test";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(`${outDir}/nfce-signed.xml`, finalXml);

  // Send
  console.log("Sending to SEFAZ PR NFC-e...");
  const authUrl = getSefazUrl(STATE, "NfeAutorizacao", ENVIRONMENT, false, 65);
  const authRequestXml = buildAuthorizationRequestXml(finalXml, ENVIRONMENT, STATE);

  const response = await sefazRequest({
    url: authUrl, service: "NfeAutorizacao",
    xmlContent: authRequestXml,
    pfx: pfxBuffer, passphrase: PFX_PASS, timeout: 60000,
  });

  fs.writeFileSync(`${outDir}/nfce-response.xml`, response.body);

  const parsed = parseAuthorizationResponse(response.content);
  console.log(`cStat:   ${parsed.statusCode}`);
  console.log(`xMotivo: ${parsed.statusMessage}`);
  if (parsed.protocolNumber) console.log(`nProt:   ${parsed.protocolNumber}`);
  if (parsed.authorizedAt) console.log(`dhRecbto: ${parsed.authorizedAt}`);

  if (parsed.statusCode === 100) {
    console.log("\n*** NFC-e AUTHORIZED ***");
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
