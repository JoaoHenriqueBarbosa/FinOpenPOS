import { router } from "@finopenpos/api";
import { citiesRouter } from "./cities";
import { fiscalRouter } from "./fiscal";
import { fiscalSettingsRouter } from "./fiscal-settings";

/** Routers contribuídos ao appRouter do host (chaves = namespaces na raiz). */
export const fiscalRouters = {
	fiscal: fiscalRouter,
	fiscalSettings: fiscalSettingsRouter,
	cities: citiesRouter,
};

/**
 * Router agregado usado SOMENTE para tipagem do cliente tRPC no lado UI
 * (`import type` — nunca importado em runtime pelo cliente).
 */
export const fiscalRouterForTypes = router(fiscalRouters);
export type FiscalRouter = typeof fiscalRouterForTypes;
