import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth-guard";
import { eq, and, asc } from "drizzle-orm";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const transactionsData = await db
      .select({
        amount: transactions.amount,
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

    const cashFlow = transactionsData.reduce(
      (acc, t) => {
        const date = t.created_at
          ? new Date(t.created_at).toISOString().split("T")[0]
          : "unknown";
        acc[date] = (acc[date] || 0) + Number(t.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({ cashFlow });
  } catch (error) {
    console.error("Error fetching cash flow data:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash flow data" },
      { status: 500 }
    );
  }
}
