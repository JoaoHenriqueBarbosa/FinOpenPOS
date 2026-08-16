import type { AddonContext } from "@finopenpos/addon-kit";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type * as schema from "./schema";

/** Recorte tipado do banco do host com o schema deste addon. */
export type FiscalDb = PgliteDatabase<typeof schema>;

let context: AddonContext | null = null;

/** Chamado pelo host via setup() antes de qualquer request. */
export function setFiscalContext(ctx: AddonContext): void {
	context = ctx;
}

export function getFiscalContext(): AddonContext {
	if (!context) {
		throw new Error(
			"Addon fiscal não inicializado — o host precisa chamar setup(ctx) no boot",
		);
	}
	return context;
}

export function getDb(): FiscalDb {
	return getFiscalContext().db as FiscalDb;
}

/**
 * Proxy lazy sobre o banco do host: resolve a instância a cada acesso,
 * permitindo que repositórios/routers usem `db.…` diretamente enquanto a
 * injeção real acontece no setup() (e nos testes, com um banco de teste).
 */
export const db: FiscalDb = new Proxy({} as FiscalDb, {
	get(_target, prop) {
		return (getDb() as unknown as Record<PropertyKey, unknown>)[prop];
	},
});
