import { mock, describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createTestDb, makeUser, SCHEMA_DDL } from "./helpers";

const { pg, db } = createTestDb();
mock.module("@/lib/db", () => ({ db, pglite: pg }));

const { productsRouter } = await import("../products");
const { createCallerFactory } = await import("../../init");

const authed = createCallerFactory(productsRouter)({ user: makeUser("u1") });
const unauth = createCallerFactory(productsRouter)({ user: null as any });
const undefinedUser = createCallerFactory(productsRouter)({ user: undefined as any });

beforeAll(async () => { await pg.exec(SCHEMA_DDL); });
afterAll(async () => { await pg.close(); });

describe("protectedProcedure", () => {
  it("rejects when user is null", async () => {
    await expect(unauth.list()).rejects.toThrow("UNAUTHORIZED");
  });

  it("rejects when user is undefined", async () => {
    await expect(undefinedUser.list()).rejects.toThrow("UNAUTHORIZED");
  });

  it("proceeds when user is valid and returns array", async () => {
    const result = await authed.list();
    expect(result).toBeArray();
    expect(result.length).toBe(0);
  });

  it("populates user_uid from ctx.user.id and persists in DB", async () => {
    const product = await authed.create({ name: "Auth Test", price: 100, in_stock: 1 });
    expect(product.user_uid).toBe("u1");

    const list = await authed.list();
    const found = list.find((p) => p.id === product.id);
    expect(found).toBeDefined();
    expect(found!.user_uid).toBe("u1");
  });

  it("isolates data between users — each sees only own records", async () => {
    const callerB = createCallerFactory(productsRouter)({ user: makeUser("u2") });
    await callerB.create({ name: "User B Product", price: 200, in_stock: 5 });

    const listA = await authed.list();
    const listB = await callerB.list();

    expect(listA.length).toBeGreaterThanOrEqual(1);
    expect(listB.length).toBe(1);
    expect(listA.every((p) => p.user_uid === "u1")).toBe(true);
    expect(listA.some((p) => p.name === "User B Product")).toBe(false);
    expect(listB[0].name).toBe("User B Product");
    expect(listB[0].user_uid).toBe("u2");
  });
});
