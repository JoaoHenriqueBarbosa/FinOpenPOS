/**
 * Value object for Brazilian tax identifiers (CPF / CNPJ).
 *
 * Encapsulates the CPF-vs-CNPJ detection logic that was previously
 * duplicated across xml-builder.ts and sefaz-client.ts.
 */
export class TaxId {
  constructor(private readonly value: string) {}

  /** A CPF has at most 11 digits; a CNPJ has 14. */
  isCpf(): boolean {
    return this.value.length <= 11;
  }

  isCnpj(): boolean {
    return this.value.length > 11;
  }

  /** Returns "CPF" or "CNPJ" — ready to use as an XML tag name. */
  tagName(): "CPF" | "CNPJ" {
    return this.isCpf() ? "CPF" : "CNPJ";
  }

  /** Zero-padded to 11 (CPF) or 14 (CNPJ) digits. */
  padded(): string {
    return this.isCpf()
      ? this.value.padStart(11, "0")
      : this.value.padStart(14, "0");
  }

  /** Inline XML fragment: `<CPF>00012345678</CPF>` or `<CNPJ>...`. */
  toXmlTag(): string {
    return `<${this.tagName()}>${this.padded()}</${this.tagName()}>`;
  }

  /** Raw value, unpadded. */
  toString(): string {
    return this.value;
  }
}
