import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq, and } from "drizzle-orm";

export const PUT = authHandler(async (user, request, { params }) => {
  const body = await request.json();
  const { transactionId } = await params;

  const data = await db
    .update(transactions)
    .set({ ...body, user_uid: user.id })
    .where(and(eq(transactions.id, Number(transactionId)), eq(transactions.user_uid, user.id)))
    .returning();

  if (data.length === 0) {
    return json({ error: "Transaction not found or not authorized" }, 404);
  }

  return json(data[0]);
});

export const DELETE = authHandler(async (user, _request, { params }) => {
  const { transactionId } = await params;

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, Number(transactionId)), eq(transactions.user_uid, user.id)));

  return json({ message: "Transaction deleted successfully" });
});
