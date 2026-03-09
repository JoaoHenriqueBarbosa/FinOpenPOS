import { Contingency } from "./contingency";
import { buildAccessKey } from "./xml-builder";
import { extractXmlTagValue } from "./xml-utils";

/**
 * Adjust NF-e XML for contingency mode.
 *
 * Ported from PHP NFePHP\NFe\Factories\ContingencyNFe::adjust().
 *
 * Modifies the XML to set contingency emission type (tpEmis),
 * adds dhCont and xJust tags, and recalculates the access key.
 *
 * @param xml - NF-e XML string
 * @param contingency - Active contingency configuration
 * @returns Modified XML string
 * @throws Error when contingency is not active or XML is NFC-e (model 65)
 */
export function adjustNfeForContingency(xml: string, contingency: Contingency): string {
  if (contingency.type === "") {
    return xml;
  }

  // Remove XML signature if present (we need to re-sign after modifications)
  xml = removeSignature(xml);

  // Parse the XML using a simple regex-based approach for lightweight processing
  // (avoiding heavy DOM dependency in Bun)
  const mod = extractXmlTagValue(xml, "mod");
  if (mod === "65") {
    throw new Error(
      "The XML belongs to a model 65 document (NFC-e), incorrect for SVCAN or SVCRS contingency."
    );
  }

  const tpEmis = extractXmlTagValue(xml, "tpEmis");
  if (tpEmis !== "1") {
    // XML was already issued in contingency mode, no adjustment needed
    return xml;
  }

  // Extract fields needed for access key recalculation
  const cUF = extractXmlTagValue(xml, "cUF") ?? "";
  const cNF = extractXmlTagValue(xml, "cNF") ?? "";
  const nNF = extractXmlTagValue(xml, "nNF") ?? "";
  const serie = extractXmlTagValue(xml, "serie") ?? "";
  const dhEmi = extractXmlTagValue(xml, "dhEmi") ?? "";

  // Extract emitter document (CNPJ or CPF) from <emit> section
  const emitBlock = xml.match(/<emit>([\s\S]*?)<\/emit>/)?.[1] ?? "";
  const cnpj = emitBlock.match(/<CNPJ>(.*?)<\/CNPJ>/)?.[1];
  const cpf = emitBlock.match(/<CPF>(.*?)<\/CPF>/)?.[1];
  const doc = cnpj || cpf || "";

  // Parse emission date for year/month
  const emiDate = new Date(dhEmi);
  const ano = String(emiDate.getFullYear()).slice(-2);
  const mes = String(emiDate.getMonth() + 1).padStart(2, "0");

  // Format the contingency timestamp as ISO datetime in the emitter's timezone
  // Use the dhEmi timezone offset as reference for the emitter's timezone
  const tzMatch = dhEmi.match(/([+-]\d{2}:\d{2})$/);
  const tzOffset = tzMatch ? tzMatch[1] : "-03:00";
  const contDate = new Date(contingency.timestamp * 1000);
  const dthCont = formatDateWithOffset(contDate, tzOffset);

  const motivo = contingency.motive.trim();

  // Replace tpEmis value
  xml = xml.replace(
    /<tpEmis>\d+<\/tpEmis>/,
    `<tpEmis>${contingency.tpEmis}</tpEmis>`
  );

  // Insert or update dhCont and xJust in <ide>
  if (xml.includes("<dhCont>")) {
    xml = xml.replace(/<dhCont>.*?<\/dhCont>/, `<dhCont>${dthCont}</dhCont>`);
  } else {
    // Insert before </ide> or before <NFref> if present
    const nfrefMatch = xml.match(/<NFref>/);
    if (nfrefMatch) {
      xml = xml.replace(/<NFref>/, `<dhCont>${dthCont}</dhCont><NFref>`);
    } else {
      xml = xml.replace(/<\/ide>/, `<dhCont>${dthCont}</dhCont></ide>`);
    }
  }

  if (xml.includes("<xJust>")) {
    xml = xml.replace(/<xJust>.*?<\/xJust>/, `<xJust>${motivo}</xJust>`);
  } else {
    const nfrefMatch = xml.match(/<NFref>/);
    if (nfrefMatch) {
      xml = xml.replace(/<NFref>/, `<xJust>${motivo}</xJust><NFref>`);
    } else {
      xml = xml.replace(/<\/ide>/, `<xJust>${motivo}</xJust></ide>`);
    }
  }

  // Recalculate the access key
  const newKey = buildAccessKey({
    stateCode: cUF,
    yearMonth: `${ano}${mes}`,
    taxId: doc,
    model: parseInt(mod) as 55 | 65,
    series: parseInt(serie),
    number: parseInt(nNF),
    emissionType: contingency.tpEmis,
    numericCode: cNF,
  });

  // Update cDV
  const newCDV = newKey.slice(-1);
  xml = xml.replace(/<cDV>\d<\/cDV>/, `<cDV>${newCDV}</cDV>`);

  // Update infNFe Id attribute
  xml = xml.replace(
    /(<infNFe\s+Id=")NFe\d{44}(")/,
    `$1NFe${newKey}$2`
  );

  return xml;
}

// extractXmlTagValue imported from ./xml-utils

/** Remove XML digital signature block */
function removeSignature(xml: string): string {
  return xml.replace(/<Signature\s+xmlns[^>]*>[\s\S]*?<\/Signature>/g, "").trim();
}

/** Format a Date object with a specific timezone offset string like "-03:00" */
function formatDateWithOffset(date: Date, offset: string): string {
  // Parse offset to get hours/minutes
  const match = offset.match(/([+-])(\d{2}):(\d{2})/);
  if (!match) return date.toISOString();

  const sign = match[1] === "+" ? 1 : -1;
  const offsetHours = parseInt(match[2]);
  const offsetMinutes = parseInt(match[3]);
  const totalOffsetMs = sign * (offsetHours * 60 + offsetMinutes) * 60 * 1000;

  // Get UTC time and apply offset
  const utcMs = date.getTime();
  const localMs = utcMs + totalOffsetMs;
  const localDate = new Date(localMs);

  const yyyy = localDate.getUTCFullYear();
  const mm = String(localDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(localDate.getUTCDate()).padStart(2, "0");
  const hh = String(localDate.getUTCHours()).padStart(2, "0");
  const mi = String(localDate.getUTCMinutes()).padStart(2, "0");
  const ss = String(localDate.getUTCSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${offset}`;
}
