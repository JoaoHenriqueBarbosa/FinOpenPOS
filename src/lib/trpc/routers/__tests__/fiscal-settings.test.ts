import { mock, describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createTestDb, makeUser, SCHEMA_DDL } from "./helpers";

const { pg, db } = createTestDb();
mock.module("@/lib/db", () => ({ db, pglite: pg }));

const { fiscalSettingsRouter } = await import("../fiscal-settings");
const { createCallerFactory } = await import("../../init");

const caller = createCallerFactory(fiscalSettingsRouter)({ user: makeUser("fiscal-user-1") });
const callerAs = (uid: string) =>
  createCallerFactory(fiscalSettingsRouter)({ user: makeUser(uid) });

beforeAll(async () => { await pg.exec(SCHEMA_DDL); });
afterAll(async () => { await pg.close(); });

const validSettings = {
  company_name: "Test Company Ltd",
  tax_id: "12345678000199",
  state_tax_id: "123456789",
  tax_regime: 1,
  state_code: "SP",
  city_code: "3550308",
  city_name: "Sao Paulo",
  street: "Av Paulista",
  street_number: "1000",
  district: "Bela Vista",
  zip_code: "01310100",
  environment: 2,
};

describe("fiscalSettings.get", () => {
  it("returns null when no settings configured", async () => {
    const result = await caller.get();
    expect(result).toBeNull();
  });
});

describe("fiscalSettings.upsert", () => {
  it("creates fiscal settings successfully", async () => {
    const result = await caller.upsert(validSettings);
    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
  });

  it("settings are retrievable after creation", async () => {
    const settings = await caller.get();
    expect(settings).not.toBeNull();
    expect(settings.company_name).toBe("Test Company Ltd");
    expect(settings.tax_id).toBe("12345678000199");
    expect(settings.state_tax_id).toBe("123456789");
    expect(settings.tax_regime).toBe(1);
    expect(settings.state_code).toBe("SP");
    expect(settings.city_code).toBe("3550308");
    expect(settings.environment).toBe(2);
  });

  it("updates existing settings (upsert)", async () => {
    const result = await caller.upsert({
      ...validSettings,
      company_name: "Updated Company Name",
      trade_name: "My Trade",
    });
    expect(result.success).toBe(true);

    const settings = await caller.get();
    expect(settings.company_name).toBe("Updated Company Name");
    expect(settings.trade_name).toBe("My Trade");
    // Unchanged fields preserved
    expect(settings.tax_id).toBe("12345678000199");
  });

  it("saves default fiscal fields", async () => {
    await caller.upsert({
      ...validSettings,
      default_ncm: "84715010",
      default_cfop: "5102",
      default_icms_cst: "00",
      default_pis_cst: "01",
      default_cofins_cst: "01",
    });

    const settings = await caller.get();
    expect(settings.default_ncm).toBe("84715010");
    expect(settings.default_pis_cst).toBe("01");
    expect(settings.default_cofins_cst).toBe("01");
  });

  it("saves CSC fields for NFC-e", async () => {
    await caller.upsert({
      ...validSettings,
      csc_id: "1",
      csc_token: "ABC123TOKEN",
    });

    const settings = await caller.get();
    expect(settings.csc_id).toBe("1");
    expect(settings.csc_token).toBe("ABC123TOKEN");
  });

  it("does not return raw PFX certificate in get()", async () => {
    const settings = await caller.get();
    // certificate_pfx should be boolean (true) or null, never raw Buffer
    expect(settings.certificate_pfx).not.toBeInstanceOf(Buffer);
  });
});

describe("fiscalSettings multi-tenancy", () => {
  it("settings are isolated per user", async () => {
    const other = callerAs("fiscal-user-2");
    const otherResult = await other.get();
    expect(otherResult).toBeNull(); // Other user has no settings

    await other.upsert({
      ...validSettings,
      company_name: "Other Company",
      tax_id: "98765432000188",
    });

    const otherSettings = await other.get();
    expect(otherSettings.company_name).toBe("Other Company");

    // Original user's settings unchanged (last upsert value)
    const mySettings = await caller.get();
    expect(mySettings.company_name).not.toBe("Other Company");
    expect(mySettings.tax_id).toBe("12345678000199");
  });
});
