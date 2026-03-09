import type { EmissionType } from "./types";

/**
 * Contingency configuration class.
 *
 * Ported from PHP NFePHP\NFe\Factories\Contingency.
 * Manages contingency mode activation/deactivation for NF-e/NFC-e emission.
 */

export type ContingencyTypeName = "SVCAN" | "SVCRS" | "";

export interface ContingencyConfig {
  motive: string;
  timestamp: number;
  type: ContingencyTypeName;
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

export class Contingency {
  public type: ContingencyTypeName = "";
  public motive: string = "";
  public timestamp: number = 0;
  public tpEmis: EmissionType = 1;

  constructor(json?: string) {
    this.deactivate();
    if (json && json.length > 0) {
      this.load(json);
    }
  }

  /**
   * Load contingency configuration from a JSON string.
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
