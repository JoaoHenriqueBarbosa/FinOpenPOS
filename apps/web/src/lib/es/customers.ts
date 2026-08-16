import type { DomainEvent, StoredEvent } from "@finopenpos/event-sourcing";
import { foldStream, foldStreams } from "@finopenpos/event-sourcing";
import { eventStore, STREAM } from "./store";

// ── Eventos ─────────────────────────────────────────────────────────────────
export interface CustomerCreatedData {
	name: string;
	email: string;
	phone?: string;
	status?: string;
}

export type CustomerUpdatedData = Partial<CustomerCreatedData>;

export type CustomerEvent =
	| DomainEvent<"CustomerCreated", CustomerCreatedData>
	| DomainEvent<"CustomerUpdated", CustomerUpdatedData>
	| DomainEvent<"CustomerDeleted", Record<string, never>>;

// ── Estado ──────────────────────────────────────────────────────────────────
export interface Customer {
	id: number;
	name: string;
	email: string;
	phone: string | null;
	status: string | null;
	user_uid: string;
	created_at: Date;
}

function definedOnly<T extends object>(data: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(data).filter(([, v]) => v !== undefined),
	) as Partial<T>;
}

export function customerReducer(
	state: Customer | undefined,
	event: StoredEvent<CustomerEvent>,
): Customer | undefined {
	switch (event.type) {
		case "CustomerCreated": {
			const d = event.data as CustomerCreatedData;
			return {
				id: event.streamId,
				name: d.name,
				email: d.email,
				phone: d.phone ?? null,
				status: d.status ?? null,
				user_uid: event.userUid,
				created_at: event.occurredAt,
			};
		}
		case "CustomerUpdated":
			return state
				? { ...state, ...definedOnly(event.data as CustomerUpdatedData) }
				: state;
		case "CustomerDeleted":
			return undefined;
		default:
			return state;
	}
}

// ── Projeções ───────────────────────────────────────────────────────────────
export async function listCustomers(userUid: string): Promise<Customer[]> {
	const events = await eventStore.readAll<CustomerEvent>([STREAM.customer], {
		userUid,
	});
	return [...foldStreams(events, customerReducer).values()];
}

export async function customerMap(
	userUid: string,
): Promise<Map<number, Customer>> {
	const events = await eventStore.readAll<CustomerEvent>([STREAM.customer], {
		userUid,
	});
	return foldStreams(events, customerReducer);
}

export async function loadCustomer(
	id: number,
): Promise<{ state: Customer | undefined; version: number }> {
	const events = await eventStore.readStream<CustomerEvent>(
		STREAM.customer,
		id,
	);
	return foldStream(events, customerReducer);
}

/** Emails são únicos globalmente (invariante herdada do UNIQUE da tabela legada). */
async function assertEmailAvailable(
	email: string,
	exceptId?: number,
): Promise<void> {
	const events = await eventStore.readAll<CustomerEvent>([STREAM.customer]);
	const all = foldStreams(events, customerReducer);
	for (const c of all.values()) {
		if (c.email === email && c.id !== exceptId) {
			throw Object.assign(
				new Error(`duplicate key: customers email ${email}`),
				{
					code: "23505",
				},
			);
		}
	}
}

// ── Comandos ────────────────────────────────────────────────────────────────
export async function createCustomer(
	userUid: string,
	data: CustomerCreatedData,
): Promise<Customer> {
	await assertEmailAvailable(data.email);
	const id = await eventStore.nextStreamId(STREAM.customer);
	const [stored] = await eventStore.append<CustomerEvent>({
		streamType: STREAM.customer,
		streamId: id,
		expectedVersion: 0,
		userUid,
		events: [
			{
				type: "CustomerCreated",
				data: definedOnly(data) as CustomerCreatedData,
			},
		],
	});
	const state = customerReducer(
		undefined,
		stored as StoredEvent<CustomerEvent>,
	);
	if (!state) throw new Error("unreachable: create produced no state");
	return state;
}

export async function updateCustomer(
	userUid: string,
	id: number,
	data: CustomerUpdatedData,
): Promise<Customer | undefined> {
	const { state, version } = await loadCustomer(id);
	if (!state || state.user_uid !== userUid) return undefined;
	if (data.email && data.email !== state.email) {
		await assertEmailAvailable(data.email, id);
	}

	const [stored] = await eventStore.append<CustomerEvent>({
		streamType: STREAM.customer,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "CustomerUpdated", data: definedOnly(data) }],
	});
	return customerReducer(state, stored as StoredEvent<CustomerEvent>);
}

export async function deleteCustomer(
	userUid: string,
	id: number,
): Promise<void> {
	const { state, version } = await loadCustomer(id);
	if (!state || state.user_uid !== userUid) return;

	await eventStore.append<CustomerEvent>({
		streamType: STREAM.customer,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "CustomerDeleted", data: {} }],
	});
}
