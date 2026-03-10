import crypto from "node:crypto";
import { SignedXml } from "xml-crypto";
import type { CertificateData, CertificateInfo } from "./types";

/**
 * Load private key and certificate from a PFX/PKCS12 buffer.
 *
 * [pt-BR] Carrega chave privada e certificado a partir de um buffer PFX/PKCS12.
 *
 * @param pfxBuffer - Raw PFX file contents
 * [pt-BR] @param pfxBuffer - Conteúdo bruto do arquivo PFX
 * @param passphrase - PFX password
 * [pt-BR] @param passphrase - Senha do PFX
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
 *
 * [pt-BR] Extrai informações do certificado para exibição (sem expor a chave privada).
 *
 * @param pfxBuffer - Raw PFX file contents
 * [pt-BR] @param pfxBuffer - Conteúdo bruto do arquivo PFX
 * @param passphrase - PFX password
 * [pt-BR] @param passphrase - Senha do PFX
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
 * Covers <infNFe> with C14N canonicalization, SHA-1 digest, RSA-SHA1 signature.
 *
 * [pt-BR] Assina um XML de NF-e com assinatura XMLDSig envelopada via xml-crypto.
 * Cobre <infNFe> com canonização C14N, digest SHA-1 e assinatura RSA-SHA1.
 *
 * @param xml - Unsigned NF-e XML string
 * [pt-BR] @param xml - String XML da NF-e sem assinatura
 * @param privateKeyPem - PEM-encoded private key
 * [pt-BR] @param privateKeyPem - Chave privada em formato PEM
 * @param certificatePem - PEM-encoded certificate
 * [pt-BR] @param certificatePem - Certificado em formato PEM
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

/**
 * Sign a SEFAZ event XML (cancelamento, CCe, etc.) with XMLDSig.
 * Same as signXml() but references <infEvento> inside <evento>.
 *
 * [pt-BR] Assina um XML de evento SEFAZ (cancelamento, CCe, etc.) com XMLDSig.
 * Mesmo algoritmo de signXml(), mas referencia <infEvento> dentro de <evento>.
 *
 * @param xml - Unsigned event XML string
 * [pt-BR] @param xml - String XML do evento sem assinatura
 * @param privateKeyPem - PEM-encoded private key
 * [pt-BR] @param privateKeyPem - Chave privada em formato PEM
 * @param certificatePem - PEM-encoded certificate
 * [pt-BR] @param certificatePem - Certificado em formato PEM
 */
export function signEventXml(
  xml: string,
  privateKeyPem: string,
  certificatePem: string
): string {
  const idMatch = xml.match(/<infEvento[^>]*Id="([^"]+)"/);
  if (!idMatch) {
    throw new Error("Could not find <infEvento> element with Id attribute in XML");
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
    location: { reference: "//*[local-name()='evento']", action: "append" },
  });

  return sig.getSignedXml();
}

// ── Private helpers ─────────────────────────────────────────────────────────

/**
 * Extract certificate PEM from PFX using openssl CLI (with -legacy flag).
 *
 * [pt-BR] Extrai o certificado PEM do PFX usando openssl CLI (com flag -legacy).
 *
 * @param pfxBuffer - Raw PFX file contents
 * [pt-BR] @param pfxBuffer - Conteúdo bruto do arquivo PFX
 * @param passphrase - PFX password
 * [pt-BR] @param passphrase - Senha do PFX
 */
export function extractCertFromPfx(pfxBuffer: Buffer, passphrase: string): string {
  const { execSync } = require("node:child_process");
  const tmpPfx = "/tmp/_finopenpos_cert_extract.pfx";
  require("node:fs").writeFileSync(tmpPfx, pfxBuffer);
  try {
    const certPem = execSync(
      `openssl pkcs12 -in ${tmpPfx} -clcerts -nokeys -passin pass:${passphrase} -legacy 2>/dev/null`,
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
 * Extract private key PEM from PFX using openssl CLI (with -legacy flag).
 *
 * [pt-BR] Extrai a chave privada PEM do PFX usando openssl CLI (com flag -legacy).
 *
 * @param pfxBuffer - Raw PFX file contents
 * [pt-BR] @param pfxBuffer - Conteúdo bruto do arquivo PFX
 * @param passphrase - PFX password
 * [pt-BR] @param passphrase - Senha do PFX
 */
export function extractKeyFromPfx(pfxBuffer: Buffer, passphrase: string): string {
  const { execSync } = require("node:child_process");
  const tmpPfx = "/tmp/_finopenpos_key_extract.pfx";
  require("node:fs").writeFileSync(tmpPfx, pfxBuffer);
  try {
    const keyPem = execSync(
      `openssl pkcs12 -in ${tmpPfx} -nocerts -nodes -passin pass:${passphrase} -legacy 2>/dev/null`,
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
