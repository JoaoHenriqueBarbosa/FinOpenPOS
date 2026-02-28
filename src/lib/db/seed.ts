import { db } from ".";
import { paymentMethods } from "./schema";
import { sql } from "drizzle-orm";

export async function seed() {
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentMethods);

  if (existing[0].count > 0) return;

  await db.insert(paymentMethods).values([
    { name: "Credit Card" },
    { name: "Debit Card" },
    { name: "Cash" },
  ]);

  console.log("Seeded payment methods");
}
