import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { createTestDb, makeUser, SCHEMA_DDL } from "./helpers";

const { pg, db } = createTestDb();
mock.module("@/lib/db", () => ({ db, pglite: pg }));

const { dashboardRouter } = await import("../dashboard");
const { createCallerFactory } = await import("../../init");
const { recordTransaction } = await import("@/lib/es");

const caller = createCallerFactory(dashboardRouter)({
	user: makeUser("user-1"),
});

beforeAll(async () => {
	await pg.exec(SCHEMA_DDL);

	// Seed (via event log) with exact, verifiable data:
	//
	// user-1, completed:
	//   income/selling  1000  2025-01-15
	//   income/selling   500  2025-01-15
	//   income/refund    200  2025-01-16
	//   expense/overhead 300  2025-01-15
	//   expense/overhead 100  2025-01-16
	//   income/(none)     50  2025-01-16    (no category)
	//   income/selling    25  2025-01-17
	//
	// user-1, pending (must be EXCLUDED):
	//   income/selling 9999  2025-01-15
	//
	// other-user, completed (must be EXCLUDED):
	//   income/selling 5000  2025-01-15

	const d15 = new Date("2025-01-15");
	const d16 = new Date("2025-01-16");
	const d17 = new Date("2025-01-17");

	await recordTransaction(
		"user-1",
		{
			description: "Sale 1",
			amount: 1000,
			type: "income",
			category: "selling",
			status: "completed",
		},
		d15,
	);
	await recordTransaction(
		"user-1",
		{
			description: "Sale 2",
			amount: 500,
			type: "income",
			category: "selling",
			status: "completed",
		},
		d15,
	);
	await recordTransaction(
		"user-1",
		{
			description: "Refund",
			amount: 200,
			type: "income",
			category: "refund",
			status: "completed",
		},
		d16,
	);
	await recordTransaction(
		"user-1",
		{
			description: "Rent",
			amount: 300,
			type: "expense",
			category: "overhead",
			status: "completed",
		},
		d15,
	);
	await recordTransaction(
		"user-1",
		{
			description: "Utils",
			amount: 100,
			type: "expense",
			category: "overhead",
			status: "completed",
		},
		d16,
	);
	await recordTransaction(
		"user-1",
		{
			description: "Pending",
			amount: 9999,
			type: "income",
			category: "selling",
			status: "pending",
		},
		d15,
	);
	await recordTransaction(
		"other-u",
		{
			description: "Other User",
			amount: 5000,
			type: "income",
			category: "selling",
			status: "completed",
		},
		d15,
	);
	await recordTransaction(
		"user-1",
		{ description: "NoCat", amount: 50, type: "income", status: "completed" },
		d16,
	);
	await recordTransaction(
		"user-1",
		{
			description: "Late Sale",
			amount: 25,
			type: "income",
			category: "selling",
			status: "completed",
		},
		d17,
	);
});

afterAll(async () => {
	await pg.close();
});

describe("dashboard.stats", () => {
	// Expected aggregations (user-1, completed only):
	//   totalRevenue  = 1000+500+200+50+25             = 1775
	//   totalExpenses = 300+100                         = 400
	//   totalSelling  = 1000+500+25                     = 1525
	//   totalProfit   = 1525 - 400                      = 1125

	it("totalRevenue = exact sum of completed income", async () => {
		const { totalRevenue } = await caller.stats();
		expect(totalRevenue).toBe(1775);
	});

	it("totalExpenses = exact sum of completed expense", async () => {
		const { totalExpenses } = await caller.stats();
		expect(totalExpenses).toBe(400);
	});

	it("totalProfit = selling - expenses (not all revenue)", async () => {
		const { totalProfit } = await caller.stats();
		expect(totalProfit).toBe(1125);
	});

	it("pending transaction (9999) is excluded from all aggregations", async () => {
		const stats = await caller.stats();
		// If pending leaked, revenue would be 1775+9999=11774
		expect(stats.totalRevenue).toBe(1775);
		// Also check it doesn't appear in cashFlow
		const cfMap = Object.fromEntries(
			stats.cashFlow.map((e) => [e.date, e.amount]),
		);
		// 2025-01-15 should be 1000+500+300=1800, not 1800+9999=11799
		expect(cfMap["2025-01-15"]).toBe(1800);
	});

	it("other user's data (5000) is excluded from all aggregations", async () => {
		const stats = await caller.stats();
		expect(stats.totalRevenue).toBe(1775);
		// revenueByCategory.selling should be 1525, not 1525+5000=6525
		expect(stats.revenueByCategory["selling"]).toBe(1525);
	});

	it("revenueByCategory groups correctly, missing category excluded from map", async () => {
		const { revenueByCategory } = await caller.stats();
		expect(revenueByCategory["selling"]).toBe(1525);
		expect(revenueByCategory["refund"]).toBe(200);
		expect("null" in revenueByCategory).toBe(false);
		expect(Object.keys(revenueByCategory).length).toBe(2);
		// 50 with no category is not in any bucket
		const sumOfBuckets = Object.values(revenueByCategory).reduce(
			(a, b) => a + b,
			0,
		);
		expect(sumOfBuckets).toBe(1725); // 1775 - 50(no category) = 1725
	});

	it("expensesByCategory groups correctly", async () => {
		const { expensesByCategory } = await caller.stats();
		expect(expensesByCategory["overhead"]).toBe(400);
		expect(Object.keys(expensesByCategory).length).toBe(1);
	});

	it("cashFlow groups by date", async () => {
		const { cashFlow } = await caller.stats();
		const cfMap = Object.fromEntries(cashFlow.map((e) => [e.date, e.amount]));

		// 2025-01-15: income 1000+500 + expense 300 = 1800
		expect(cfMap["2025-01-15"]).toBe(1800);
		// 2025-01-16: income 200+50 + expense 100 = 350
		expect(cfMap["2025-01-16"]).toBe(350);
		// 2025-01-17: income 25
		expect(cfMap["2025-01-17"]).toBe(25);
		// Exactly 3 entries
		expect(cashFlow.length).toBe(3);
	});

	it("profitMargin: selling>0 → (selling-expense)/selling*100", async () => {
		const { profitMargin } = await caller.stats();
		const pmMap = Object.fromEntries(
			profitMargin.map((e) => [e.date, e.margin]),
		);
		// 2025-01-15: selling=1500, expense=300 → (1200/1500)*100 = 80.00
		expect(pmMap["2025-01-15"]).toBe(80);
	});

	it("profitMargin: selling=0 → margin is 0", async () => {
		const { profitMargin } = await caller.stats();
		const pmMap = Object.fromEntries(
			profitMargin.map((e) => [e.date, e.margin]),
		);
		// 2025-01-16: selling=0, expense=100 → margin=0
		expect(pmMap["2025-01-16"]).toBe(0);
	});
});
