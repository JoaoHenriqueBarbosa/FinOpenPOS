/**
 * XML document identification and conversion utilities.
 *
 * [pt-BR] Utilitarios de identificacao e conversao de documentos XML.
 *
 * Ported from PHP sped-nfe: src/NFe/Common/Standardize.php
 */

import { XMLParser } from "fast-xml-parser";

/** Known root tag names for NFe-related XML documents */
const ROOT_TAG_LIST = [
  "distDFeInt",
  "resNFe",
  "resEvento",
  "envEvento",
  "ConsCad",
  "consSitNFe",
  "consReciNFe",
  "downloadNFe",
  "enviNFe",
  "inutNFe",
  "admCscNFCe",
  "consStatServ",
  "retDistDFeInt",
  "retEnvEvento",
  "retConsCad",
  "retConsSitNFe",
  "retConsReciNFe",
  "retDownloadNFe",
  "retEnviNFe",
  "retInutNFe",
  "retAdmCscNFCe",
  "retConsStatServ",
  "procInutNFe",
  "procEventoNFe",
  "procNFe",
  "nfeProc",
  "NFe",
];

/**
 * Check if a string looks like valid XML.
 */
function isXml(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("<")) {
    return false;
  }
  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    parser.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively search a parsed XML object for a key matching one of the root tags.
 */
function findRootTag(obj: Record<string, unknown>): string | null {
  for (const tag of ROOT_TAG_LIST) {
    if (tag in obj) {
      return tag;
    }
  }
  // Search one level deeper (e.g. inside namespace wrappers)
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      for (const tag of ROOT_TAG_LIST) {
        if (tag in (val as Record<string, unknown>)) {
          return tag;
        }
      }
    }
  }
  return null;
}

/**
 * Identify which NFe document type an XML string represents.
 *
 * [pt-BR] Identifica qual tipo de documento NFe uma string XML representa.
 *
 * @returns The root tag name (e.g. 'NFe', 'nfeProc', 'retConsSitNFe')
 * @throws If input is empty, not a string, not valid XML, or not an NFe document
 */
export function whichIs(xml: unknown): string {
  if (xml == null || (typeof xml === "string" && xml.trim() === "")) {
    throw new Error("XML is empty.");
  }
  if (typeof xml !== "string") {
    throw new Error("Invalid document: input must be an XML string.");
  }
  if (!isXml(xml)) {
    throw new Error("Invalid document: not valid XML.");
  }

  const parser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
  });
  const parsed = parser.parse(xml);

  const tag = findRootTag(parsed);
  if (!tag) {
    throw new Error("Document does not belong to the NFe project.");
  }
  return tag;
}

/**
 * Convert an NFe XML string to a JSON string.
 *
 * [pt-BR] Converte uma string XML de NFe para string JSON.
 */
export function toJson(xml: string): string {
  // Validate first
  whichIs(xml);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: true,
    textNodeName: "#text",
    parseAttributeValue: false,
    parseTagValue: false,
  });
  const parsed = parser.parse(xml);
  return JSON.stringify(parsed);
}

/**
 * Convert an NFe XML string to a plain object (like PHP's toArray).
 *
 * [pt-BR] Converte uma string XML de NFe para objeto simples (equivalente ao toArray do PHP).
 */
export function toArray(xml: string): Record<string, unknown> {
  const json = toJson(xml);
  return JSON.parse(json);
}

/**
 * Convert an NFe XML string to a normalized object (like PHP's toStd).
 * In TypeScript this is equivalent to toArray since we don't have stdClass.
 *
 * [pt-BR] Converte uma string XML de NFe para objeto normalizado (equivalente ao toStd do PHP).
 */
export function toStd(xml: string): Record<string, unknown> {
  return toArray(xml);
}
