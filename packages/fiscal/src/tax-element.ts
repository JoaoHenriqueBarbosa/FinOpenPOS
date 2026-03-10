/**
 * Shared types and serializer for tax calculation results.
 *
 * Tax modules (ICMS, PIS, COFINS, IPI, II, ISSQN, IS) return
 * structured TaxElement data. The XML builder serializes them.
 * This breaks the coupling: tax modules don't import xml-builder.
 *
 * [pt-BR] Tipos compartilhados e serializador para resultados de cálculo tributário.
 *
 * Módulos de impostos (ICMS, PIS, COFINS, IPI, II, ISSQN, IS) retornam
 * dados estruturados TaxElement. O builder XML os serializa.
 * Isso desacopla: módulos de imposto não importam xml-builder.
 */

/**
 * A single XML field: <name>value</name>
 *
 * [pt-BR] Um único campo XML: <name>value</name>
 */
export interface TaxField {
  /** XML element name / [pt-BR] Nome do elemento XML */
  name: string;
  /** XML element text value / [pt-BR] Valor de texto do elemento XML */
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
 *
 * [pt-BR] Representação estruturada de um elemento XML de imposto.
 *
 * Cobre todos os padrões de grupos tributários da NF-e:
 *   - <ICMS><ICMS00>...campos...</ICMS00></ICMS>  (externo + variante)
 *   - <IPI><cEnq>999</cEnq><IPITrib>...</IPITrib></IPI>  (externo + campos externos + variante)
 *   - <ICMSUFDest>...campos...</ICMSUFDest>  (somente variante, sem externo)
 *   - <II>...campos...</II>  (somente variante, sem externo)
 */
export interface TaxElement {
  /** Outer wrapper tag (e.g., "ICMS", "PIS", "IPI"). null = no wrapper. / [pt-BR] Tag externa (ex: "ICMS", "PIS", "IPI"). null = sem wrapper. */
  outerTag: string | null;
  /** Fields at the outer level, before the variant (e.g., IPI's cEnq). / [pt-BR] Campos no nível externo, antes da variante (ex: cEnq do IPI). */
  outerFields: TaxField[];
  /** The variant/inner tag (e.g., "ICMS00", "PISAliq", "IPITrib", "II"). / [pt-BR] Tag variante/interna (ex: "ICMS00", "PISAliq", "IPITrib", "II"). */
  variantTag: string;
  /** Fields inside the variant tag. / [pt-BR] Campos dentro da tag variante. */
  fields: TaxField[];
}

/**
 * Helper: create an optional field (returns null if value is nullish)
 *
 * [pt-BR] Auxiliar: cria um campo opcional (retorna null se o valor for nulo)
 *
 * @param name - XML element name
 * [pt-BR] @param name - Nome do elemento XML
 * @param value - Field value, or null/undefined to skip
 * [pt-BR] @param value - Valor do campo, ou null/undefined para pular
 */
export function optionalField(
  name: string,
  value: string | null | undefined
): TaxField | null {
  if (value === null || value === undefined) return null;
  return { name, value };
}

/**
 * Helper: create a required field (throws if value is nullish)
 *
 * [pt-BR] Auxiliar: cria um campo obrigatório (lança erro se o valor for nulo)
 *
 * @param name - XML element name
 * [pt-BR] @param name - Nome do elemento XML
 * @param value - Field value (must not be null/undefined)
 * [pt-BR] @param value - Valor do campo (não pode ser null/undefined)
 */
export function requiredField(
  name: string,
  value: string | null | undefined
): TaxField {
  if (value === null || value === undefined) {
    throw new Error(`Required tax field "${name}" is missing`);
  }
  return { name, value };
}

/**
 * Filter null entries from a TaxField array
 *
 * [pt-BR] Filtra entradas nulas de um array de TaxField
 *
 * @param fields - Array of TaxField or null values
 * [pt-BR] @param fields - Array de valores TaxField ou null
 */
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
 *   -> <ICMS><ICMS00>...fields...</ICMS00></ICMS>
 *
 *   { outerTag: null, variantTag: "ICMSUFDest", fields: [...] }
 *   -> <ICMSUFDest>...fields...</ICMSUFDest>
 *
 *   { outerTag: "IPI", outerFields: [{cEnq, "999"}], variantTag: "IPITrib", fields: [...] }
 *   -> <IPI><cEnq>999</cEnq><IPITrib>...fields...</IPITrib></IPI>
 *
 * [pt-BR] Serializa um TaxElement para string XML.
 *
 * Exemplos:
 *   { outerTag: "ICMS", variantTag: "ICMS00", fields: [...] }
 *   -> <ICMS><ICMS00>...campos...</ICMS00></ICMS>
 *
 *   { outerTag: null, variantTag: "ICMSUFDest", fields: [...] }
 *   -> <ICMSUFDest>...campos...</ICMSUFDest>
 *
 * @param element - The TaxElement to serialize
 * [pt-BR] @param element - O TaxElement a ser serializado
 */
export function serializeTaxElement(element: TaxElement): string {
  const innerContent = element.fields.map(serializeField).join("");
  const variantXml = `<${element.variantTag}>${innerContent}</${element.variantTag}>`;

  if (!element.outerTag) return variantXml;

  const outerFieldsXml = element.outerFields.map(serializeField).join("");
  return `<${element.outerTag}>${outerFieldsXml}${variantXml}</${element.outerTag}>`;
}
