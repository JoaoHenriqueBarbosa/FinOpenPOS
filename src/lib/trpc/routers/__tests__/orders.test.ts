import { mock, describe, it, expect, beforeAll, afterAll } from "bun:test";
import { eq } from "drizzle-orm";
import { createTestDb, makeUser, SCHEMA_DDL } from "./helpers";

const { pg, db } = createTestDb();
mock.module("@/lib/db", () => ({ db, pglite: pg }));

const { ordersRouter } = await import("../orders");
const { createCallerFactory } = await import("../../init");
const { customers, products, paymentMethods, transactions, orderItems } =
  await import("@/lib/db/schema");

const caller = createCallerFactory(ordersRouter)({ user: makeUser("user-1") });
const callerAs = (uid: string) =>
  createCallerFactory(ordersRouter)({ user: makeUser(uid) });

let customerId: number;
let productId: number;
let paymentMethodId: number;

beforeAll(async () => {
  await pg.exec(SCHEMA_DDL);

  const [cust] = await db
    .insert(customers)
    .values({ name: "Test Customer", email: "order-test@t.com", user_uid: "user-1" })
    .returning();
  customerId = cust.id;

  const [prod] = await db
    .insert(products)
    .values({ name: "Test Product", price: 1000, in_stock: 50, user_uid: "user-1" })
    .returning();
  productId = prod.id;

  const [pm] = await db
    .insert(paymentMethods)
    .values({ name: "Cash-OrderTest" })
    .returning();
  paymentMethodId = pm.id;
});

afterAll(async () => { await pg.close(); });

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
  it("creates order + orderItems + transaction atomically", async () => {
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

    // Verify orderItems in DB
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.order_id, order.id));
    expect(items.length).toBe(1);
    expect(items[0].quantity).toBe(3);
    expect(items[0].price).toBe(1000);
    expect(items[0].product_id).toBe(productId);

    // Verify transaction in DB
    const txns = await db
      .select()
      .from(transactions)
      .where(eq(transactions.order_id, order.id));
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
      })
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
      caller.update({ id: order.id, status: "bogus" as any })
    ).rejects.toThrow();

    // Original status untouched
    const list = await caller.list();
    const persisted = list.find((o) => o.id === order.id)!;
    expect(persisted.status).toBe("completed");
  });
});

describe("orders.delete", () => {
  it("deletes order + orderItems — both gone from DB", async () => {
    const order = await caller.create({
      customerId,
      paymentMethodId,
      products: [{ id: productId, quantity: 1, price: 100 }],
      total: 100,
    });

    // Delete associated transaction first to avoid FK violation
    await db.delete(transactions).where(eq(transactions.order_id, order.id));

    const before = await caller.list();
    await caller.delete({ id: order.id });
    const after = await caller.list();

    expect(after.length).toBe(before.length - 1);
    expect(after.some((o) => o.id === order.id)).toBe(false);

    // Verify orderItems also deleted
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.order_id, order.id));
    expect(items.length).toBe(0);
  });

  it("fails with FK error when transaction references order — order survives", async () => {
    const order = await caller.create({
      customerId,
      paymentMethodId,
      products: [{ id: productId, quantity: 1, price: 100 }],
      total: 100,
    });

    const before = await caller.list();
    await expect(caller.delete({ id: order.id })).rejects.toThrow();

    // Order still exists
    const after = await caller.list();
    expect(after.length).toBe(before.length);
    expect(after.some((o) => o.id === order.id)).toBe(true);
  });

  it("is idempotent — deleting non-existent id is no-op", async () => {
    const before = await caller.list();
    const result = await caller.delete({ id: 999999 });
    expect(result.success).toBe(true);
    const after = await caller.list();
    expect(after.length).toBe(before.length);
  });
});
