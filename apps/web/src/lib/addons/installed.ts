/**
 * Registro de addons instalados (lado servidor).
 *
 * Para instalar um addon: adicione o pacote como dependência, importe a
 * definição aqui e inclua-a em `installedAddons` (e os routers em
 * `addonRouters`). Todo o resto — schema, rotas de API, eventos, i18n,
 * seed — é descoberto pelo host via contribution points do addon-kit.
 */
import { fiscalAddon } from "@finopenpos/addon-fiscal";

export const installedAddons = [fiscalAddon] as const;

/** Routers contribuídos, mesclados na raiz do appRouter (tipagem estática). */
export const addonRouters = {
	...fiscalAddon.routers,
};
