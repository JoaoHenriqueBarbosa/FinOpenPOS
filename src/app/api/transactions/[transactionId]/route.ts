import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth-guard";
import { parseDecimals } from "@/lib/utils/parse-decimals";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updatedTransaction = await request.json();
    const { transactionId } = await params;

    const data = await db
      .update(transactions)
      .set({ ...updatedTransaction, user_uid: user.id })
      .where(
        and(
          eq(transactions.id, Number(transactionId)),
          eq(transactions.user_uid, user.id)
        )
      )
      .returning();

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(parseDecimals(data[0], "amount"));
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { transactionId } = await params;

    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.id, Number(transactionId)),
          eq(transactions.user_uid, user.id)
        )
      );

    return NextResponse.json({
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
