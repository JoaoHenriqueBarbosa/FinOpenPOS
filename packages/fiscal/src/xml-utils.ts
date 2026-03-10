/**
 * Escape special XML characters in text content and attribute values
 *
 * [pt-BR] Escapa caracteres especiais XML em conteúdo de texto e valores de atributos
 *
 * @param str - Raw string to escape
 * [pt-BR] @param str - String bruta a ser escapada
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Extract text content of a simple XML tag from a raw XML string
 *
 * [pt-BR] Extrai conteúdo de texto de uma tag XML simples de uma string XML bruta
 *
 * @param xml - The XML string to search
 * [pt-BR] @param xml - A string XML para busca
 * @param tagName - Tag name to extract value from
 * [pt-BR] @param tagName - Nome da tag da qual extrair o valor
 */
export function extractXmlTagValue(xml: string, tagName: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagName}>([^<]*)</${tagName}>`));
  return match?.[1];
}

/**
 * Build an XML tag with optional attributes and children.
 *
 * If children is a string, it is escaped. If children is an array
 * of pre-built strings (e.g. nested tags), they are concatenated as-is.
 *
 * [pt-BR] Constrói uma tag XML com atributos e filhos opcionais.
 *
 * Se children for string, será escapado. Se for array de strings
 * pré-construídas (ex: tags aninhadas), serão concatenadas diretamente.
 *
 * @param name - Tag name
 * [pt-BR] @param name - Nome da tag
 * @param attrs - Attribute key-value pairs
 * [pt-BR] @param attrs - Pares chave-valor de atributos
 * @param children - Text content (escaped) or array of nested XML strings
 * [pt-BR] @param children - Conteúdo de texto (escapado) ou array de strings XML aninhadas
 */
export function tag(
  name: string,
  attrs: Record<string, string> = {},
  children?: string | string[]
): string {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join("");

  if (children === undefined || children === "") {
    return `<${name}${attrStr}></${name}>`;
  }

  const content = Array.isArray(children) ? children.join("") : escapeXml(children);
  return `<${name}${attrStr}>${content}</${name}>`;
}
