import type { AddonContext } from "@finopenpos/addon-kit";
import {
	createAddonDispatcher,
	seedAddons,
	setupAddons,
} from "@finopenpos/addon-kit";
import type { StoredEvent } from "@finopenpos/event-sourcing";
import { hostApi } from "./host-api";
import { installedAddons } from "./installed";

let context: AddonContext | null = null;
let booted = false;

/**
 * Monta o AddonContext e roda setup() de todos os addons instalados.
 * Idempotente — chamado no boot do servidor (instrumentation) e nos testes.
 */
export async function bootAddons(): Promise<AddonContext> {
	const { db } = await import("@/lib/db");
	const { eventStore } = await import("@/lib/es");

	context = {
		db,
		eventStore,
		api: hostApi,
		logger: console,
	};

	if (!booted) {
		await setupAddons(installedAddons, context);
		booted = true;
	} else {
		// re-boot (testes trocam o banco via mock): re-injeta o contexto
		for (const addon of installedAddons) await addon.setup?.(context);
	}
	return context;
}

export async function seedInstalledAddons(): Promise<void> {
	const ctx = context ?? (await bootAddons());
	await seedAddons(installedAddons, ctx);
}

/** Dispatcher de eventos → assinaturas de addons (ligado ao EventStore). */
export const dispatchAddonEvents: (events: StoredEvent[]) => Promise<void> =
	createAddonDispatcher(installedAddons, () => context);
