import { db } from "@/lib/db";
import { orders, orderItems, customers } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq, and } from "drizzle-orm";

export const PUT = authHandler(async (user, request, { params }) => {
  const body = await request.json();
  const { orderId } = await params;

  const [data] = await db
    .update(orders)
    .set({ ...body, user_uid: user.id })
    .where(and(eq(orders.id, Number(orderId)), eq(orders.user_uid, user.id)))
    .returning();

  if (!data) {
    return json({ error: "Order not found or not authorized" }, 404);
  }

  const customer = data.customer_id
    ? await db.query.customers.findFirst({
        where: eq(customers.id, data.customer_id),
        columns: { name: true },
      })
    : null;

  return json({ ...data, customer });
});

export const DELETE = authHandler(async (user, _request, { params }) => {
  const { orderId } = await params;
  const id = Number(orderId);

  await db.transaction(async (tx) => {
    await tx.delete(orderItems).where(eq(orderItems.order_id, id));
    await tx
      .delete(orders)
      .where(and(eq(orders.id, id), eq(orders.user_uid, user.id)));
  });

  return json({ message: "Order and related items deleted successfully" });
});
