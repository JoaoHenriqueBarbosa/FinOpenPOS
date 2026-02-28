import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth-guard";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const revenueData = await db
      .select({
        amount: transactions.amount,
        category: transactions.category,
      })
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
        const amount = Number(item.amount);
        acc[category] = (acc[category] || 0) + amount;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({ revenueByCategory });
  } catch (error) {
    console.error("Error fetching revenue by category:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue by category" },
      { status: 500 }
    );
  }
}
