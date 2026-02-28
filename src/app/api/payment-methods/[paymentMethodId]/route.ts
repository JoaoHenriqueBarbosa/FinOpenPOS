import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq } from "drizzle-orm";

export const PUT = authHandler(async (_user, request, { params }) => {
  const { paymentMethodId } = await params;
  const { name } = await request.json();

  if (!name?.trim()) {
    return json({ error: "Name is required" }, 400);
  }

  const [data] = await db
    .update(paymentMethods)
    .set({ name: name.trim() })
    .where(eq(paymentMethods.id, Number(paymentMethodId)))
    .returning();

  if (!data) {
    return json({ error: "Payment method not found" }, 404);
  }

  return json(data);
});

export const DELETE = authHandler(async (_user, _request, { params }) => {
  const { paymentMethodId } = await params;

  await db
    .delete(paymentMethods)
    .where(eq(paymentMethods.id, Number(paymentMethodId)));

  return json({ success: true });
});
