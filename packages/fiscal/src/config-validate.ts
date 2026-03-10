/**
 * Fiscal configuration validation.
 *
 * [pt-BR] Validacao de configuracao fiscal.
 *
 * Ported from PHP sped-nfe: src/NFe/Common/Config.php
 */

/**
 * Fiscal configuration object structure.
 *
 * [pt-BR] Estrutura do objeto de configuracao fiscal.
 */
export interface FiscalConfig {
  /** Last update timestamp / [pt-BR] Timestamp da ultima atualizacao */
  atualizacao?: string | null;
  /** Tax environment: 1=production, 2=homologation / [pt-BR] Ambiente fiscal: 1=producao, 2=homologacao */
  tpAmb: number;
  /** Company legal name (lowercase key) / [pt-BR] Razao social (chave minuscula) */
  razaosocial?: string;
  /** Company legal name (camelCase key) / [pt-BR] Razao social (chave camelCase) */
  razaoSocial?: string;
  /** State abbreviation / [pt-BR] Sigla do estado */
  siglaUF: string;
  /** CNPJ or CPF / [pt-BR] CNPJ ou CPF */
  cnpj: string;
  /** XSD schema path / [pt-BR] Caminho dos schemas XSD */
  schemes: string;
  /** NFe version / [pt-BR] Versao da NFe */
  versao: string;
  /** IBPT transparency token / [pt-BR] Token de transparencia IBPT */
  tokenIBPT?: string | null;
  /** CSC token for NFC-e QR Code / [pt-BR] Token CSC para QR Code NFC-e */
  CSC?: string | null;
  /** CSC ID / [pt-BR] ID do CSC */
  CSCid?: string | null;
  /** Proxy configuration / [pt-BR] Configuracao de proxy */
  aProxyConf?: {
    proxyIp?: string | null;
    proxyPort?: string | null;
    proxyUser?: string | null;
    proxyPass?: string | null;
  } | null;
}

const REQUIRED_FIELDS = ["tpAmb", "razaosocial", "siglaUF", "cnpj", "schemes", "versao"] as const;

/**
 * Validate a fiscal configuration JSON string.
 * Returns the parsed config object on success, throws on failure.
 *
 * [pt-BR] Valida uma string JSON de configuracao fiscal.
 * Retorna o objeto de configuracao parseado em caso de sucesso, lanca erro em caso de falha.
 */
export function validate(content: string): FiscalConfig {
  if (typeof content !== "string") {
    throw new TypeError("Config input must be a JSON string.");
  }

  if (content.trim() === "") {
    throw new Error("Invalid config: empty JSON string.");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid config: not valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Invalid config: not a JSON object.");
  }

  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (field === "razaosocial") {
      // Accept either razaosocial or razaoSocial
      if (parsed.razaosocial === undefined && parsed.razaoSocial === undefined) {
        errors.push(`[${field}] is required`);
      }
    } else if (parsed[field] === undefined) {
      errors.push(`[${field}] is required`);
    }
  }

  // Validate cnpj pattern: 11-14 digits (supports both CNPJ and CPF)
  if (parsed.cnpj !== undefined) {
    const cnpj = String(parsed.cnpj);
    if (!/^[0-9]{11,14}$/.test(cnpj)) {
      errors.push("[cnpj] must be 11 to 14 digits");
    }
  }

  // Validate siglaUF length
  if (parsed.siglaUF !== undefined) {
    const uf = String(parsed.siglaUF);
    if (uf.length !== 2) {
      errors.push("[siglaUF] must be exactly 2 characters");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid config: ${errors.join("; ")}`);
  }

  return parsed as unknown as FiscalConfig;
}
