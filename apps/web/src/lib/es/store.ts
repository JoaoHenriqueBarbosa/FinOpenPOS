import { EventStore } from "@finopenpos/event-sourcing";
import * as dbModule from "@/lib/db";

/**
 * Event store da aplicação, ligado à mesma instância PGlite do restante
 * do app. A resolução de `pglite` acontece a cada chamada para respeitar
 * mocks de módulo nos testes (cada arquivo de teste injeta sua instância).
 *
 * `onAppended` encaminha cada append ao dispatcher de addons (assinaturas
 * de eventos de domínio) — import dinâmico e chamada lazy para evitar ciclo
 * de módulos e manter o custo zero quando não há assinaturas.
 */
export const eventStore = new EventStore(
	{
		query: (sql, params) => dbModule.pglite.query(sql, params),
	},
	{
		onAppended: async (events) => {
			const { dispatchAddonEvents } = await import("@/lib/addons/bootstrap");
			await dispatchAddonEvents(events);
		},
	},
);

export const STREAM = {
	product: "product",
	customer: "customer",
	order: "order",
	transaction: "transaction",
	paymentMethod: "payment_method",
} as const;

export type StreamType = (typeof STREAM)[keyof typeof STREAM];
