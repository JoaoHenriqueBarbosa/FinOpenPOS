import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const paymentMethodsRouter = router({
  list: protectedProcedure.query(async () => {
    return db.select().from(paymentMethods);
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [data] = await db
        .insert(paymentMethods)
        .values({ name: input.name.trim() })
        .returning();
      return data;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [data] = await db
        .update(paymentMethods)
        .set({ name: input.name.trim() })
        .where(eq(paymentMethods.id, input.id))
        .returning();
      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(paymentMethods).where(eq(paymentMethods.id, input.id));
      return { success: true };
    }),
});
