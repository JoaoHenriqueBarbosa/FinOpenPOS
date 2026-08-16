import type { DomainEvent, StoredEvent } from "@finopenpos/event-sourcing";
import { foldStream, foldStreams } from "@finopenpos/event-sourcing";
import { eventStore, STREAM } from "./store";

// ── Eventos ─────────────────────────────────────────────────────────────────
export interface TransactionRecordedData {
	description?: string;
	amount: number;
	type?: string;
	category?: string;
	status?: string;
	order_id?: number;
	payment_method_id?: number;
}

export type TransactionUpdatedData = Partial<TransactionRecordedData>;

export type TransactionEvent =
	| DomainEvent<"TransactionRecorded", TransactionRecordedData>
	| DomainEvent<"TransactionUpdated", TransactionUpdatedData>
	| DomainEvent<"TransactionDeleted", Record<string, never>>;

// ── Estado ──────────────────────────────────────────────────────────────────
export interface Transaction {
	id: number;
	description: string | null;
	amount: number;
	type: string | null;
	category: string | null;
	status: string | null;
	order_id: number | null;
	payment_method_id: number | null;
	user_uid: string;
	created_at: Date;
}

function definedOnly<T extends object>(data: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(data).filter(([, v]) => v !== undefined),
	) as Partial<T>;
}

export function transactionReducer(
	state: Transaction | undefined,
	event: StoredEvent<TransactionEvent>,
): Transaction | undefined {
	switch (event.type) {
		case "TransactionRecorded": {
			const d = event.data as TransactionRecordedData;
			return {
				id: event.streamId,
				description: d.description ?? null,
				amount: d.amount,
				type: d.type ?? null,
				category: d.category ?? null,
				status: d.status ?? null,
				order_id: d.order_id ?? null,
				payment_method_id: d.payment_method_id ?? null,
				user_uid: event.userUid,
				created_at: event.occurredAt,
			};
		}
		case "TransactionUpdated":
			return state
				? { ...state, ...definedOnly(event.data as TransactionUpdatedData) }
				: state;
		case "TransactionDeleted":
			return undefined;
		default:
			return state;
	}
}

// ── Projeções ───────────────────────────────────────────────────────────────
export async function listTransactions(
	userUid: string,
): Promise<Transaction[]> {
	const events = await eventStore.readAll<TransactionEvent>(
		[STREAM.transaction],
		{ userUid },
	);
	return [...foldStreams(events, transactionReducer).values()];
}

export async function loadTransaction(
	id: number,
): Promise<{ state: Transaction | undefined; version: number }> {
	const events = await eventStore.readStream<TransactionEvent>(
		STREAM.transaction,
		id,
	);
	return foldStream(events, transactionReducer);
}

// ── Comandos ────────────────────────────────────────────────────────────────
export async function recordTransaction(
	userUid: string,
	data: TransactionRecordedData,
	occurredAt?: Date,
): Promise<Transaction> {
	const id = await eventStore.nextStreamId(STREAM.transaction);
	const [stored] = await eventStore.append<TransactionEvent>({
		streamType: STREAM.transaction,
		streamId: id,
		expectedVersion: 0,
		userUid,
		occurredAt,
		events: [
			{
				type: "TransactionRecorded",
				data: definedOnly(data) as TransactionRecordedData,
			},
		],
	});
	const state = transactionReducer(
		undefined,
		stored as StoredEvent<TransactionEvent>,
	);
	if (!state) throw new Error("unreachable: create produced no state");
	return state;
}

export async function updateTransaction(
	userUid: string,
	id: number,
	data: TransactionUpdatedData,
): Promise<Transaction | undefined> {
	const { state, version } = await loadTransaction(id);
	if (!state || state.user_uid !== userUid) return undefined;

	const [stored] = await eventStore.append<TransactionEvent>({
		streamType: STREAM.transaction,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "TransactionUpdated", data: definedOnly(data) }],
	});
	return transactionReducer(state, stored as StoredEvent<TransactionEvent>);
}

export async function deleteTransaction(
	userUid: string,
	id: number,
): Promise<void> {
	const { state, version } = await loadTransaction(id);
	if (!state || state.user_uid !== userUid) return;

	await eventStore.append<TransactionEvent>({
		streamType: STREAM.transaction,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "TransactionDeleted", data: {} }],
	});
}
