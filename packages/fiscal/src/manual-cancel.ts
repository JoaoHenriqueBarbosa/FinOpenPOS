/**
 * Cancel the NF-e emitted by manual-test.ts
 * Run:  cd packages/fiscal && bun run src/manual-cancel.ts
 */

import fs from "node:fs";
import { SignedXml } from "xml-crypto";
import { loadCertificate, extractCertFromPfx } from "./certificate";
import { buildCancellationEventXml } from "./sefaz-request-builders";
import { parseCancellationResponse } from "./sefaz-response-parsers";
import { sefazRequest } from "./sefaz-transport";
import { getSefazUrl } from "./sefaz-urls";

const PFX_PATH = "/home/john/Downloads/AUTO ELETRICA BARBOSA LTDA08943553000190.pfx";
const PFX_PASS = "14dezkal";
const CNPJ = "08943553000190";
const STATE = "PR";
const ENVIRONMENT = 2 as const;

const ACCESS_KEY = "41260308943553000190651000000000011659920080";
const PROTOCOL = "141260000092908";

function formatDateBR(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}T${h}:${min}:${s}-03:00`;
}

function signEventXml(xml: string, privateKeyPem: string, certificatePem: string): string {
  const idMatch = xml.match(/<infEvento[^>]*Id="([^"]+)"/);
  if (!idMatch) throw new Error("Could not find <infEvento> with Id attribute");

  const certBase64 = certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    getKeyInfoContent: () =>
      `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`,
  });

  sig.addReference({
    xpath: `//*[@Id='${idMatch[1]}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });

  sig.computeSignature(xml, {
    location: { reference: "//*[local-name()='evento']", action: "append" },
  });

  return sig.getSignedXml();
}

async function main() {
  const pfxBuffer = fs.readFileSync(PFX_PATH);
  const cert = loadCertificate(pfxBuffer, PFX_PASS);

  console.log("Building cancellation event XML...");

  const cancelXml = buildCancellationEventXml({
    accessKey: ACCESS_KEY,
    protocolNumber: PROTOCOL,
    reason: "Nota fiscal emitida para teste do sistema",
    taxId: CNPJ,
    orgCode: "41",
    environment: ENVIRONMENT,
    eventDateTime: formatDateBR(new Date()),
  });

  console.log("Signing...");
  const signedXml = signEventXml(cancelXml, cert.privateKey, cert.certificate);

  const outDir = "/tmp/nfe-test";
  fs.writeFileSync(`${outDir}/cancel-signed.xml`, signedXml);

  console.log("Sending to SEFAZ...");
  const model = ACCESS_KEY.substring(20, 22) === "65" ? 65 : 55;
  const url = getSefazUrl(STATE, "RecepcaoEvento", ENVIRONMENT, false, model as 55 | 65);

  const response = await sefazRequest({
    url,
    service: "RecepcaoEvento",
    xmlContent: signedXml,
    pfx: pfxBuffer,
    passphrase: PFX_PASS,
    timeout: 60000,
  });

  fs.writeFileSync(`${outDir}/cancel-response.xml`, response.body);

  const parsed = parseCancellationResponse(response.content);
  console.log(`\ncStat:   ${parsed.statusCode}`);
  console.log(`xMotivo: ${parsed.statusMessage}`);
  if (parsed.protocolNumber) console.log(`nProt:   ${parsed.protocolNumber}`);

  if (parsed.statusCode === 135 || parsed.statusCode === 155) {
    console.log("\n*** NF-e CANCELLED ***");
  } else {
    console.log("\n*** CANCELLATION FAILED ***");
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
