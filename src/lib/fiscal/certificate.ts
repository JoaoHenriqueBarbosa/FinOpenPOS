import crypto from "node:crypto";
import { SignedXml } from "xml-crypto";
import type { CertificateData, CertificateInfo } from "./types";

/**
 * Load private key and certificate from a PFX/PKCS12 buffer.
 */
export function loadCertificate(
  pfxBuffer: Buffer,
  passphrase: string
): CertificateData {
  const certPem = extractCertFromPfx(pfxBuffer, passphrase);
  const keyPem = extractKeyFromPfx(pfxBuffer, passphrase);

  return {
    privateKey: keyPem,
    certificate: certPem,
    pfxBuffer,
    passphrase,
  };
}

/**
 * Extract certificate info for display (without exposing private key).
 */
export function getCertificateInfo(
  pfxBuffer: Buffer,
  passphrase: string
): CertificateInfo {
  const certPem = extractCertFromPfx(pfxBuffer, passphrase);
  const cert = new crypto.X509Certificate(certPem);

  return {
    commonName: extractCN(cert.subject),
    validFrom: new Date(cert.validFrom),
    validUntil: new Date(cert.validTo),
    serialNumber: cert.serialNumber,
    issuer: extractCN(cert.issuer),
  };
}

/**
 * Sign an NF-e XML string with XMLDSig enveloped signature using xml-crypto.
 *
 * The signature covers the <infNFe> element identified by its Id attribute.
 * Algorithms: C14N canonicalization, SHA-1 digest, RSA-SHA1 signature
 * (as required by SEFAZ MOC 4.0).
 */
export function signXml(
  xml: string,
  privateKeyPem: string,
  certificatePem: string
): string {
  // Extract the Id attribute from infNFe
  const idMatch = xml.match(/<infNFe[^>]*Id="([^"]+)"/);
  if (!idMatch) {
    throw new Error("Could not find <infNFe> element with Id attribute in XML");
  }

  const certBase64 = extractCertBase64(certificatePem);

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
    location: { reference: "//*[local-name()='NFe']", action: "append" },
  });

  return sig.getSignedXml();
}

// ── Private helpers ─────────────────────────────────────────────────────────

/**
 * Extract certificate PEM from PFX using openssl.
 */
function extractCertFromPfx(pfxBuffer: Buffer, passphrase: string): string {
  const { execSync } = require("node:child_process");
  const tmpPfx = "/tmp/_finopenpos_cert_extract.pfx";
  require("node:fs").writeFileSync(tmpPfx, pfxBuffer);
  try {
    const certPem = execSync(
      `openssl pkcs12 -in ${tmpPfx} -clcerts -nokeys -passin pass:${passphrase} 2>/dev/null`,
      { encoding: "utf-8" }
    );
    const match = certPem.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/
    );
    if (!match) {
      throw new Error("Could not extract certificate from PFX");
    }
    return match[0];
  } finally {
    try { require("node:fs").unlinkSync(tmpPfx); } catch {}
  }
}

/**
 * Extract private key PEM from PFX using openssl.
 */
function extractKeyFromPfx(pfxBuffer: Buffer, passphrase: string): string {
  const { execSync } = require("node:child_process");
  const tmpPfx = "/tmp/_finopenpos_key_extract.pfx";
  require("node:fs").writeFileSync(tmpPfx, pfxBuffer);
  try {
    const keyPem = execSync(
      `openssl pkcs12 -in ${tmpPfx} -nocerts -nodes -passin pass:${passphrase} 2>/dev/null`,
      { encoding: "utf-8" }
    );
    const match = keyPem.match(
      /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/
    );
    if (!match) {
      throw new Error("Could not extract private key from PFX");
    }
    return match[0];
  } finally {
    try { require("node:fs").unlinkSync(tmpPfx); } catch {}
  }
}

/**
 * Extract Base64-encoded certificate body from PEM (strip headers/footers).
 */
function extractCertBase64(certPem: string): string {
  return certPem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");
}

/**
 * Extract Common Name (CN) from an X509 subject/issuer string.
 */
function extractCN(subjectOrIssuer: string): string {
  const match = subjectOrIssuer.match(/CN=([^,\n]+)/);
  return match ? match[1].trim() : subjectOrIssuer;
}
