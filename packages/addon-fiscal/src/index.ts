import { defineAddon } from "@finopenpos/addon-kit";
import { setFiscalContext } from "./context";
import { fiscalMessages } from "./messages";
import { fiscalRouters } from "./routers";
import { fiscalTables } from "./schema";
import { seedFiscal } from "./seed";

/**
 * Addon fiscal (NF-e / NFC-e) — primeiro addon nativo do FinOpenPOS.
 *
 * Contribui: routers tRPC (fiscal, fiscalSettings, cities), schema próprio,
 * mensagens i18n, seed de referência (municípios IBGE) e UI admin (ver
 * `@finopenpos/addon-fiscal/ui`). Depende apenas do contrato do addon-kit —
 * nenhum import de internals do host.
 */
export const fiscalAddon = defineAddon({
	manifest: {
		id: "fiscal",
		name: "Fiscal (NF-e / NFC-e)",
		version: "1.0.0",
		description:
			"Emissão de notas fiscais eletrônicas brasileiras com comunicação SEFAZ, contingência e certificado A1",
		publisher: "finopenpos",
	},
	routers: fiscalRouters,
	tables: fiscalTables,
	messages: fiscalMessages,
	setup(ctx) {
		setFiscalContext(ctx);
	},
	seed: seedFiscal,
});

export { type FiscalRouter, fiscalRouters } from "./routers";
export * from "./schema";
