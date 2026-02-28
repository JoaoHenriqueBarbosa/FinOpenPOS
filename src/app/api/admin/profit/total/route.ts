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

    const sellingTransactions = transactionsData.filter(
      (t) => t.category === "selling"
    );
    const expenseTransactions = transactionsData.filter(
      (t) => t.type === "expense"
    );

    const totalSelling = sellingTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );
    const totalExpenses = expenseTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    const totalProfit = totalSelling - totalExpenses;

    return NextResponse.json({ totalProfit });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
