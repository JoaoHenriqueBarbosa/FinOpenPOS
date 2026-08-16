import type { DomainEvent, StoredEvent } from "@finopenpos/event-sourcing";
import { foldStream, foldStreams } from "@finopenpos/event-sourcing";
import { eventStore, STREAM } from "./store";

// ── Eventos ─────────────────────────────────────────────────────────────────
export type PaymentMethodEvent =
	| DomainEvent<"PaymentMethodCreated", { name: string }>
	| DomainEvent<"PaymentMethodRenamed", { name: string }>
	| DomainEvent<"PaymentMethodDeleted", Record<string, never>>;

// ── Estado ──────────────────────────────────────────────────────────────────
export interface PaymentMethod {
	id: number;
	name: string;
	created_at: Date;
}

export function paymentMethodReducer(
	state: PaymentMethod | undefined,
	event: StoredEvent<PaymentMethodEvent>,
): PaymentMethod | undefined {
	switch (event.type) {
		case "PaymentMethodCreated":
			return {
				id: event.streamId,
				name: (event.data as { name: string }).name,
				created_at: event.occurredAt,
			};
		case "PaymentMethodRenamed":
			return state
				? { ...state, name: (event.data as { name: string }).name }
				: state;
		case "PaymentMethodDeleted":
			return undefined;
		default:
			return state;
	}
}

// ── Projeções (métodos de pagamento são globais, sem escopo de usuário) ─────
export async function listPaymentMethods(): Promise<PaymentMethod[]> {
	const events = await eventStore.readAll<PaymentMethodEvent>([
		STREAM.paymentMethod,
	]);
	return [...foldStreams(events, paymentMethodReducer).values()];
}

async function assertNameAvailable(
	name: string,
	exceptId?: number,
): Promise<void> {
	const all = await listPaymentMethods();
	for (const pm of all) {
		if (pm.name === name && pm.id !== exceptId) {
			throw Object.assign(
				new Error(`duplicate key: payment_methods name ${name}`),
				{
					code: "23505",
				},
			);
		}
	}
}

// ── Comandos ────────────────────────────────────────────────────────────────
export async function createPaymentMethod(
	userUid: string,
	name: string,
): Promise<PaymentMethod> {
	await assertNameAvailable(name);
	const id = await eventStore.nextStreamId(STREAM.paymentMethod);
	const [stored] = await eventStore.append<PaymentMethodEvent>({
		streamType: STREAM.paymentMethod,
		streamId: id,
		expectedVersion: 0,
		userUid,
		events: [{ type: "PaymentMethodCreated", data: { name } }],
	});
	const state = paymentMethodReducer(
		undefined,
		stored as StoredEvent<PaymentMethodEvent>,
	);
	if (!state) throw new Error("unreachable: create produced no state");
	return state;
}

export async function renamePaymentMethod(
	userUid: string,
	id: number,
	name: string,
): Promise<PaymentMethod | undefined> {
	const events = await eventStore.readStream<PaymentMethodEvent>(
		STREAM.paymentMethod,
		id,
	);
	const { state, version } = foldStream(events, paymentMethodReducer);
	if (!state) return undefined;
	await assertNameAvailable(name, id);

	const [stored] = await eventStore.append<PaymentMethodEvent>({
		streamType: STREAM.paymentMethod,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "PaymentMethodRenamed", data: { name } }],
	});
	return paymentMethodReducer(state, stored as StoredEvent<PaymentMethodEvent>);
}

export async function deletePaymentMethod(
	userUid: string,
	id: number,
): Promise<void> {
	const events = await eventStore.readStream<PaymentMethodEvent>(
		STREAM.paymentMethod,
		id,
	);
	const { state, version } = foldStream(events, paymentMethodReducer);
	if (!state) return;

	await eventStore.append<PaymentMethodEvent>({
		streamType: STREAM.paymentMethod,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "PaymentMethodDeleted", data: {} }],
	});
}
