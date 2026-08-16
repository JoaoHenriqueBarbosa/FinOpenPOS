import type { DomainEvent, StoredEvent } from "@finopenpos/event-sourcing";
import { foldStream, foldStreams } from "@finopenpos/event-sourcing";
import { eventStore, STREAM } from "./store";

// ── Eventos ─────────────────────────────────────────────────────────────────
export interface ProductCreatedData {
	name: string;
	description?: string;
	price: number;
	in_stock: number;
	category?: string;
	ncm?: string;
	cfop?: string;
	icms_cst?: string;
	pis_cst?: string;
	cofins_cst?: string;
	unit_of_measure?: string;
}

export type ProductUpdatedData = Partial<ProductCreatedData>;

export type ProductEvent =
	| DomainEvent<"ProductCreated", ProductCreatedData>
	| DomainEvent<"ProductUpdated", ProductUpdatedData>
	| DomainEvent<"ProductDeleted", Record<string, never>>;

// ── Estado (mesma forma do contrato da API) ─────────────────────────────────
export interface Product {
	id: number;
	name: string;
	description: string | null;
	price: number;
	in_stock: number;
	category: string | null;
	user_uid: string;
	ncm: string | null;
	cfop: string | null;
	icms_cst: string | null;
	pis_cst: string | null;
	cofins_cst: string | null;
	unit_of_measure: string | null;
	created_at: Date;
}

function definedOnly<T extends object>(data: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(data).filter(([, v]) => v !== undefined),
	) as Partial<T>;
}

export function productReducer(
	state: Product | undefined,
	event: StoredEvent<ProductEvent>,
): Product | undefined {
	switch (event.type) {
		case "ProductCreated": {
			const d = event.data as ProductCreatedData;
			return {
				id: event.streamId,
				name: d.name,
				description: d.description ?? null,
				price: d.price,
				in_stock: d.in_stock,
				category: d.category ?? null,
				user_uid: event.userUid,
				ncm: d.ncm ?? null,
				cfop: d.cfop ?? null,
				icms_cst: d.icms_cst ?? null,
				pis_cst: d.pis_cst ?? null,
				cofins_cst: d.cofins_cst ?? null,
				unit_of_measure: d.unit_of_measure ?? "UN",
				created_at: event.occurredAt,
			};
		}
		case "ProductUpdated":
			return state
				? { ...state, ...definedOnly(event.data as ProductUpdatedData) }
				: state;
		case "ProductDeleted":
			return undefined;
		default:
			return state;
	}
}

// ── Projeções (estado sempre reconstruído dos eventos) ──────────────────────
export async function listProducts(userUid: string): Promise<Product[]> {
	const events = await eventStore.readAll<ProductEvent>([STREAM.product], {
		userUid,
	});
	return [...foldStreams(events, productReducer).values()];
}

export async function productMap(
	userUid: string,
): Promise<Map<number, Product>> {
	const events = await eventStore.readAll<ProductEvent>([STREAM.product], {
		userUid,
	});
	return foldStreams(events, productReducer);
}

export async function loadProduct(
	id: number,
): Promise<{ state: Product | undefined; version: number }> {
	const events = await eventStore.readStream<ProductEvent>(STREAM.product, id);
	return foldStream(events, productReducer);
}

// ── Comandos ────────────────────────────────────────────────────────────────
export async function createProduct(
	userUid: string,
	data: ProductCreatedData,
): Promise<Product> {
	const id = await eventStore.nextStreamId(STREAM.product);
	const [stored] = await eventStore.append<ProductEvent>({
		streamType: STREAM.product,
		streamId: id,
		expectedVersion: 0,
		userUid,
		events: [
			{ type: "ProductCreated", data: definedOnly(data) as ProductCreatedData },
		],
	});
	const state = productReducer(undefined, stored as StoredEvent<ProductEvent>);
	if (!state) throw new Error("unreachable: create produced no state");
	return state;
}

export async function updateProduct(
	userUid: string,
	id: number,
	data: ProductUpdatedData,
): Promise<Product | undefined> {
	const { state, version } = await loadProduct(id);
	if (!state || state.user_uid !== userUid) return undefined;

	const changes = definedOnly(data);
	const [stored] = await eventStore.append<ProductEvent>({
		streamType: STREAM.product,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "ProductUpdated", data: changes }],
	});
	return productReducer(state, stored as StoredEvent<ProductEvent>);
}

export async function deleteProduct(
	userUid: string,
	id: number,
): Promise<void> {
	const { state, version } = await loadProduct(id);
	if (!state || state.user_uid !== userUid) return;

	await eventStore.append<ProductEvent>({
		streamType: STREAM.product,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "ProductDeleted", data: {} }],
	});
}
