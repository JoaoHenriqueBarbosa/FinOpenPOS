import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { foldStream, foldStreams } from "../fold";
import { EventStore } from "../store";
import { ConcurrencyError, type DomainEvent, type StoredEvent } from "../types";

type ProductEvent =
	| DomainEvent<"ProductCreated", { name: string; price: number }>
	| DomainEvent<"ProductPriceChanged", { price: number }>
	| DomainEvent<"ProductDeleted", Record<string, never>>;

interface Product {
	name: string;
	price: number;
}

function productReducer(
	state: Product | undefined,
	event: StoredEvent<ProductEvent>,
): Product | undefined {
	switch (event.type) {
		case "ProductCreated":
			return event.data as Product;
		case "ProductPriceChanged":
			return state ? { ...state, ...(event.data as { price: number }) } : state;
		case "ProductDeleted":
			return undefined;
		default:
			return state;
	}
}

const pg = new PGlite();
const store = new EventStore(pg);

beforeAll(async () => {
	await store.ensureSchema();
});

afterAll(async () => {
	await pg.close();
});

describe("EventStore", () => {
	it("appends and reads back a stream in order", async () => {
		const id = await store.nextStreamId("product");
		expect(id).toBe(1);

		await store.append<ProductEvent>({
			streamType: "product",
			streamId: id,
			expectedVersion: 0,
			userUid: "u1",
			events: [
				{ type: "ProductCreated", data: { name: "Coke", price: 500 } },
				{ type: "ProductPriceChanged", data: { price: 600 } },
			],
		});

		const events = await store.readStream<ProductEvent>("product", id);
		expect(events.map((e) => e.type)).toEqual([
			"ProductCreated",
			"ProductPriceChanged",
		]);
		expect(events.map((e) => e.version)).toEqual([1, 2]);

		const { state, version } = foldStream(events, productReducer);
		expect(state).toEqual({ name: "Coke", price: 600 });
		expect(version).toBe(2);
	});

	it("rejects appends with stale expectedVersion (optimistic concurrency)", async () => {
		const id = await store.nextStreamId("product");
		await store.append<ProductEvent>({
			streamType: "product",
			streamId: id,
			expectedVersion: 0,
			userUid: "u1",
			events: [{ type: "ProductCreated", data: { name: "Fanta", price: 400 } }],
		});

		await expect(
			store.append<ProductEvent>({
				streamType: "product",
				streamId: id,
				expectedVersion: 0, // stale: já existe version 1
				userUid: "u1",
				events: [{ type: "ProductPriceChanged", data: { price: 999 } }],
			}),
		).rejects.toBeInstanceOf(ConcurrencyError);
	});

	it("rebuilds read models with foldStreams and drops deleted streams", async () => {
		const a = await store.nextStreamId("gadget");
		await store.append<ProductEvent>({
			streamType: "gadget",
			streamId: a,
			expectedVersion: 0,
			userUid: "u2",
			events: [{ type: "ProductCreated", data: { name: "A", price: 1 } }],
		});
		const b = await store.nextStreamId("gadget");
		await store.append<ProductEvent>({
			streamType: "gadget",
			streamId: b,
			expectedVersion: 0,
			userUid: "u2",
			events: [{ type: "ProductCreated", data: { name: "B", price: 2 } }],
		});
		await store.append<ProductEvent>({
			streamType: "gadget",
			streamId: a,
			expectedVersion: 1,
			userUid: "u2",
			events: [{ type: "ProductDeleted", data: {} }],
		});

		const all = await store.readAll<ProductEvent>(["gadget"], {
			userUid: "u2",
		});
		const state = foldStreams(all, productReducer);
		expect(state.size).toBe(1);
		expect(state.get(b)).toEqual({ name: "B", price: 2 });
	});

	it("scopes readAll by user and supports time-travel via toGlobalSeq", async () => {
		const id = await store.nextStreamId("widget");
		const [created0] = await store.append<ProductEvent>({
			streamType: "widget",
			streamId: id,
			expectedVersion: 0,
			userUid: "owner",
			events: [{ type: "ProductCreated", data: { name: "W", price: 10 } }],
		});
		const created = created0!;
		await store.append<ProductEvent>({
			streamType: "widget",
			streamId: id,
			expectedVersion: 1,
			userUid: "owner",
			events: [{ type: "ProductPriceChanged", data: { price: 20 } }],
		});

		const other = await store.readAll<ProductEvent>(["widget"], {
			userUid: "someone-else",
		});
		expect(other).toEqual([]);

		const past = await store.readAll<ProductEvent>(["widget"], {
			userUid: "owner",
			toGlobalSeq: created.globalSeq,
		});
		const { state } = foldStream(past, productReducer);
		expect(state).toEqual({ name: "W", price: 10 });
	});

	it("preserves occurredAt override (seeds/imports)", async () => {
		const when = new Date("2024-01-15T12:00:00.000Z");
		const id = await store.nextStreamId("thing");
		const [e0] = await store.append<ProductEvent>({
			streamType: "thing",
			streamId: id,
			expectedVersion: 0,
			userUid: "u3",
			occurredAt: when,
			events: [{ type: "ProductCreated", data: { name: "T", price: 5 } }],
		});
		expect(e0!.occurredAt.toISOString()).toBe(when.toISOString());
	});
});
