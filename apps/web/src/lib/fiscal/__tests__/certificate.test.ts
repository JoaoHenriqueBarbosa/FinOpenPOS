import { describe, it, expect, beforeAll } from "bun:test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { getCertificateInfo, loadCertificate, signXml } from "../certificate";

const PFX_PATH = "/tmp/finopenpos-test-cert.pfx";
const PFX_PASS = "test123";
let pfxBuffer: Buffer;

beforeAll(() => {
  // Generate a self-signed certificate for testing
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout /tmp/finopenpos-test-key.pem -out /tmp/finopenpos-test-cert.pem -days 365 -nodes -subj "/CN=Test NFe Company/O=FinOpenPOS Test" 2>/dev/null`
  );
  execSync(
    `openssl pkcs12 -export -out ${PFX_PATH} -inkey /tmp/finopenpos-test-key.pem -in /tmp/finopenpos-test-cert.pem -passout pass:${PFX_PASS} 2>/dev/null`
  );
  pfxBuffer = fs.readFileSync(PFX_PATH);
});

describe("loadCertificate()", () => {
  it("extracts private key and certificate from PFX", () => {
    const cert = loadCertificate(pfxBuffer, PFX_PASS);

    expect(cert.privateKey).toContain("-----BEGIN PRIVATE KEY-----");
    expect(cert.certificate).toContain("-----BEGIN CERTIFICATE-----");
    expect(cert.pfxBuffer).toBe(pfxBuffer);
    expect(cert.passphrase).toBe(PFX_PASS);
  });

  it("throws on invalid PFX buffer", () => {
    expect(() => loadCertificate(Buffer.from("not-a-pfx"), "pass")).toThrow();
  });

  it("throws on wrong password", () => {
    expect(() => loadCertificate(pfxBuffer, "wrong-password")).toThrow();
  });
});

describe("getCertificateInfo()", () => {
  it("returns certificate metadata", () => {
    const info = getCertificateInfo(pfxBuffer, PFX_PASS);

    expect(info.commonName).toBe("Test NFe Company");
    expect(info.issuer).toBe("Test NFe Company"); // self-signed
    expect(info.validFrom).toBeInstanceOf(Date);
    expect(info.validUntil).toBeInstanceOf(Date);
    expect(info.validUntil.getTime()).toBeGreaterThan(Date.now());
    expect(info.serialNumber).toBeTruthy();
  });

  it("throws on invalid PFX", () => {
    expect(() => getCertificateInfo(Buffer.from("garbage"), "pass")).toThrow();
  });
});

describe("signXml()", () => {
  const sampleXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">',
    '<infNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00" Id="NFe35260112345678000199650010000000011123456780">',
    "<ide><cUF>35</cUF><mod>65</mod></ide>",
    "<emit><CNPJ>12345678000199</CNPJ></emit>",
    "<det nItem=\"1\"><prod><cProd>1</cProd><xProd>Test</xProd></prod></det>",
    "<total><ICMSTot><vNF>10.00</vNF></ICMSTot></total>",
    "</infNFe>",
    "</NFe>",
  ].join("");

  it("produces signed XML with Signature element", () => {
    const cert = loadCertificate(pfxBuffer, PFX_PASS);
    const signed = signXml(sampleXml, cert.privateKey, cert.certificate);

    expect(signed).toContain("<Signature");
    expect(signed).toContain("<SignedInfo");
    expect(signed).toContain("<SignatureValue>");
    expect(signed).toContain("<X509Certificate>");
    expect(signed).toContain("<DigestValue>");
  });

  it("signature is inside <NFe> element", () => {
    const cert = loadCertificate(pfxBuffer, PFX_PASS);
    const signed = signXml(sampleXml, cert.privateKey, cert.certificate);

    const nfeEnd = signed.indexOf("</NFe>");
    const sigStart = signed.indexOf("<Signature");
    expect(sigStart).toBeGreaterThan(0);
    expect(sigStart).toBeLessThan(nfeEnd);
  });

  it("references the correct infNFe Id", () => {
    const cert = loadCertificate(pfxBuffer, PFX_PASS);
    const signed = signXml(sampleXml, cert.privateKey, cert.certificate);

    expect(signed).toContain(
      'URI="#NFe35260112345678000199650010000000011123456780"'
    );
  });

  it("uses RSA-SHA1 signature algorithm", () => {
    const cert = loadCertificate(pfxBuffer, PFX_PASS);
    const signed = signXml(sampleXml, cert.privateKey, cert.certificate);

    expect(signed).toContain("rsa-sha1");
  });

  it("uses C14N canonicalization", () => {
    const cert = loadCertificate(pfxBuffer, PFX_PASS);
    const signed = signXml(sampleXml, cert.privateKey, cert.certificate);

    expect(signed).toContain("xml-c14n-20010315");
  });

  it("includes enveloped-signature transform", () => {
    const cert = loadCertificate(pfxBuffer, PFX_PASS);
    const signed = signXml(sampleXml, cert.privateKey, cert.certificate);

    expect(signed).toContain("enveloped-signature");
  });

  it("signed XML can be verified with xml-crypto", () => {
    const { SignedXml } = require("xml-crypto");
    const cert = loadCertificate(pfxBuffer, PFX_PASS);
    const signed = signXml(sampleXml, cert.privateKey, cert.certificate);

    const verifier = new SignedXml({ publicCert: cert.certificate });
    const sigMatch = signed.match(/<Signature[\s\S]*<\/Signature>/);
    expect(sigMatch).toBeTruthy();

    verifier.loadSignature(sigMatch![0]);
    const valid = verifier.checkSignature(signed);
    expect(valid).toBe(true);
  });

  it("throws when infNFe element is missing", () => {
    const cert = loadCertificate(pfxBuffer, PFX_PASS);
    expect(() =>
      signXml("<NFe><data>test</data></NFe>", cert.privateKey, cert.certificate)
    ).toThrow("Could not find <infNFe>");
  });

  it("produces different signatures for different XML content", () => {
    const cert = loadCertificate(pfxBuffer, PFX_PASS);

    const xml2 = sampleXml.replace("<vNF>10.00</vNF>", "<vNF>99.99</vNF>");
    const signed1 = signXml(sampleXml, cert.privateKey, cert.certificate);
    const signed2 = signXml(xml2, cert.privateKey, cert.certificate);

    const extractSigValue = (xml: string) =>
      xml.match(/<SignatureValue>([^<]+)<\/SignatureValue>/)?.[1];

    expect(extractSigValue(signed1)).not.toBe(extractSigValue(signed2));
  });
});
