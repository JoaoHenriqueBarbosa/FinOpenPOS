import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq, and } from "drizzle-orm";

export const PUT = authHandler(async (user, request, { params }) => {
  const body = await request.json();
  const { customerId } = await params;

  const data = await db
    .update(customers)
    .set({ ...body, user_uid: user.id })
    .where(and(eq(customers.id, Number(customerId)), eq(customers.user_uid, user.id)))
    .returning();

  if (data.length === 0) {
    return json({ error: "Customer not found or not authorized" }, 404);
  }

  return json(data[0]);
});

export const DELETE = authHandler(async (user, _request, { params }) => {
  const { customerId } = await params;

  await db
    .delete(customers)
    .where(and(eq(customers.id, Number(customerId)), eq(customers.user_uid, user.id)));

  return json({ message: "Customer deleted successfully" });
});
