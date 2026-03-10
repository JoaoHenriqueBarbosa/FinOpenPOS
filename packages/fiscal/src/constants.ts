/**
 * @deprecated Import from "./state-codes" instead.
 * Re-exported for backward compatibility with dynamic require() calls.
 *
 * [pt-BR] @deprecated Importe de "./state-codes" em vez disso.
 * Re-exportado para compatibilidade com chamadas dinâmicas require().
 */
export { STATE_IBGE_CODES as STATE_CODES } from "./state-codes";

/**
 * NF-e XML namespace
 *
 * [pt-BR] Namespace XML da NF-e
 */
export const NFE_NAMESPACE = "http://www.portalfiscal.inf.br/nfe";

/**
 * XML Digital Signature namespace
 *
 * [pt-BR] Namespace da assinatura digital XML
 */
export const XMLDSIG_NAMESPACE = "http://www.w3.org/2000/09/xmldsig#";

/**
 * C14N canonicalization algorithm URI
 *
 * [pt-BR] URI do algoritmo de canonicalização C14N
 */
export const C14N_ALGORITHM = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

/**
 * Enveloped signature transform URI
 *
 * [pt-BR] URI da transformação de assinatura envelopada
 */
export const ENVELOPED_SIGNATURE_TRANSFORM = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";

/**
 * NF-e version (currently 4.00)
 *
 * [pt-BR] Versão do layout da NF-e (atualmente 4.00)
 */
export const NFE_VERSION = "4.00";

/**
 * Default payment type codes (tPag) mapped by friendly name
 *
 * [pt-BR] Códigos de tipo de pagamento (tPag) mapeados por nome amigável
 */
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

/**
 * NFC-e QR Code base URLs per environment and state
 *
 * [pt-BR] URLs base do QR Code da NFC-e por ambiente e estado
 */
export const NFCE_QRCODE_URLS: Record<string, Record<string, string>> = {
  // Production and homologation URLs per state
  // These vary by state, populated in sefaz-urls.ts
};

/**
 * SOAP envelope namespace for SEFAZ web service requests
 *
 * [pt-BR] Namespace do envelope SOAP para requisições aos web services SEFAZ
 */
export const SOAP_ENVELOPE_NS = "http://www.w3.org/2003/05/soap-envelope";

/**
 * SEFAZ NF-e WSDL base namespace
 *
 * [pt-BR] Namespace base WSDL da NF-e SEFAZ
 */
export const NFE_WSDL_NS = "http://www.portalfiscal.inf.br/nfe/wsdl";

/**
 * NF-e process namespace (for procNFe wrapper)
 *
 * [pt-BR] Namespace do processo NF-e (para wrapper procNFe)
 */
export const NFE_PROC_NAMESPACE = "http://www.portalfiscal.inf.br/nfe";
