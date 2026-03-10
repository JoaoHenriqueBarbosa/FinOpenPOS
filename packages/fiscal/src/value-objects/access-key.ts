/**
 * Value object for NF-e/NFC-e access keys (chave de acesso).
 *
 * [pt-BR] Objeto de valor para chaves de acesso NF-e/NFC-e.
 *
 * An access key is a 44-digit numeric string that uniquely identifies
 * a Brazilian fiscal document. Format:
 *   cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9)
 *   + tpEmis(1) + cNF(8) + cDV(1)
 */

import type { AccessKeyParams } from "../types";

/**
 * Immutable 44-digit NF-e/NFC-e access key with component extraction methods.
 *
 * [pt-BR] Chave de acesso NF-e/NFC-e imutavel de 44 digitos com metodos de extracao de componentes.
 */
export class AccessKey {
  private readonly value: string;

  constructor(key: string) {
    if (!key || key.length !== 44 || !/^\d+$/.test(key)) {
      throw new Error(
        `Invalid access key: must be exactly 44 numeric digits, got ${key ? `"${key}" (${key.length})` : "empty"}`
      );
    }
    this.value = key;
  }

  /**
   * Build an access key from its component parts.
   * Concatenates all parts, computes the mod-11 check digit, and returns an AccessKey.
   *
   * [pt-BR] Constroi uma chave de acesso a partir de suas partes componentes.
   */
  static build(params: AccessKeyParams): AccessKey {
    const parts = [
      params.stateCode.padStart(2, "0"),
      params.yearMonth,
      params.taxId.padStart(14, "0"),
      String(params.model).padStart(2, "0"),
      String(params.series).padStart(3, "0"),
      String(params.number).padStart(9, "0"),
      String(params.emissionType),
      params.numericCode.padStart(8, "0"),
    ].join("");

    const checkDigit = AccessKey.calculateMod11(parts);
    return new AccessKey(parts + checkDigit);
  }

  /**
   * Calculate modulo 11 check digit.
   * Weights cycle from 2 to 9 right-to-left.
   * Result: if remainder < 2 then digit 0; else 11 - remainder.
   *
   * [pt-BR] Calcula digito verificador modulo 11.
   */
  static calculateMod11(digits: string): string {
    let sum = 0;
    let weight = 2;

    for (let i = digits.length - 1; i >= 0; i--) {
      sum += parseInt(digits[i]) * weight;
      weight = weight >= 9 ? 2 : weight + 1;
    }

    const remainder = sum % 11;
    const digit = remainder < 2 ? 0 : 11 - remainder;
    return String(digit);
  }

  /** IBGE state code -- positions 0..1 / [pt-BR] Codigo IBGE do estado -- posicoes 0..1 */
  stateCode(): string {
    return this.value.substring(0, 2);
  }

  /** Year + month (AAMM) -- positions 2..5 / [pt-BR] Ano + mes (AAMM) -- posicoes 2..5 */
  yearMonth(): string {
    return this.value.substring(2, 6);
  }

  /** Taxpayer CNPJ -- positions 6..19 / [pt-BR] CNPJ do contribuinte -- posicoes 6..19 */
  taxId(): string {
    return this.value.substring(6, 20);
  }

  /** Fiscal model (55 = NF-e, 65 = NFC-e) -- positions 20..21 / [pt-BR] Modelo fiscal -- posicoes 20..21 */
  model(): number {
    return parseInt(this.value.substring(20, 22));
  }

  /** Series number -- positions 22..24 / [pt-BR] Numero de serie -- posicoes 22..24 */
  series(): number {
    return parseInt(this.value.substring(22, 25));
  }

  /** Invoice number -- positions 25..33 / [pt-BR] Numero da nota -- posicoes 25..33 */
  number(): number {
    return parseInt(this.value.substring(25, 34));
  }

  /** Emission type -- position 34 / [pt-BR] Tipo de emissao -- posicao 34 */
  emissionType(): number {
    return parseInt(this.value.substring(34, 35));
  }

  /** Numeric code -- positions 35..42 / [pt-BR] Codigo numerico -- posicoes 35..42 */
  numericCode(): string {
    return this.value.substring(35, 43);
  }

  /** Check digit (mod-11) -- position 43 / [pt-BR] Digito verificador (mod-11) -- posicao 43 */
  checkDigit(): string {
    return this.value.substring(43, 44);
  }

  /** Returns the raw 44-digit string. / [pt-BR] Retorna a string de 44 digitos. */
  toString(): string {
    return this.value;
  }
}
