import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const paymentMethodSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.date().nullable(),
});

export const paymentMethodsRouter = router({
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/payment-methods", tags: ["Payment Methods"], summary: "List all payment methods" } })
    .input(z.void())
    .output(z.array(paymentMethodSchema))
    .query(async () => {
      return db.select().from(paymentMethods);
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/payment-methods", tags: ["Payment Methods"], summary: "Create a payment method" } })
    .input(z.object({ name: z.string().min(1) }))
    .output(paymentMethodSchema)
    .mutation(async ({ input }) => {
      const [data] = await db
        .insert(paymentMethods)
        .values({ name: input.name.trim() })
        .returning();
      return data;
    }),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/payment-methods/{id}", tags: ["Payment Methods"], summary: "Update a payment method" } })
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .output(paymentMethodSchema)
    .mutation(async ({ input }) => {
      const [data] = await db
        .update(paymentMethods)
        .set({ name: input.name.trim() })
        .where(eq(paymentMethods.id, input.id))
        .returning();
      return data;
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/payment-methods/{id}", tags: ["Payment Methods"], summary: "Delete a payment method" } })
    .input(z.object({ id: z.number() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      await db.delete(paymentMethods).where(eq(paymentMethods.id, input.id));
      return { success: true };
    }),
});
