import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq, and, asc } from "drizzle-orm";

export const GET = authHandler(async (user) => {
  const data = await db
    .select({ amount: transactions.amount, type: transactions.type, category: transactions.category })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "completed"),
        eq(transactions.user_uid, user.id)
      )
    )
    .orderBy(asc(transactions.created_at));

  const totalSelling = data
    .filter((t) => t.category === "selling")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = data
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return json({ totalProfit: totalSelling - totalExpenses });
});
