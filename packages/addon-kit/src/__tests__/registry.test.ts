import { describe, expect, it } from "bun:test";
import type { StoredEvent } from "@finopenpos/event-sourcing";
import {
	createAddonDispatcher,
	mergeAddonMessages,
	validateAddons,
} from "../registry";
import type { AddonContext, AddonDefinition } from "../types";
import { matchAddonPage } from "../ui";

function makeAddon(id: string, routerKeys: string[] = []): AddonDefinition {
	return {
		manifest: { id, name: id, version: "1.0.0", description: id },
		routers: Object.fromEntries(
			routerKeys.map((k) => [k, {} as never]),
		) as AddonDefinition["routers"],
	};
}

function makeEvent(streamType: string, type: string): StoredEvent {
	return {
		globalSeq: 1,
		streamType,
		streamId: 1,
		version: 1,
		type,
		data: {},
		userUid: "u1",
		occurredAt: new Date(),
	};
}

const fakeCtx = {
	db: {},
	eventStore: {} as never,
	api: {} as never,
	logger: { info() {}, warn() {}, error() {} },
} satisfies AddonContext;

describe("validateAddons", () => {
	it("accepts unique ids and router keys", () => {
		expect(() =>
			validateAddons([makeAddon("a", ["x"]), makeAddon("b", ["y"])]),
		).not.toThrow();
	});

	it("rejects duplicate addon ids", () => {
		expect(() => validateAddons([makeAddon("a"), makeAddon("a")])).toThrow(
			/duplicado/,
		);
	});

	it("rejects router key collisions across addons", () => {
		expect(() =>
			validateAddons([makeAddon("a", ["shared"]), makeAddon("b", ["shared"])]),
		).toThrow(/Colisão de router "shared"/);
	});

	it("rejects invalid ids (not kebab-case)", () => {
		expect(() => validateAddons([makeAddon("Not_Valid")])).toThrow(/inválido/);
	});
});

describe("createAddonDispatcher", () => {
	it("delivers only matching events and isolates handler failures", async () => {
		const received: string[] = [];
		const addon: AddonDefinition = {
			...makeAddon("sub"),
			subscriptions: [
				{
					name: "orders-only",
					streamTypes: ["order"],
					handler(events) {
						received.push(...events.map((e) => e.type));
					},
				},
				{
					name: "explodes",
					handler() {
						throw new Error("boom");
					},
				},
			],
		};

		const dispatch = createAddonDispatcher([addon], () => fakeCtx);
		// não deve lançar apesar do handler "explodes" falhar
		await dispatch([
			makeEvent("order", "OrderPlaced"),
			makeEvent("product", "ProductCreated"),
		]);

		expect(received).toEqual(["OrderPlaced"]);
	});

	it("is a no-op before the host context is ready", async () => {
		let called = false;
		const addon: AddonDefinition = {
			...makeAddon("early"),
			subscriptions: [{ name: "s", handler: () => void (called = true) }],
		};
		const dispatch = createAddonDispatcher([addon], () => null);
		await dispatch([makeEvent("order", "OrderPlaced")]);
		expect(called).toBe(false);
	});
});

describe("mergeAddonMessages", () => {
	it("deep-merges addon messages into the host namespace", () => {
		const addon: AddonDefinition = {
			...makeAddon("i18n"),
			messages: {
				en: { nav: { invoices: "Invoices" }, fiscal: { title: "Invoices" } },
			},
		};
		const merged = mergeAddonMessages(
			{ nav: { dashboard: "Dashboard" } },
			[addon],
			"en",
		);
		expect(merged).toEqual({
			nav: { dashboard: "Dashboard", invoices: "Invoices" },
			fiscal: { title: "Invoices" },
		});
	});
});

describe("matchAddonPage", () => {
	const Page = () => null;
	const uis = [
		{
			addonId: "fiscal",
			pages: [
				{ pattern: "fiscal", component: Page },
				{ pattern: "fiscal/settings", component: Page },
				{ pattern: "fiscal/:id", component: Page },
			],
		},
	];

	it("matches literal segments (order of declaration wins)", () => {
		expect(matchAddonPage(uis, ["fiscal"])?.page.pattern).toBe("fiscal");
		expect(matchAddonPage(uis, ["fiscal", "settings"])?.page.pattern).toBe(
			"fiscal/settings",
		);
	});

	it("extracts :params", () => {
		const match = matchAddonPage(uis, ["fiscal", "42"]);
		expect(match?.page.pattern).toBe("fiscal/:id");
		expect(match?.params).toEqual({ id: "42" });
	});

	it("returns null when nothing matches", () => {
		expect(matchAddonPage(uis, ["unknown"])).toBeNull();
		expect(matchAddonPage(uis, ["fiscal", "42", "extra"])).toBeNull();
	});
});
