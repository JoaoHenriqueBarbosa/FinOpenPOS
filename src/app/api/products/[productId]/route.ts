import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq, and } from "drizzle-orm";

export const PUT = authHandler(async (user, request, { params }) => {
  const body = await request.json();
  const { productId } = await params;

  const data = await db
    .update(products)
    .set({ ...body, user_uid: user.id })
    .where(and(eq(products.id, Number(productId)), eq(products.user_uid, user.id)))
    .returning();

  if (data.length === 0) {
    return json({ error: "Product not found or not authorized" }, 404);
  }

  return json(data[0]);
});

export const DELETE = authHandler(async (user, _request, { params }) => {
  const { productId } = await params;

  await db
    .delete(products)
    .where(and(eq(products.id, Number(productId)), eq(products.user_uid, user.id)));

  return json({ message: "Product deleted successfully" });
});
