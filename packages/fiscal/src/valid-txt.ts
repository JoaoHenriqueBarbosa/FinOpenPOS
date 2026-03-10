/**
 * TXT validation for NFe.
 *
 * [pt-BR] Validacao de TXT para NFe.
 *
 * Ported from PHP: NFePHP\NFe\Common\ValidTXT
 */

import { getStructure } from "./txt-structures";

/** Standard LOCAL layout / [pt-BR] Layout LOCAL padrao */
export const LAYOUT_LOCAL = "LOCAL";
/** LOCAL v1.2 layout / [pt-BR] Layout LOCAL v1.2 */
export const LAYOUT_LOCAL_V12 = "LOCAL_V12";
/** LOCAL v1.3 layout / [pt-BR] Layout LOCAL v1.3 */
export const LAYOUT_LOCAL_V13 = "LOCAL_V13";
/** SEBRAE layout / [pt-BR] Layout SEBRAE */
export const LAYOUT_SEBRAE = "SEBRAE";

/**
 * Load the TXT structure definition for the given version and layout.
 *
 * [pt-BR] Carrega a definicao de estrutura TXT para a versao e layout informados.
 */
export function loadStructure(
  version: number = 4.0,
  baseLayout: string = LAYOUT_LOCAL
): Record<string, string> {
  return getStructure(version, baseLayout);
}

/**
 * Validate a TXT representation of an NFe.
 * Returns an empty array if valid, or an array of error strings if invalid.
 *
 * [pt-BR] Valida uma representacao TXT de NFe.
 * Retorna array vazio se valido, ou array de strings de erro se invalido.
 */
export function isValidTxt(
  txt: string,
  baseLayout: string = LAYOUT_LOCAL
): string[] {
  const errors: string[] = [];
  txt = txt.replace(/[\r\t]/g, "").trim();
  const rows = txt.split("\n");
  let num = 0;
  let entities: Record<string, string> | null = null;

  for (const row of rows) {
    if (!row) continue;

    const fields = row.split("|");
    const ref = fields[0].toUpperCase();
    if (!ref) continue;
    if (ref === "NOTAFISCAL") continue;

    if (ref === "A") {
      num = 0;
      entities = loadStructure(parseFloat(fields[1]), baseLayout);
    }
    if (ref === "I") {
      num += 1;
    }

    const lastChar = row.charAt(row.length - 1);
    if (lastChar !== "|") {
      let char = "";
      if (lastChar === " ") {
        char = "[ESP]";
      } else if (lastChar === "\r") {
        char = "[CR]";
      } else if (lastChar === "\t") {
        char = "[TAB]";
      }
      const nrow = row.replace(/[\r\t]/g, "").trim();
      errors.push(
        `ERRO: (${num}) Todas as linhas devem terminar com 'pipe' e n\u00e3o ${char}. [${nrow}]`
      );
      continue;
    }

    if (!entities) {
      errors.push("ERRO: O TXT n\u00e3o cont\u00eam um marcador A");
      return errors;
    }

    if (!(ref in entities)) {
      errors.push(
        `ERRO: (${num}) Essa refer\u00eancia n\u00e3o est\u00e1 definida. [${row}]`
      );
      continue;
    }

    const count = fields.length - 1;
    const defaultCount = entities[ref].split("|").length - 1;
    if (defaultCount !== count) {
      errors.push(
        `ERRO: (${num}) O n\u00famero de par\u00e2metros na linha est\u00e1 errado (esperado #${defaultCount}) -> (encontrado #${count}). [ ${row} ] Esperado [ ${entities[ref]} ]`
      );
      continue;
    }

    for (const field of fields) {
      if (!field) continue;
      if (!field.trim()) {
        errors.push(
          `ERRO: (${num}) Existem apenas espa\u00e7os no campo dos dados. [${row}]`
        );
        continue;
      }

      // Check for forbidden special characters
      const newField = field.replace(/[><"'\t\r]/g, "");
      if (field !== newField) {
        errors.push(
          `ERRO: (${num}) Existem caracteres especiais n\u00e3o permitidos, como por ex. caracteres de controle, sinais de maior ou menor, aspas ou apostrofes, na entidade [${escapeHtml(row)}]`
        );
        continue;
      }

      // Check for non-UTF-8 characters (control chars)
      const cleaned = field.replace(
        // eslint-disable-next-line no-control-regex
        /[\x00-\x08\x10\x0B\x0C\x0E-\x19\x7F]/g,
        "?"
      );
      if (field !== cleaned) {
        errors.push(
          `ERRO: (${num}) Existem caracteres n\u00e3o UTF-8, n\u00e3o permitidos, no campo [${escapeHtml(cleaned)}]`
        );
        continue;
      }
    }
  }

  return errors;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
