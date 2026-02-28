import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq, and } from "drizzle-orm";

export const GET = authHandler(async (user) => {
  const revenueData = await db
    .select({ amount: transactions.amount, category: transactions.category })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "completed"),
        eq(transactions.type, "income"),
        eq(transactions.user_uid, user.id)
      )
    );

  const revenueByCategory = revenueData.reduce(
    (acc, item) => {
      const category = item.category;
      if (!category) return acc;
      acc[category] = (acc[category] || 0) + item.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  return json({ revenueByCategory });
});
