import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq, and } from "drizzle-orm";

export const GET = authHandler(async (user) => {
  const revenueData = await db
    .select({ amount: transactions.amount })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "income"),
        eq(transactions.user_uid, user.id),
        eq(transactions.status, "completed")
      )
    );

  const totalRevenue = revenueData.reduce((sum, t) => sum + t.amount, 0);

  return json({ totalRevenue });
});
