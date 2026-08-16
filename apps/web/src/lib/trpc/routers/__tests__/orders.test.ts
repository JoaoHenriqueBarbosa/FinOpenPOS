import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { createTestDb, makeUser, SCHEMA_DDL } from "./helpers";

const { pg, db } = createTestDb();
mock.module("@/lib/db", () => ({ db, pglite: pg }));

const { ordersRouter } = await import("../orders");
const { createCallerFactory } = await import("../../init");
const { createCustomer, createProduct, createPaymentMethod, listTransactions } =
	await import("@/lib/es");

const caller = createCallerFactory(ordersRouter)({ user: makeUser("user-1") });
const callerAs = (uid: string) =>
	createCallerFactory(ordersRouter)({ user: makeUser(uid) });

let customerId: number;
let productId: number;
let paymentMethodId: number;

beforeAll(async () => {
	await pg.exec(SCHEMA_DDL);

	const cust = await createCustomer("user-1", {
		name: "Test Customer",
		email: "order-test@t.com",
	});
	customerId = cust.id;

	const prod = await createProduct("user-1", {
		name: "Test Product",
		price: 1000,
		in_stock: 50,
	});
	productId = prod.id;

	const pm = await createPaymentMethod("user-1", "Cash-OrderTest");
	paymentMethodId = pm.id;
});

afterAll(async () => {
	await pg.close();
});

describe("orders.list", () => {
	it("returns empty array initially", async () => {
		const list = await caller.list();
		expect(list).toEqual([]);
		expect(list.length).toBe(0);
	});

	it("returns order with nested customer after create", async () => {
		await caller.create({
			customerId,
			paymentMethodId,
			products: [{ id: productId, quantity: 2, price: 1000 }],
			total: 2000,
		});

		const list = await caller.list();
		expect(list.length).toBe(1);
		const order = list[0];
		expect(order.customer).toBeDefined();
		expect(order.customer!.name).toBe("Test Customer");
		expect(order.total_amount).toBe(2000);
		expect(order.user_uid).toBe("user-1");
	});

	it("filters by user_uid — other user sees nothing", async () => {
		const other = callerAs("outsider");
		const otherList = await other.list();
		expect(otherList.length).toBe(0);

		const myList = await caller.list();
		expect(myList.every((o) => o.user_uid === "user-1")).toBe(true);
		expect(myList.length).toBeGreaterThanOrEqual(1);
	});
});

describe("orders.create", () => {
	it("creates order + orderItems + transaction (events in one command)", async () => {
		const before = await caller.list();
		const order = await caller.create({
			customerId,
			paymentMethodId,
			products: [{ id: productId, quantity: 3, price: 1000 }],
			total: 3000,
		});

		expect(order.id).toBeGreaterThan(0);
		expect(order.total_amount).toBe(3000);
		expect(order.status).toBe("completed");
		expect(order.customer!.name).toBe("Test Customer");

		// Verify order appeared in list
		const after = await caller.list();
		expect(after.length).toBe(before.length + 1);

		// Verify items via read model (rebuilt from OrderPlaced event)
		const detail = await caller.get({ id: order.id });
		expect(detail).not.toBeNull();
		expect(detail!.orderItems.length).toBe(1);
		expect(detail!.orderItems[0].quantity).toBe(3);
		expect(detail!.orderItems[0].price).toBe(1000);
		expect(detail!.orderItems[0].product_id).toBe(productId);
		expect(detail!.orderItems[0].product!.name).toBe("Test Product");

		// Verify the payment transaction was recorded in the event log
		const txns = (await listTransactions("user-1")).filter(
			(t) => t.order_id === order.id,
		);
		expect(txns.length).toBe(1);
		expect(txns[0].amount).toBe(3000);
		expect(txns[0].type).toBe("income");
		expect(txns[0].category).toBe("selling");
		expect(txns[0].status).toBe("completed");
		expect(txns[0].user_uid).toBe("user-1");
		expect(txns[0].payment_method_id).toBe(paymentMethodId);
	});

	it("rejects quantity: 0 — no order created", async () => {
		const before = await caller.list();
		await expect(
			caller.create({
				customerId,
				paymentMethodId,
				products: [{ id: productId, quantity: 0, price: 1000 }],
				total: 0,
			}),
		).rejects.toThrow();
		const after = await caller.list();
		expect(after.length).toBe(before.length);
	});
});

describe("orders.update", () => {
	it("updates status and change persists in list()", async () => {
		const order = await caller.create({
			customerId,
			paymentMethodId,
			products: [{ id: productId, quantity: 1, price: 500 }],
			total: 500,
		});
		const updated = await caller.update({ id: order.id, status: "cancelled" });
		expect(updated.status).toBe("cancelled");

		const list = await caller.list();
		const persisted = list.find((o) => o.id === order.id)!;
		expect(persisted.status).toBe("cancelled");
		expect(persisted.total_amount).toBe(500); // unchanged field preserved
	});

	it("rejects invalid status enum", async () => {
		const order = await caller.create({
			customerId,
			paymentMethodId,
			products: [{ id: productId, quantity: 1, price: 500 }],
			total: 500,
		});
		await expect(
			caller.update({ id: order.id, status: "bogus" as any }),
		).rejects.toThrow();

		// Original status untouched
		const list = await caller.list();
		const persisted = list.find((o) => o.id === order.id)!;
		expect(persisted.status).toBe("completed");
	});
});

describe("orders.delete", () => {
	it("deletes order — gone from list and detail, items unreachable", async () => {
		const order = await caller.create({
			customerId,
			paymentMethodId,
			products: [{ id: productId, quantity: 1, price: 100 }],
			total: 100,
		});

		const before = await caller.list();
		await caller.delete({ id: order.id });
		const after = await caller.list();

		expect(after.length).toBe(before.length - 1);
		expect(after.some((o) => o.id === order.id)).toBe(false);

		// Detail read model no longer materializes the deleted order (nor items)
		const detail = await caller.get({ id: order.id });
		expect(detail).toBeNull();
	});

	it("keeps the payment transaction as a historical fact after delete", async () => {
		const order = await caller.create({
			customerId,
			paymentMethodId,
			products: [{ id: productId, quantity: 1, price: 100 }],
			total: 100,
		});

		await caller.delete({ id: order.id });

		// O evento TransactionRecorded permanece no log — fatos não são apagados
		const txns = (await listTransactions("user-1")).filter(
			(t) => t.order_id === order.id,
		);
		expect(txns.length).toBe(1);
		expect(txns[0].amount).toBe(100);
	});

	it("is idempotent — deleting non-existent id is no-op", async () => {
		const before = await caller.list();
		const result = await caller.delete({ id: 999999 });
		expect(result.success).toBe(true);
		const after = await caller.list();
		expect(after.length).toBe(before.length);
	});
});
