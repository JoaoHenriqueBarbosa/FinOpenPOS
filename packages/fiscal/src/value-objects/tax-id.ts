/**
 * Value object for Brazilian tax identifiers (CPF / CNPJ).
 *
 * [pt-BR] Objeto de valor para identificadores fiscais brasileiros (CPF / CNPJ).
 *
 * Encapsulates the CPF-vs-CNPJ detection logic that was previously
 * duplicated across xml-builder.ts and sefaz-client.ts.
 */
/**
 * Immutable wrapper for CPF or CNPJ with formatting and XML helpers.
 *
 * [pt-BR] Wrapper imutavel para CPF ou CNPJ com formatacao e helpers XML.
 */
export class TaxId {
  constructor(private readonly value: string) {}

  /** A CPF has at most 11 digits; a CNPJ has 14. / [pt-BR] CPF tem no maximo 11 digitos; CNPJ tem 14. */
  isCpf(): boolean {
    return this.value.length <= 11;
  }

  /** Check if value is a CNPJ (more than 11 digits). / [pt-BR] Verifica se o valor e um CNPJ (mais de 11 digitos). */
  isCnpj(): boolean {
    return this.value.length > 11;
  }

  /** Returns "CPF" or "CNPJ" -- ready to use as an XML tag name. / [pt-BR] Retorna "CPF" ou "CNPJ" -- pronto para uso como tag XML. */
  tagName(): "CPF" | "CNPJ" {
    return this.isCpf() ? "CPF" : "CNPJ";
  }

  /** Zero-padded to 11 (CPF) or 14 (CNPJ) digits. / [pt-BR] Preenchido com zeros ate 11 (CPF) ou 14 (CNPJ) digitos. */
  padded(): string {
    return this.isCpf()
      ? this.value.padStart(11, "0")
      : this.value.padStart(14, "0");
  }

  /** Inline XML fragment: `<CPF>00012345678</CPF>` or `<CNPJ>...`. / [pt-BR] Fragmento XML inline: `<CPF>...` ou `<CNPJ>...`. */
  toXmlTag(): string {
    return `<${this.tagName()}>${this.padded()}</${this.tagName()}>`;
  }

  /** Raw value, unpadded. / [pt-BR] Valor bruto, sem preenchimento. */
  toString(): string {
    return this.value;
  }
}
