import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq } from "drizzle-orm";

export const GET = authHandler(async (user) => {
  const data = await db
    .select()
    .from(products)
    .where(eq(products.user_uid, user.id));

  return json(data);
});

export const POST = authHandler(async (user, request) => {
  const body = await request.json();

  const [data] = await db
    .insert(products)
    .values({ ...body, user_uid: user.id })
    .returning();

  return json(data);
});
