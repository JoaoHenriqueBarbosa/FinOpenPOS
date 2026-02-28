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

    if (transactionsData.length === 0) {
      return NextResponse.json({ profitMargin: [] });
    }

    const profitMargin = calculateProfitMarginSeries(transactionsData);

    return NextResponse.json({ profitMargin });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

function calculateProfitMarginSeries(
  txns: {
    amount: number;
    type: string | null;
    category: string | null;
    created_at: Date | null;
  }[]
) {
  const dailyData: { [key: string]: { selling: number; expense: number } } = {};

  txns.forEach((t) => {
    const date = t.created_at
      ? new Date(t.created_at).toISOString().split("T")[0]
      : "unknown";
    if (!dailyData[date]) {
      dailyData[date] = { selling: 0, expense: 0 };
    }

    if (t.category === "selling") {
      dailyData[date].selling += t.amount;
    } else if (t.type === "expense") {
      dailyData[date].expense += t.amount;
    }
  });

  return Object.entries(dailyData).map(([date, data]) => {
    const { selling, expense } = data;
    const profit = selling - expense;
    const margin = selling > 0 ? (profit / selling) * 100 : 0;
    return {
      date,
      margin: parseFloat(margin.toFixed(2)),
    };
  });
}
