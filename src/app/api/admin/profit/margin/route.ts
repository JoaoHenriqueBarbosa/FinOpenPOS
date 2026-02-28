import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq, and, asc } from "drizzle-orm";

export const GET = authHandler(async (user) => {
  const data = await db
    .select({
      amount: transactions.amount,
      type: transactions.type,
      category: transactions.category,
      created_at: transactions.created_at,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "completed"),
        eq(transactions.user_uid, user.id)
      )
    )
    .orderBy(asc(transactions.created_at));

  if (data.length === 0) {
    return json({ profitMargin: [] });
  }

  return json({ profitMargin: calculateProfitMarginSeries(data) });
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
