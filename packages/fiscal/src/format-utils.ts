/**
 * Shared formatting utilities for fiscal XML generation.
 *
 * All monetary amounts are stored as integers (cents). Rate/percentage fields
 * are stored as scaled integers. These helpers convert them to the decimal
 * strings required by the SEFAZ XML schema.
 *
 * [pt-BR] Utilitários compartilhados de formatação para geração de XML fiscal.
 *
 * Todos os valores monetários são armazenados como inteiros (centavos).
 * Campos de taxa/percentual são inteiros escalonados. Estes helpers os
 * convertem para strings decimais exigidas pelo schema XML da SEFAZ.
 */

/**
 * Format cents integer to decimal string. E.g. 1050 -> "10.50"
 *
 * [pt-BR] Formata inteiro em centavos para string decimal. Ex: 1050 -> "10.50"
 *
 * @param cents - Value in cents
 * [pt-BR] @param cents - Valor em centavos
 * @param decimalPlaces - Number of decimal places (default 2)
 * [pt-BR] @param decimalPlaces - Número de casas decimais (padrão 2)
 */
export function formatCents(cents: number, decimalPlaces = 2): string {
  return (cents / 100).toFixed(decimalPlaces);
}

/**
 * Format a number with N decimal places
 *
 * [pt-BR] Formata um número com N casas decimais
 *
 * @param value - The numeric value to format
 * [pt-BR] @param value - O valor numérico a formatar
 * @param decimalPlaces - Number of decimal places
 * [pt-BR] @param decimalPlaces - Número de casas decimais
 */
export function formatDecimal(value: number, decimalPlaces: number): string {
  return value.toFixed(decimalPlaces);
}

/**
 * Format rate stored as hundredths to decimal string. E.g. 1800 -> "18.0000"
 *
 * [pt-BR] Formata taxa armazenada em centésimos para string decimal. Ex: 1800 -> "18.0000"
 *
 * @param hundredths - Rate value in hundredths (e.g. 1800 = 18%)
 * [pt-BR] @param hundredths - Valor da taxa em centésimos (ex: 1800 = 18%)
 * @param decimalPlaces - Number of decimal places (default 4)
 * [pt-BR] @param decimalPlaces - Número de casas decimais (padrão 4)
 */
export function formatRate(hundredths: number, decimalPlaces = 4): string {
  return (hundredths / 100).toFixed(decimalPlaces);
}

/**
 * Format rate stored as value * 10000 to 4-decimal string. E.g. 16500 -> "1.6500"
 *
 * [pt-BR] Formata taxa armazenada como valor * 10000 para string com 4 decimais. Ex: 16500 -> "1.6500"
 *
 * @param value - Rate value scaled by 10000
 * [pt-BR] @param value - Valor da taxa escalado por 10000
 */
export function formatRate4(value: number): string {
  return (value / 10000).toFixed(4);
}

/**
 * Format cents to decimal string, returning null for null/undefined input
 *
 * [pt-BR] Formata centavos para string decimal, retornando null se a entrada for null/undefined
 *
 * @param cents - Value in cents, or null/undefined
 * [pt-BR] @param cents - Valor em centavos, ou null/undefined
 * @param decimalPlaces - Number of decimal places (default 2)
 * [pt-BR] @param decimalPlaces - Número de casas decimais (padrão 2)
 */
export function formatCentsOrNull(cents: number | undefined | null, decimalPlaces = 2): string | null {
  if (cents === undefined || cents === null) return null;
  return formatCents(cents, decimalPlaces);
}

/**
 * Format cents to decimal string, defaulting to "0.00" for null/undefined
 *
 * [pt-BR] Formata centavos para string decimal, usando "0.00" como padrão para null/undefined
 *
 * @param cents - Value in cents, or undefined
 * [pt-BR] @param cents - Valor em centavos, ou undefined
 * @param decimalPlaces - Number of decimal places (default 2)
 * [pt-BR] @param decimalPlaces - Número de casas decimais (padrão 2)
 */
export function formatCentsOrZero(cents: number | undefined, decimalPlaces = 2): string {
  if (cents == null) return (0).toFixed(decimalPlaces);
  return formatCents(cents, decimalPlaces);
}

/**
 * Format rate4 (value * 10000) to 4-decimal string, defaulting to "0.0000" for null/undefined
 *
 * [pt-BR] Formata rate4 (valor * 10000) para string com 4 decimais, usando "0.0000" como padrão para null/undefined
 *
 * @param value - Rate value scaled by 10000, or undefined
 * [pt-BR] @param value - Valor da taxa escalado por 10000, ou undefined
 */
export function formatRate4OrZero(value: number | undefined): string {
  if (value == null) return (0).toFixed(4);
  return formatRate4(value);
}

/**
 * Format a Date as ISO 8601 with Brazil timezone offset.
 * SEFAZ rejects UTC "Z" suffix -- requires explicit offset like -03:00.
 *
 * Uses state-specific offsets for AC (-05:00), AM/RO/MT/MS/RR (-04:00),
 * and -03:00 (Brasilia time) for all other states.
 *
 * [pt-BR] Formata uma Date como ISO 8601 com offset de fuso horário do Brasil.
 * SEFAZ rejeita sufixo UTC "Z" -- requer offset explícito como -03:00.
 *
 * Usa offsets por estado: AC (-05:00), AM/RO/MT/MS/RR (-04:00),
 * e -03:00 (horário de Brasília) para os demais estados.
 *
 * @param date - The date to format
 * [pt-BR] @param date - A data a ser formatada
 * @param stateCode - Optional 2-char state code for timezone offset
 * [pt-BR] @param stateCode - Código da UF opcional (2 caracteres) para offset do fuso
 */
export function formatDateTimeBR(date: Date, stateCode?: string): string {
  const offsets: Record<string, string> = {
    AC: "-05:00", AM: "-04:00", RO: "-04:00",
    RR: "-04:00", MT: "-04:00", MS: "-04:00",
  };
  const offset = (stateCode && offsets[stateCode]) || "-03:00";

  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  return `${y}-${m}-${d}T${h}:${min}:${s}${offset}`;
}
