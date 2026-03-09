/**
 * Shared types and serializer for tax calculation results.
 *
 * Tax modules (ICMS, PIS, COFINS, IPI, II, ISSQN, IS) return
 * structured TaxElement data. The XML builder serializes them.
 * This breaks the coupling: tax modules don't import xml-builder.
 */

/** A single XML field: <name>value</name> */
export interface TaxField {
  name: string;
  value: string;
}

/**
 * Structured representation of a tax XML element.
 *
 * Covers all NF-e tax group patterns:
 *   - <ICMS><ICMS00>...fields...</ICMS00></ICMS>  (outer + variant)
 *   - <IPI><cEnq>999</cEnq><IPITrib>...</IPITrib></IPI>  (outer + outerFields + variant)
 *   - <ICMSUFDest>...fields...</ICMSUFDest>  (variant only, no outer)
 *   - <II>...fields...</II>  (variant only, no outer)
 */
export interface TaxElement {
  /** Outer wrapper tag (e.g., "ICMS", "PIS", "IPI"). null = no wrapper. */
  outerTag: string | null;
  /** Fields at the outer level, before the variant (e.g., IPI's cEnq). */
  outerFields: TaxField[];
  /** The variant/inner tag (e.g., "ICMS00", "PISAliq", "IPITrib", "II"). */
  variantTag: string;
  /** Fields inside the variant tag. */
  fields: TaxField[];
}

/** Helper: create an optional field (returns null if value is nullish). */
export function optionalField(
  name: string,
  value: string | null | undefined
): TaxField | null {
  if (value === null || value === undefined) return null;
  return { name, value };
}

/** Helper: create a required field (throws if value is nullish). */
export function requiredField(
  name: string,
  value: string | null | undefined
): TaxField {
  if (value === null || value === undefined) {
    throw new Error(`Required tax field "${name}" is missing`);
  }
  return { name, value };
}

/** Filter null entries from a TaxField array. */
export function filterFields(
  fields: Array<TaxField | null>
): TaxField[] {
  return fields.filter((f): f is TaxField => f !== null);
}

/** Escape XML special characters in a value. */
function escapeXmlValue(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Serialize a TaxField to XML: <name>value</name> */
function serializeField(field: TaxField): string {
  return `<${field.name}>${escapeXmlValue(field.value)}</${field.name}>`;
}

/**
 * Serialize a TaxElement to an XML string.
 *
 * Examples:
 *   { outerTag: "ICMS", variantTag: "ICMS00", fields: [...] }
 *   → <ICMS><ICMS00>...fields...</ICMS00></ICMS>
 *
 *   { outerTag: null, variantTag: "ICMSUFDest", fields: [...] }
 *   → <ICMSUFDest>...fields...</ICMSUFDest>
 *
 *   { outerTag: "IPI", outerFields: [{cEnq, "999"}], variantTag: "IPITrib", fields: [...] }
 *   → <IPI><cEnq>999</cEnq><IPITrib>...fields...</IPITrib></IPI>
 */
export function serializeTaxElement(element: TaxElement): string {
  const innerContent = element.fields.map(serializeField).join("");
  const variantXml = `<${element.variantTag}>${innerContent}</${element.variantTag}>`;

  if (!element.outerTag) return variantXml;

  const outerFieldsXml = element.outerFields.map(serializeField).join("");
  return `<${element.outerTag}>${outerFieldsXml}${variantXml}</${element.outerTag}>`;
}
