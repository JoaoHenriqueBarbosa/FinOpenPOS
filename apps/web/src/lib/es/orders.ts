import type { DomainEvent, StoredEvent } from "@finopenpos/event-sourcing";
import { foldStream, foldStreams } from "@finopenpos/event-sourcing";
import { customerMap } from "./customers";
import { productMap } from "./products";
import { eventStore, STREAM } from "./store";
import { recordTransaction } from "./transactions";

// ── Eventos ─────────────────────────────────────────────────────────────────
export interface OrderItemData {
	product_id: number;
	quantity: number;
	price: number;
}

export interface OrderPlacedData {
	customer_id: number | null;
	total_amount: number;
	status: string;
	items: OrderItemData[];
}

export interface OrderUpdatedData {
	total_amount?: number;
	status?: string;
}

export type OrderEvent =
	| DomainEvent<"OrderPlaced", OrderPlacedData>
	| DomainEvent<"OrderUpdated", OrderUpdatedData>
	| DomainEvent<"OrderDeleted", Record<string, never>>;

// ── Estado ──────────────────────────────────────────────────────────────────
export interface Order {
	id: number;
	customer_id: number | null;
	total_amount: number;
	status: string | null;
	user_uid: string;
	created_at: Date;
	items: OrderItemData[];
}

export function orderReducer(
	state: Order | undefined,
	event: StoredEvent<OrderEvent>,
): Order | undefined {
	switch (event.type) {
		case "OrderPlaced": {
			const d = event.data as OrderPlacedData;
			return {
				id: event.streamId,
				customer_id: d.customer_id,
				total_amount: d.total_amount,
				status: d.status,
				user_uid: event.userUid,
				created_at: event.occurredAt,
				items: d.items,
			};
		}
		case "OrderUpdated": {
			if (!state) return state;
			const d = event.data as OrderUpdatedData;
			return {
				...state,
				...(d.total_amount !== undefined
					? { total_amount: d.total_amount }
					: {}),
				...(d.status !== undefined ? { status: d.status } : {}),
			};
		}
		case "OrderDeleted":
			return undefined;
		default:
			return state;
	}
}

// ── Projeções ───────────────────────────────────────────────────────────────
export async function orderMap(userUid: string): Promise<Map<number, Order>> {
	const events = await eventStore.readAll<OrderEvent>([STREAM.order], {
		userUid,
	});
	return foldStreams(events, orderReducer);
}

export interface OrderWithCustomer extends Omit<Order, "items"> {
	customer: { name: string } | null;
}

function toOrderWithCustomer(
	order: Order,
	customers: Map<number, { name: string }>,
): OrderWithCustomer {
	const { items: _items, ...rest } = order;
	const customer = order.customer_id
		? (customers.get(order.customer_id) ?? null)
		: null;
	return { ...rest, customer: customer ? { name: customer.name } : null };
}

export async function listOrders(
	userUid: string,
): Promise<OrderWithCustomer[]> {
	const [ordersMap, customers] = await Promise.all([
		orderMap(userUid),
		customerMap(userUid),
	]);
	return [...ordersMap.values()].map((o) => toOrderWithCustomer(o, customers));
}

export interface OrderDetail extends OrderWithCustomer {
	orderItems: {
		id: number;
		product_id: number | null;
		quantity: number;
		price: number;
		product: { name: string; category: string | null } | null;
	}[];
}

export async function getOrderDetail(
	userUid: string,
	id: number,
): Promise<OrderDetail | null> {
	const events = await eventStore.readStream<OrderEvent>(STREAM.order, id);
	const { state } = foldStream(events, orderReducer);
	if (!state || state.user_uid !== userUid) return null;

	const [customers, products] = await Promise.all([
		customerMap(userUid),
		productMap(userUid),
	]);

	return {
		...toOrderWithCustomer(state, customers),
		orderItems: state.items.map((item, idx) => {
			const product = products.get(item.product_id);
			return {
				// itens vivem dentro do evento OrderPlaced; id sintético estável
				id: state.id * 1000 + idx + 1,
				product_id: item.product_id,
				quantity: item.quantity,
				price: item.price,
				product: product
					? { name: product.name, category: product.category }
					: null,
			};
		}),
	};
}

export async function loadOrder(
	id: number,
): Promise<{ state: Order | undefined; version: number }> {
	const events = await eventStore.readStream<OrderEvent>(STREAM.order, id);
	return foldStream(events, orderReducer);
}

// ── Comandos ────────────────────────────────────────────────────────────────
export interface PlaceOrderInput {
	customerId: number;
	paymentMethodId: number;
	products: OrderItemData[];
	total: number;
}

/**
 * Fluxo de venda do POS: um pedido gera dois fatos — OrderPlaced no stream
 * do pedido e TransactionRecorded no stream financeiro.
 */
export async function placeOrder(
	userUid: string,
	input: PlaceOrderInput,
): Promise<OrderWithCustomer> {
	const id = await eventStore.nextStreamId(STREAM.order);
	const [stored] = await eventStore.append<OrderEvent>({
		streamType: STREAM.order,
		streamId: id,
		expectedVersion: 0,
		userUid,
		events: [
			{
				type: "OrderPlaced",
				data: {
					customer_id: input.customerId,
					total_amount: input.total,
					status: "completed",
					items: input.products.map((p) => ({
						product_id: p.product_id,
						quantity: p.quantity,
						price: p.price,
					})),
				},
			},
		],
	});

	await recordTransaction(userUid, {
		order_id: id,
		payment_method_id: input.paymentMethodId,
		amount: input.total,
		status: "completed",
		category: "selling",
		type: "income",
		description: `Payment for order #${id}`,
	});

	const state = orderReducer(undefined, stored as StoredEvent<OrderEvent>);
	if (!state) throw new Error("unreachable: create produced no state");
	const customers = await customerMap(userUid);
	return toOrderWithCustomer(state, customers);
}

export async function updateOrder(
	userUid: string,
	id: number,
	data: OrderUpdatedData,
): Promise<OrderWithCustomer | undefined> {
	const { state, version } = await loadOrder(id);
	if (!state || state.user_uid !== userUid) return undefined;

	const changes = Object.fromEntries(
		Object.entries(data).filter(([, v]) => v !== undefined),
	) as OrderUpdatedData;

	const [stored] = await eventStore.append<OrderEvent>({
		streamType: STREAM.order,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "OrderUpdated", data: changes }],
	});
	const next = orderReducer(state, stored as StoredEvent<OrderEvent>);
	if (!next) throw new Error("unreachable: update produced no state");
	const customers = await customerMap(userUid);
	return toOrderWithCustomer(next, customers);
}

export async function deleteOrder(userUid: string, id: number): Promise<void> {
	const { state, version } = await loadOrder(id);
	if (!state || state.user_uid !== userUid) return;

	await eventStore.append<OrderEvent>({
		streamType: STREAM.order,
		streamId: id,
		expectedVersion: version,
		userUid,
		events: [{ type: "OrderDeleted", data: {} }],
	});
}
