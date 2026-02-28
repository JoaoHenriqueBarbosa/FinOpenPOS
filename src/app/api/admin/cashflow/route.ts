import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq, and, asc } from "drizzle-orm";

export const GET = authHandler(async (user) => {
  const data = await db
    .select({ amount: transactions.amount, created_at: transactions.created_at })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "completed"),
        eq(transactions.user_uid, user.id)
      )
    )
    .orderBy(asc(transactions.created_at));

  const cashFlow = data.reduce(
    (acc, t) => {
      const date = t.created_at
        ? new Date(t.created_at).toISOString().split("T")[0]
        : "unknown";
      acc[date] = (acc[date] || 0) + t.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  return json({ cashFlow });
});
