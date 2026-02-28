import { mock, describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createTestDb, makeUser, SCHEMA_DDL } from "./helpers";

const { pg, db } = createTestDb();
mock.module("@/lib/db", () => ({ db, pglite: pg }));

const { paymentMethodsRouter } = await import("../payment-methods");
const { createCallerFactory } = await import("../../init");

const caller = createCallerFactory(paymentMethodsRouter)({ user: makeUser("user-1") });

beforeAll(async () => { await pg.exec(SCHEMA_DDL); });
afterAll(async () => { await pg.close(); });

describe("paymentMethods.list", () => {
  it("returns empty array initially", async () => {
    const list = await caller.list();
    expect(list).toEqual([]);
    expect(list.length).toBe(0);
  });

  it("returns ALL methods regardless of user — no user_uid filter", async () => {
    await caller.create({ name: "Cash" });
    await caller.create({ name: "Card" });

    const otherCaller = createCallerFactory(paymentMethodsRouter)({
      user: makeUser("other-user"),
    });

    const myList = await caller.list();
    const otherList = await otherCaller.list();

    expect(myList.length).toBe(2);
    expect(otherList.length).toBe(2);

    const myNames = myList.map((pm) => pm.name).sort();
    const otherNames = otherList.map((pm) => pm.name).sort();
    expect(myNames).toEqual(["Card", "Cash"]);
    expect(otherNames).toEqual(["Card", "Cash"]);
  });
});

describe("paymentMethods.create", () => {
  it("creates with trim, persists, visible in list()", async () => {
    const before = await caller.list();
    const pm = await caller.create({ name: "  Pix  " });
    expect(pm.name).toBe("Pix");
    expect(pm.id).toBeGreaterThan(0);
    expect(pm.created_at).toBeInstanceOf(Date);

    const after = await caller.list();
    expect(after.length).toBe(before.length + 1);
    const found = after.find((x) => x.id === pm.id)!;
    expect(found.name).toBe("Pix");
  });

  it("rejects name: empty string — no record created", async () => {
    const before = await caller.list();
    await expect(caller.create({ name: "" })).rejects.toThrow();
    const after = await caller.list();
    expect(after.length).toBe(before.length);
  });

  it("rejects duplicate name — first record intact", async () => {
    const first = await caller.create({ name: "UniqueMethod" });
    const before = await caller.list();
    await expect(caller.create({ name: "UniqueMethod" })).rejects.toThrow();

    const after = await caller.list();
    expect(after.length).toBe(before.length);
    const dups = after.filter((pm) => pm.name === "UniqueMethod");
    expect(dups.length).toBe(1);
    expect(dups[0].id).toBe(first.id);
  });
});

describe("paymentMethods.update", () => {
  it("updates with trim and change persists in list()", async () => {
    const pm = await caller.create({ name: "OldName" });
    const updated = await caller.update({ id: pm.id, name: "  NewName  " });
    expect(updated.name).toBe("NewName");

    const list = await caller.list();
    const persisted = list.find((x) => x.id === pm.id)!;
    expect(persisted.name).toBe("NewName");
  });

  it("fails for non-existent id (output validation)", async () => {
    const before = await caller.list();
    await expect(caller.update({ id: 999999, name: "Ghost" })).rejects.toThrow();
    const after = await caller.list();
    expect(after.length).toBe(before.length);
  });
});

describe("paymentMethods.delete", () => {
  it("deletes a payment method — no longer in list()", async () => {
    const pm = await caller.create({ name: "Disposable" });
    const before = await caller.list();
    expect(before.some((x) => x.id === pm.id)).toBe(true);

    await caller.delete({ id: pm.id });

    const after = await caller.list();
    expect(after.some((x) => x.id === pm.id)).toBe(false);
    expect(after.length).toBe(before.length - 1);
  });

  it("is idempotent — deleting same id twice does not error", async () => {
    const pm = await caller.create({ name: "Del2x" });
    await caller.delete({ id: pm.id });
    const result = await caller.delete({ id: pm.id });
    expect(result.success).toBe(true);

    const list = await caller.list();
    expect(list.some((x) => x.id === pm.id)).toBe(false);
  });
});
