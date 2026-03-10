import type { EmissionType } from "./types";

/**
 * Contingency configuration class.
 *
 * [pt-BR] Classe de configuracao de contingencia.
 *
 * Ported from PHP NFePHP\NFe\Factories\Contingency.
 * Manages contingency mode activation/deactivation for NF-e/NFC-e emission.
 */

/**
 * Contingency type name: SVCAN, SVCRS, or empty (normal mode).
 *
 * [pt-BR] Nome do tipo de contingencia: SVCAN, SVCRS ou vazio (modo normal).
 */
export type ContingencyTypeName = "SVCAN" | "SVCRS" | "";

/**
 * Contingency configuration data.
 *
 * [pt-BR] Dados de configuracao de contingencia.
 */
export interface ContingencyConfig {
  /** Justification for entering contingency mode / [pt-BR] Justificativa para entrar em contingencia */
  motive: string;
  /** Unix timestamp when contingency was activated / [pt-BR] Timestamp Unix da ativacao da contingencia */
  timestamp: number;
  /** Contingency type name / [pt-BR] Nome do tipo de contingencia */
  type: ContingencyTypeName;
  /** Emission type code / [pt-BR] Codigo do tipo de emissao */
  tpEmis: EmissionType;
}

/** State -> default contingency type mapping */
const STATE_CONTINGENCY_TYPE: Record<string, ContingencyTypeName> = {
  AC: "SVCAN", AL: "SVCAN", AM: "SVCRS", AP: "SVCAN",
  BA: "SVCRS", CE: "SVCAN", DF: "SVCAN", ES: "SVCAN",
  GO: "SVCRS", MA: "SVCRS", MG: "SVCAN", MS: "SVCRS",
  MT: "SVCRS", PA: "SVCAN", PB: "SVCAN", PE: "SVCRS",
  PI: "SVCAN", PR: "SVCRS", RJ: "SVCAN", RN: "SVCAN",
  RO: "SVCAN", RR: "SVCAN", RS: "SVCAN", SC: "SVCAN",
  SE: "SVCAN", SP: "SVCAN", TO: "SVCAN",
};

function tpEmisFromType(type: ContingencyTypeName): EmissionType {
  switch (type) {
    case "SVCAN":
      return 6;
    case "SVCRS":
      return 7;
    default:
      return 1;
  }
}

/**
 * Manages NF-e/NFC-e contingency mode activation and deactivation.
 *
 * [pt-BR] Gerencia ativacao e desativacao do modo de contingencia NF-e/NFC-e.
 */
export class Contingency {
  /** Current contingency type / [pt-BR] Tipo de contingencia atual */
  public type: ContingencyTypeName = "";
  /** Justification motive / [pt-BR] Motivo da justificativa */
  public motive: string = "";
  /** Activation timestamp / [pt-BR] Timestamp da ativacao */
  public timestamp: number = 0;
  /** Emission type code / [pt-BR] Codigo do tipo de emissao */
  public tpEmis: EmissionType = 1;

  constructor(json?: string) {
    this.deactivate();
    if (json && json.length > 0) {
      this.load(json);
    }
  }

  /**
   * Load contingency configuration from a JSON string.
   *
   * [pt-BR] Carrega configuracao de contingencia a partir de uma string JSON.
   */
  load(json: string): void {
    const config: ContingencyConfig = JSON.parse(json);
    this.type = config.type;
    this.timestamp = config.timestamp;
    this.motive = config.motive;
    this.tpEmis = config.tpEmis;
  }

  /**
   * Activate contingency mode for the given state.
   *
   * [pt-BR] Ativa o modo de contingencia para o estado informado.
   *
   * @param acronym - State abbreviation (e.g. "SP", "RS")
   * @param motive - Justification (15-255 UTF-8 characters)
   * @param forcedType - Optional override: "SVCAN" or "SVCRS"
   * @returns JSON string with the contingency configuration
   */
  activate(acronym: string, motive: string, forcedType?: string): string {
    let type: ContingencyTypeName;

    if (forcedType && forcedType.length > 0) {
      const normalized = forcedType.toUpperCase().replace(/-/g, "") as ContingencyTypeName;
      if (normalized !== "SVCAN" && normalized !== "SVCRS") {
        throw new Error(
          "The indicated contingency type is not accepted in this operation. Use only SVCAN or SVCRS"
        );
      }
      type = normalized;
    } else {
      type = STATE_CONTINGENCY_TYPE[acronym];
      if (!type) {
        throw new Error(`Unknown state acronym: ${acronym}`);
      }
    }

    const trimmedMotive = motive.trim();
    const len = trimmedMotive.length;
    if (len < 15 || len > 255) {
      throw new Error(
        "The justification for entering contingency mode must be between 15 and 256 UTF-8 characters."
      );
    }

    // Generate GMT timestamp (matching PHP's gmdate behavior)
    this.timestamp = Math.floor(Date.now() / 1000);
    this.motive = trimmedMotive;
    this.type = type;
    this.tpEmis = tpEmisFromType(type);

    return this.toString();
  }

  /**
   * Deactivate contingency mode (reset to normal emission).
   *
   * [pt-BR] Desativa o modo de contingencia (retorna a emissao normal).
   */
  deactivate(): string {
    this.timestamp = 0;
    this.motive = "";
    this.type = "";
    this.tpEmis = 1;
    return this.toString();
  }

  /**
   * Return a JSON string representation of the current contingency config.
   *
   * [pt-BR] Retorna representacao JSON da configuracao de contingencia atual.
   */
  toString(): string {
    const config: ContingencyConfig = {
      motive: this.motive,
      timestamp: this.timestamp,
      type: this.type,
      tpEmis: this.tpEmis,
    };
    return JSON.stringify(config);
  }
}
