import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";

export const GET = authHandler(async () => {
  const data = await db.select().from(paymentMethods);
  return json(data);
});

export const POST = authHandler(async (_user, request) => {
  const { name } = await request.json();

  if (!name?.trim()) {
    return json({ error: "Name is required" }, 400);
  }

  const [data] = await db
    .insert(paymentMethods)
    .values({ name: name.trim() })
    .returning();

  return json(data);
});
