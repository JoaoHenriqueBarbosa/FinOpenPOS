/** Escape special XML characters in text content and attribute values. */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Extract text content of a simple XML tag from a raw XML string. */
export function extractXmlTagValue(xml: string, tagName: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagName}>([^<]*)</${tagName}>`));
  return match?.[1];
}

/**
 * Build an XML tag with optional attributes and children.
 *
 * If children is a string, it is escaped. If children is an array
 * of pre-built strings (e.g. nested tags), they are concatenated as-is.
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
