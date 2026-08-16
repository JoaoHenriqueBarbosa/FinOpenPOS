import { EventStore } from "@finopenpos/event-sourcing";
import * as dbModule from "@/lib/db";

/**
 * Event store da aplicação, ligado à mesma instância PGlite do restante
 * do app. A resolução de `pglite` acontece a cada chamada para respeitar
 * mocks de módulo nos testes (cada arquivo de teste injeta sua instância).
 */
export const eventStore = new EventStore({
	query: (sql, params) => dbModule.pglite.query(sql, params),
});

export const STREAM = {
	product: "product",
	customer: "customer",
	order: "order",
	transaction: "transaction",
	paymentMethod: "payment_method",
} as const;

export type StreamType = (typeof STREAM)[keyof typeof STREAM];
