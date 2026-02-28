import { mock, describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createTestDb, makeUser, SCHEMA_DDL } from "./helpers";

const { pg, db } = createTestDb();
mock.module("@/lib/db", () => ({ db, pglite: pg }));

const { transactionsRouter } = await import("../transactions");
const { createCallerFactory } = await import("../../init");

const caller = createCallerFactory(transactionsRouter)({ user: makeUser("user-1") });
const callerAs = (uid: string) =>
  createCallerFactory(transactionsRouter)({ user: makeUser(uid) });

beforeAll(async () => { await pg.exec(SCHEMA_DDL); });
afterAll(async () => { await pg.close(); });

describe("transactions.list", () => {
  it("returns empty array initially", async () => {
    const list = await caller.list();
    expect(list).toEqual([]);
    expect(list.length).toBe(0);
  });

  it("filters by user_uid — cross-user data invisible", async () => {
    await caller.create({ description: "T1", amount: 100, type: "income" });
    const other = callerAs("other-tx");
    await other.create({ description: "T-other", amount: 50, type: "expense" });

    const list = await caller.list();
    expect(list.length).toBe(1);
    expect(list[0].description).toBe("T1");
    expect(list.some((t) => t.description === "T-other")).toBe(false);

    const otherList = await other.list();
    expect(otherList.length).toBe(1);
    expect(otherList[0].description).toBe("T-other");
  });
});

describe("transactions.create", () => {
  it("creates income and persists in list()", async () => {
    const before = await caller.list();
    const t = await caller.create({ description: "Sale", amount: 500, type: "income" });
    expect(t.description).toBe("Sale");
    expect(t.amount).toBe(500);
    expect(t.type).toBe("income");
    expect(t.user_uid).toBe("user-1");

    const after = await caller.list();
    expect(after.length).toBe(before.length + 1);
    const found = after.find((x) => x.id === t.id)!;
    expect(found.description).toBe("Sale");
    expect(found.amount).toBe(500);
  });

  it("creates expense with optionals — all fields persisted", async () => {
    const t = await caller.create({
      description: "Rent",
      amount: 1000,
      type: "expense",
      category: "overhead",
      status: "pending",
    });

    const list = await caller.list();
    const persisted = list.find((x) => x.id === t.id)!;
    expect(persisted.type).toBe("expense");
    expect(persisted.category).toBe("overhead");
    expect(persisted.status).toBe("pending");
  });

  it("rejects description: empty string — no record created", async () => {
    const before = await caller.list();
    await expect(
      caller.create({ description: "", amount: 100, type: "income" })
    ).rejects.toThrow();
    const after = await caller.list();
    expect(after.length).toBe(before.length);
  });

  it("rejects amount: 0 — no record created", async () => {
    const before = await caller.list();
    await expect(
      caller.create({ description: "Zero", amount: 0, type: "income" })
    ).rejects.toThrow();
    const after = await caller.list();
    expect(after.length).toBe(before.length);
  });

  it("rejects amount: 1.5 (non-integer)", async () => {
    await expect(
      caller.create({ description: "Frac", amount: 1.5, type: "income" })
    ).rejects.toThrow();
  });

  it('rejects type: "other" — invalid enum', async () => {
    await expect(
      caller.create({ description: "Bad", amount: 100, type: "other" as any })
    ).rejects.toThrow();
  });
});

describe("transactions.update", () => {
  it("updates amount+status and change persists in list()", async () => {
    const t = await caller.create({ description: "Upd", amount: 100, type: "income" });
    const updated = await caller.update({ id: t.id, amount: 200, status: "completed" });
    expect(updated.amount).toBe(200);
    expect(updated.status).toBe("completed");

    const list = await caller.list();
    const persisted = list.find((x) => x.id === t.id)!;
    expect(persisted.amount).toBe(200);
    expect(persisted.status).toBe("completed");
    expect(persisted.description).toBe("Upd"); // unchanged field preserved
  });

  it("cross-user update fails and original data is untouched", async () => {
    const t = await caller.create({ description: "Mine", amount: 100, type: "income" });
    const other = callerAs("attacker");
    await expect(other.update({ id: t.id, amount: 999 })).rejects.toThrow();

    const list = await caller.list();
    const original = list.find((x) => x.id === t.id)!;
    expect(original.amount).toBe(100);
    expect(original.description).toBe("Mine");
  });
});

describe("transactions.delete", () => {
  it("deletes a transaction — no longer in list()", async () => {
    const t = await caller.create({ description: "ToDel", amount: 100, type: "income" });
    const before = await caller.list();
    expect(before.some((x) => x.id === t.id)).toBe(true);

    await caller.delete({ id: t.id });

    const after = await caller.list();
    expect(after.some((x) => x.id === t.id)).toBe(false);
    expect(after.length).toBe(before.length - 1);
  });

  it("is idempotent — deleting same id twice does not error", async () => {
    const t = await caller.create({ description: "Del2x", amount: 50, type: "expense" });
    await caller.delete({ id: t.id });
    const result = await caller.delete({ id: t.id });
    expect(result.success).toBe(true);

    const list = await caller.list();
    expect(list.some((x) => x.id === t.id)).toBe(false);
  });
});
