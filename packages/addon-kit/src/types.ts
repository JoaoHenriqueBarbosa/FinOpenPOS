/**
 * Contratos do sistema de addons (arquitetura microkernel).
 *
 * O core (host) fornece um conjunto mínimo de serviços via `AddonContext` e
 * pontos de contribuição declarativos; addons são módulos independentes que
 * implementam `AddonDefinition` (lado servidor) e, opcionalmente,
 * `AddonUIDefinition` (lado cliente — ver ./ui.tsx).
 *
 * Princípios (padrão da indústria — VS Code / Medusa / Payload):
 *  - Contribution points declarativos: routers, schema, eventos, nav, páginas,
 *    mensagens i18n e seed — o host descobre tudo pelo manifest, sem
 *    conhecer nenhum addon específico.
 *  - Contrato estável: addons dependem apenas de `@finopenpos/addon-kit`
 *    (tipos + host API), nunca de internals do host.
 *  - Injeção de dependência: o host injeta `AddonContext` em `setup()`;
 *    o addon nunca importa singletons do host.
 *  - Isolamento de falhas: handlers de eventos de addon não podem derrubar
 *    comandos do core (ver dispatcher em ./registry.ts).
 */
import type { EventStore, StoredEvent } from "@finopenpos/event-sourcing";
import type { AnyTRPCRouter } from "@trpc/server";
import type { PgTable } from "drizzle-orm/pg-core";

// ── Manifest ────────────────────────────────────────────────────────────────
export interface AddonManifest {
	/** Identificador único, kebab-case (ex.: "fiscal"). */
	id: string;
	name: string;
	version: string;
	description: string;
	publisher?: string;
}

// ── Host services (injetados) ───────────────────────────────────────────────
export interface AddonLogger {
	info(message: string, ...args: unknown[]): void;
	warn(message: string, ...args: unknown[]): void;
	error(message: string, ...args: unknown[]): void;
}

/**
 * Banco do host (Drizzle sobre PGlite). O schema completo é a composição
 * core + addons; cada addon deve fazer cast para o seu recorte tipado:
 * `const db = ctx.db as MyAddonDb`.
 */
// biome-ignore lint/suspicious/noExplicitAny: recorte tipado é responsabilidade do addon
export type AddonDatabase = any;

/**
 * Host API v1 — superfície estável que o core expõe para addons lerem os
 * domínios operacionais (event-sourced). Análoga ao módulo `vscode` das
 * extensões do VS Code: é o ÚNICO acoplamento permitido com o domínio do
 * host, e é versionada com compatibilidade retroativa.
 */
export interface HostApi {
	/** Pedido com itens e produtos resolvidos (reconstruído do event log). */
	loadOrderWithItems(
		orderId: number,
		userUid: string,
	): Promise<HostOrderWithItems | undefined>;
}

export interface HostOrderItemWithProduct {
	id: number;
	order_id: number;
	product_id: number | null;
	quantity: number;
	price: number;
	product: HostProduct | null;
}

export interface HostProduct {
	id: number;
	name: string;
	description: string | null;
	price: number;
	in_stock: number;
	category: string | null;
	ncm: string | null;
	cfop: string | null;
	icms_cst: string | null;
	pis_cst: string | null;
	cofins_cst: string | null;
	unit_of_measure: string | null;
}

export interface HostOrderWithItems {
	id: number;
	customer_id: number | null;
	total_amount: number;
	status: string | null;
	user_uid: string;
	created_at: Date;
	orderItems: HostOrderItemWithProduct[];
}

export interface AddonContext {
	db: AddonDatabase;
	/** Event store do host — leitura de streams e append em streams do addon. */
	eventStore: EventStore;
	api: HostApi;
	logger: AddonLogger;
}

// ── Contribution points ─────────────────────────────────────────────────────
/**
 * Assinatura de eventos de domínio: o handler roda após cada append que
 * casar com os filtros. Entrega in-process, at-most-once, com isolamento de
 * falhas (erros são logados, nunca propagados ao comando que gerou o fato).
 */
export interface EventSubscription {
	name: string;
	/** Sem filtro = todos os stream types. */
	streamTypes?: string[];
	/** Sem filtro = todos os event types. */
	eventTypes?: string[];
	handler(events: StoredEvent[], ctx: AddonContext): void | Promise<void>;
}

/** Mensagens i18n por locale, mescladas (deep) nas mensagens do host. */
export type AddonMessages = Record<string, Record<string, unknown>>;

// ── Definição (lado servidor) ───────────────────────────────────────────────
export interface AddonDefinition<
	TRouters extends Record<string, AnyTRPCRouter> = Record<
		string,
		AnyTRPCRouter
	>,
> {
	manifest: AddonManifest;
	/**
	 * Routers tRPC contribuídos, mesclados na raiz do appRouter do host
	 * (chaves colidentes são rejeitadas no boot). O contrato OpenAPI dos
	 * procedures é publicado automaticamente.
	 */
	routers: TRouters;
	/** Tabelas próprias (Drizzle), em ordem FK-safe. Migradas pelo host. */
	tables?: PgTable[];
	subscriptions?: EventSubscription[];
	messages?: AddonMessages;
	/** Chamado uma vez no boot do host, antes de qualquer request. */
	setup?(ctx: AddonContext): void | Promise<void>;
	/** Popular dados iniciais/referência (chamado pelo seed do host). */
	seed?(ctx: AddonContext): void | Promise<void>;
}

/** Helper de identidade que preserva a inferência dos routers. */
export function defineAddon<TRouters extends Record<string, AnyTRPCRouter>>(
	addon: AddonDefinition<TRouters>,
): AddonDefinition<TRouters> {
	return addon;
}
