import type { StoredEvent } from "@finopenpos/event-sourcing";
import type { AddonContext, AddonDefinition, AddonMessages } from "./types";

/** Valida manifests e detecta colisões de id e de chaves de router. */
export function validateAddons(addons: readonly AddonDefinition[]): void {
	const ids = new Set<string>();
	const routerKeys = new Map<string, string>();

	for (const addon of addons) {
		const { id } = addon.manifest;
		if (!/^[a-z][a-z0-9-]*$/.test(id)) {
			throw new Error(`Addon id inválido: "${id}" (use kebab-case)`);
		}
		if (ids.has(id)) throw new Error(`Addon duplicado: "${id}"`);
		ids.add(id);

		for (const key of Object.keys(addon.routers)) {
			const owner = routerKeys.get(key);
			if (owner) {
				throw new Error(
					`Colisão de router "${key}" entre addons "${owner}" e "${id}"`,
				);
			}
			routerKeys.set(key, id);
		}
	}
}

/** Executa setup() de todos os addons, em ordem de instalação. */
export async function setupAddons(
	addons: readonly AddonDefinition[],
	ctx: AddonContext,
): Promise<void> {
	validateAddons(addons);
	for (const addon of addons) {
		await addon.setup?.(ctx);
	}
}

/** Executa seed() de todos os addons que o declaram. */
export async function seedAddons(
	addons: readonly AddonDefinition[],
	ctx: AddonContext,
): Promise<void> {
	for (const addon of addons) {
		await addon.seed?.(ctx);
	}
}

/**
 * Dispatcher de eventos de domínio → assinaturas de addons.
 *
 * Entrega in-process, at-most-once. Falha de um handler é logada e NÃO
 * propaga: um addon quebrado não pode derrubar um comando do core nem
 * afetar outros addons.
 */
export function createAddonDispatcher(
	addons: readonly AddonDefinition[],
	getCtx: () => AddonContext | null,
): (events: StoredEvent[]) => Promise<void> {
	const subscriptions = addons.flatMap((addon) =>
		(addon.subscriptions ?? []).map((sub) => ({
			addonId: addon.manifest.id,
			sub,
		})),
	);

	return async (events: StoredEvent[]) => {
		const ctx = getCtx();
		if (!ctx || subscriptions.length === 0 || events.length === 0) return;

		for (const { addonId, sub } of subscriptions) {
			const matched = events.filter(
				(e) =>
					(!sub.streamTypes || sub.streamTypes.includes(e.streamType)) &&
					(!sub.eventTypes || sub.eventTypes.includes(e.type)),
			);
			if (matched.length === 0) continue;
			try {
				await sub.handler(matched, ctx);
			} catch (err) {
				ctx.logger.error(
					`[addon:${addonId}] subscription "${sub.name}" falhou`,
					err,
				);
			}
		}
	};
}

/** Deep-merge das mensagens i18n dos addons sobre as mensagens do host. */
export function mergeAddonMessages(
	base: Record<string, unknown>,
	addons: readonly AddonDefinition[],
	locale: string,
): Record<string, unknown> {
	let merged = base;
	for (const addon of addons) {
		const messages = (addon.messages as AddonMessages | undefined)?.[locale];
		if (messages) merged = deepMerge(merged, messages);
	}
	return merged;
}

function deepMerge(
	base: Record<string, unknown>,
	extra: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(extra)) {
		const existing = out[key];
		if (isPlainObject(existing) && isPlainObject(value)) {
			out[key] = deepMerge(existing, value);
		} else {
			out[key] = value;
		}
	}
	return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
