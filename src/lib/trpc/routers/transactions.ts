import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const transactionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.select().from(transactions).where(eq(transactions.user_uid, ctx.user.id));
  }),

  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1),
        amount: z.number().int().positive(),
        type: z.enum(["income", "expense"]),
        category: z.string().optional(),
        status: z.enum(["completed", "pending"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [data] = await db
        .insert(transactions)
        .values({ ...input, user_uid: ctx.user.id })
        .returning();
      return data;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        description: z.string().optional(),
        amount: z.number().int().positive().optional(),
        type: z.enum(["income", "expense"]).optional(),
        category: z.string().optional(),
        status: z.enum(["completed", "pending"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(transactions)
        .set({ ...data, user_uid: ctx.user.id })
        .where(and(eq(transactions.id, id), eq(transactions.user_uid, ctx.user.id)))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(transactions)
        .where(and(eq(transactions.id, input.id), eq(transactions.user_uid, ctx.user.id)));
      return { success: true };
    }),
});
