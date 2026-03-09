import { mock, describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createTestDb, makeUser, SCHEMA_DDL } from "./helpers";

const { pg, db } = createTestDb();
mock.module("@/lib/db", () => ({ db, pglite: pg }));

const { fiscalRouter } = await import("../fiscal");
const { createCallerFactory } = await import("../../init");

const caller = createCallerFactory(fiscalRouter)({ user: makeUser("fiscal-test-1") });
const callerAs = (uid: string) =>
  createCallerFactory(fiscalRouter)({ user: makeUser(uid) });

beforeAll(async () => { await pg.exec(SCHEMA_DDL); });
afterAll(async () => { await pg.close(); });

describe("fiscal.list", () => {
  it("returns empty array initially", async () => {
    const list = await caller.list();
    expect(list).toEqual([]);
  });
});

describe("fiscal.get", () => {
  it("returns null for non-existent invoice", async () => {
    const result = await caller.get({ id: 999 });
    expect(result).toBeNull();
  });
});

describe("fiscal.emit", () => {
  it("rejects when fiscal settings are not configured", async () => {
    await expect(
      caller.emit({ order_id: 1, model: 65 })
    ).rejects.toThrow("Fiscal settings not configured");
  });
});

describe("fiscal.cancel", () => {
  it("rejects with short reason (< 15 chars)", async () => {
    await expect(
      caller.cancel({ id: 1, reason: "too short" })
    ).rejects.toThrow();
  });

  it("rejects for non-existent invoice", async () => {
    await expect(
      caller.cancel({ id: 999, reason: "This is a valid reason for cancellation" })
    ).rejects.toThrow();
  });
});

describe("fiscal.voidRange", () => {
  it("rejects with short reason (< 15 chars)", async () => {
    await expect(
      caller.voidRange({
        model: 65,
        series: 1,
        start_number: 1,
        end_number: 5,
        reason: "short",
      })
    ).rejects.toThrow();
  });
});

describe("fiscal.downloadXml", () => {
  it("returns null xml for non-existent invoice", async () => {
    const result = await caller.downloadXml({ id: 999, type: "request" });
    expect(result.xml).toBeNull();
  });
});

describe("fiscal multi-tenancy", () => {
  it("users cannot see each other's invoices", async () => {
    const other = callerAs("fiscal-test-2");
    const otherList = await other.list();
    expect(otherList).toEqual([]);
  });
});
