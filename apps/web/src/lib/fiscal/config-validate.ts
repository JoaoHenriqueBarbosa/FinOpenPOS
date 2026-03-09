/**
 * Fiscal configuration validation.
 * Ported from PHP sped-nfe: src/NFe/Common/Config.php
 */

export interface FiscalConfig {
  atualizacao?: string | null;
  tpAmb: number;
  razaosocial?: string;
  razaoSocial?: string;
  siglaUF: string;
  cnpj: string;
  schemes: string;
  versao: string;
  tokenIBPT?: string | null;
  CSC?: string | null;
  CSCid?: string | null;
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
