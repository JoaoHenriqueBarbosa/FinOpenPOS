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
    const expensesData = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "expense"),
          eq(transactions.user_uid, user.id),
          eq(transactions.status, "completed")
        )
      );

    const totalExpenses = expensesData.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    return NextResponse.json({ totalExpenses });
  } catch (error) {
    console.error("Error fetching total expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch total expenses" },
      { status: 500 }
    );
  }
}
