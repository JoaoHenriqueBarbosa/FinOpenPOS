/**
 * Manual emission test — NF-e model 55, homologation environment.
 *
 * Company: AUTO ELETRICA BARBOSA LTDA (PR)
 * Run:  cd packages/fiscal && bun run src/manual-test.ts
 */

import fs from "node:fs";
import { loadCertificate, getCertificateInfo, signXml } from "./certificate";
import { buildInvoiceXml } from "./xml-builder";
import { buildStatusRequestXml, buildAuthorizationRequestXml } from "./sefaz-request-builders";
import { parseStatusResponse, parseAuthorizationResponse } from "./sefaz-response-parsers";
import { sefazRequest } from "./sefaz-transport";
import { getSefazUrl } from "./sefaz-urls";
import type { InvoiceBuildData } from "./types";

// ── Company data ────────────────────────────────────────────────────────────

const PFX_PATH = "/home/john/Downloads/AUTO ELETRICA BARBOSA LTDA08943553000190.pfx";
const PFX_PASS = "14dezkal";

const CNPJ = "08943553000190";
const IE = "9041004980";
const STATE = "PR";
const CITY_CODE = "4106852"; // Cruzmaltina/PR
const CITY_NAME = "Cruzmaltina";
const ENVIRONMENT = 2 as const; // homologation

// ── Helpers ─────────────────────────────────────────────────────────────────

function separator(title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}\n`);
}

/**
 * Patch the empty enderDest fields that buildDest hardcodes for model 55.
 * Replaces empty xLgr/nro/xBairro/cMun/xMun/CEP inside <enderDest> with
 * placeholder values so SEFAZ schema validation passes.
 */
function patchEnderDest(xml: string): string {
  const enderDest = xml.match(/<enderDest>([\s\S]*?)<\/enderDest>/);
  if (!enderDest) return xml;

  let patched = enderDest[1];
  patched = patched.replace("<xLgr></xLgr>", "<xLgr>RUA TESTE</xLgr>");
  patched = patched.replace("<nro></nro>", "<nro>1</nro>");
  patched = patched.replace("<xBairro></xBairro>", "<xBairro>Centro</xBairro>");
  patched = patched.replace("<cMun></cMun>", `<cMun>${CITY_CODE}</cMun>`);
  patched = patched.replace("<xMun></xMun>", `<xMun>${CITY_NAME}</xMun>`);
  patched = patched.replace("<CEP></CEP>", "<CEP>86855000</CEP>");

  return xml.replace(enderDest[1], patched);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  separator("STEP 1: Load certificate");

  const pfxBuffer = fs.readFileSync(PFX_PATH);
  console.log(`PFX loaded: ${pfxBuffer.length} bytes`);

  const certInfo = getCertificateInfo(pfxBuffer, PFX_PASS);
  console.log(`  CN:        ${certInfo.commonName}`);
  console.log(`  Valid:     ${certInfo.validFrom.toISOString()} — ${certInfo.validUntil.toISOString()}`);

  if (new Date() > certInfo.validUntil) {
    console.error("  *** CERTIFICATE EXPIRED ***");
    process.exit(1);
  }
  console.log(`  Status:    OK`);

  const cert = loadCertificate(pfxBuffer, PFX_PASS);

  // 2. SEFAZ status
  separator("STEP 2: SEFAZ status (PR, homologation)");

  const statusUrl = getSefazUrl(STATE, "NfeStatusServico", ENVIRONMENT, false, 55);
  const statusResponse = await sefazRequest({
    url: statusUrl, service: "NfeStatusServico",
    xmlContent: buildStatusRequestXml(STATE, ENVIRONMENT),
    pfx: pfxBuffer, passphrase: PFX_PASS,
  });
  const statusParsed = parseStatusResponse(statusResponse.content);
  console.log(`  cStat: ${statusParsed.statusCode} — ${statusParsed.statusMessage}`);

  if (statusParsed.statusCode !== 107) {
    console.error("  *** SEFAZ offline ***");
    process.exit(1);
  }

  // 3. Build NF-e
  separator("STEP 3: Build NF-e XML");

  const invoiceData: InvoiceBuildData = {
    model: 55,
    series: 100,
    number: 1,
    emissionType: 1,
    environment: ENVIRONMENT,
    issuedAt: new Date(),
    operationNature: "VENDA DE MERCADORIA",
    operationType: 1,
    consumerType: "1",
    buyerPresence: "1",
    printFormat: "1",

    issuer: {
      taxId: CNPJ, stateTaxId: IE,
      companyName: "AUTO ELETRICA BARBOSA LTDA",
      tradeName: "AUTO ELETRICA BARBOSA LTDA",
      taxRegime: 1, stateCode: STATE,
      cityCode: CITY_CODE, cityName: CITY_NAME,
      street: "RUA JOAO FERREIRA DE CASTRO", streetNumber: "92",
      district: "Centro", zipCode: "86855000", addressComplement: null,
    },

    recipient: {
      taxId: "12345678909",
      name: "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
      stateCode: STATE,
    },

    items: [{
      itemNumber: 1, productCode: "001",
      description: "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
      ncm: "39269090", cfop: "5102", unitOfMeasure: "UN",
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
  // Patch empty enderDest fields
  unsignedXml = patchEnderDest(unsignedXml);

  console.log(`  Access Key: ${accessKey}`);
  const outDir = "/tmp/nfe-test";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(`${outDir}/unsigned.xml`, unsignedXml);

  // 4. Sign
  separator("STEP 4: Sign XML");
  const signedXml = signXml(unsignedXml, cert.privateKey, cert.certificate);
  fs.writeFileSync(`${outDir}/signed.xml`, signedXml);
  console.log(`  Signed: ${signedXml.length} chars`);

  // 5. Send
  separator("STEP 5: Send to SEFAZ");
  const authUrl = getSefazUrl(STATE, "NfeAutorizacao", ENVIRONMENT, false, 55);
  const authRequestXml = buildAuthorizationRequestXml(signedXml, ENVIRONMENT, STATE);
  fs.writeFileSync(`${outDir}/auth-request.xml`, authRequestXml);

  const authResponse = await sefazRequest({
    url: authUrl, service: "NfeAutorizacao",
    xmlContent: authRequestXml,
    pfx: pfxBuffer, passphrase: PFX_PASS, timeout: 60000,
  });

  fs.writeFileSync(`${outDir}/auth-response-raw.xml`, authResponse.body);
  fs.writeFileSync(`${outDir}/auth-response-content.xml`, authResponse.content);

  const authParsed = parseAuthorizationResponse(authResponse.content);

  // 6. Result
  separator("RESULT");
  console.log(`  cStat:     ${authParsed.statusCode}`);
  console.log(`  xMotivo:   ${authParsed.statusMessage}`);
  if (authParsed.protocolNumber) console.log(`  nProt:     ${authParsed.protocolNumber}`);
  if (authParsed.authorizedAt) console.log(`  dhRecbto:  ${authParsed.authorizedAt}`);

  if (authParsed.statusCode === 100) {
    console.log("\n  *** NF-e AUTHORIZED ***");
  }
  console.log(`\n  Files: ${outDir}/`);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
