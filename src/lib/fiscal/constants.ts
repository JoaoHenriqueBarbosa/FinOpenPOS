/** IBGE state codes (cUF) */
export const STATE_CODES: Record<string, string> = {
  AC: "12", AL: "27", AP: "16", AM: "13", BA: "29",
  CE: "23", DF: "53", ES: "32", GO: "52", MA: "21",
  MT: "51", MS: "50", MG: "31", PA: "15", PB: "25",
  PR: "41", PE: "26", PI: "22", RJ: "33", RN: "24",
  RS: "43", RO: "11", RR: "14", SC: "42", SP: "35",
  SE: "28", TO: "17",
};

/** NF-e XML namespace */
export const NFE_NAMESPACE = "http://www.portalfiscal.inf.br/nfe";

/** XML Digital Signature namespace */
export const XMLDSIG_NAMESPACE = "http://www.w3.org/2000/09/xmldsig#";

/** C14N canonicalization algorithm URI */
export const C14N_ALGORITHM = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

/** Enveloped signature transform URI */
export const ENVELOPED_SIGNATURE_TRANSFORM = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";

/** NF-e version */
export const NFE_VERSION = "4.00";

/** Default payment type codes (tPag) */
export const PAYMENT_TYPES: Record<string, string> = {
  cash: "01",
  check: "02",
  credit_card: "03",
  debit_card: "04",
  store_credit: "05",
  voucher: "10",
  pix: "17",
  other: "99",
  none: "90",
};

/** NFC-e QR Code base URLs per environment */
export const NFCE_QRCODE_URLS: Record<string, Record<string, string>> = {
  // Production and homologation URLs per state
  // These vary by state, populated in sefaz-urls.ts
};

/** SOAP namespaces */
export const SOAP_ENVELOPE_NS = "http://www.w3.org/2003/05/soap-envelope";

/** SEFAZ NF-e WSDL base namespace */
export const NFE_WSDL_NS = "http://www.portalfiscal.inf.br/nfe/wsdl";

/** NF-e process namespace (for procNFe wrapper) */
export const NFE_PROC_NAMESPACE = "http://www.portalfiscal.inf.br/nfe";
