import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export const dashboardRouter = router({
  stats: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/dashboard/stats", tags: ["Dashboard"], summary: "Get all dashboard statistics" } })
    .input(z.void())
    .output(
      z.object({
        totalRevenue: z.number(),
        totalExpenses: z.number(),
        totalProfit: z.number(),
        revenueByCategory: z.record(z.string(), z.number()),
        expensesByCategory: z.record(z.string(), z.number()),
        cashFlow: z.array(z.object({ date: z.string(), amount: z.number() })),
        profitMargin: z.array(z.object({ date: z.string(), margin: z.number() })),
      })
    )
    .query(async ({ ctx }) => {
      const uid = ctx.user.id;

      const allCompleted = await db
        .select({
          amount: transactions.amount,
          type: transactions.type,
          category: transactions.category,
          created_at: transactions.created_at,
        })
        .from(transactions)
        .where(and(eq(transactions.status, "completed"), eq(transactions.user_uid, uid)))
        .orderBy(asc(transactions.created_at));

      const totalRevenue = allCompleted
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);

      const totalExpenses = allCompleted
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);

      const totalSelling = allCompleted
        .filter((t) => t.category === "selling")
        .reduce((s, t) => s + t.amount, 0);

      const totalProfit = totalSelling - totalExpenses;

      const revenueByCategory = allCompleted
        .filter((t) => t.type === "income")
        .reduce<Record<string, number>>((acc, t) => {
          if (!t.category) return acc;
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {});

      const expensesByCategory = allCompleted
        .filter((t) => t.type === "expense")
        .reduce<Record<string, number>>((acc, t) => {
          if (!t.category) return acc;
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {});

      const cashFlow = allCompleted.reduce<Record<string, number>>((acc, t) => {
        const date = t.created_at
          ? new Date(t.created_at).toISOString().split("T")[0]
          : "unknown";
        acc[date] = (acc[date] || 0) + t.amount;
        return acc;
      }, {});

      const profitMargin = calculateProfitMarginSeries(allCompleted);

      return {
        totalRevenue,
        totalExpenses,
        totalProfit,
        revenueByCategory,
        expensesByCategory,
        cashFlow: Object.entries(cashFlow).map(([date, amount]) => ({ date, amount })),
        profitMargin,
      };
    }),
});

function calculateProfitMarginSeries(
  txns: { amount: number; type: string | null; category: string | null; created_at: Date | null }[]
) {
  const dailyData: Record<string, { selling: number; expense: number }> = {};

  for (const t of txns) {
    const date = t.created_at
      ? new Date(t.created_at).toISOString().split("T")[0]
      : "unknown";
    dailyData[date] ??= { selling: 0, expense: 0 };

    if (t.category === "selling") dailyData[date].selling += t.amount;
    else if (t.type === "expense") dailyData[date].expense += t.amount;
  }

  return Object.entries(dailyData).map(([date, { selling, expense }]) => {
    const profit = selling - expense;
    const margin = selling > 0 ? (profit / selling) * 100 : 0;
    return { date, margin: parseFloat(margin.toFixed(2)) };
  });
}
