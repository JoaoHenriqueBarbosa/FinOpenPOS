"use client";

/**
 * Registro de addons instalados (lado cliente).
 * Contribuições de UI: itens de navegação do admin e páginas sob /admin.
 */
import { fiscalAddonUI } from "@finopenpos/addon-fiscal/ui";
import type { AddonUIDefinition } from "@finopenpos/addon-kit/ui";

export const installedAddonUIs: readonly AddonUIDefinition[] = [fiscalAddonUI];
