import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const transactionSchema = z.object({
  id: z.number(),
  description: z.string().nullable(),
  amount: z.number(),
  type: z.string().nullable(),
  category: z.string().nullable(),
  status: z.string().nullable(),
  order_id: z.number().nullable(),
  payment_method_id: z.number().nullable(),
  user_uid: z.string(),
  created_at: z.date().nullable(),
});

export const transactionsRouter = router({
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/transactions", tags: ["Transactions"], summary: "List all transactions" } })
    .input(z.void())
    .output(z.array(transactionSchema))
    .query(async ({ ctx }) => {
      return db.select().from(transactions).where(eq(transactions.user_uid, ctx.user.id));
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/transactions", tags: ["Transactions"], summary: "Create a transaction" } })
    .input(
      z.object({
        description: z.string().min(1),
        amount: z.number().int().positive(),
        type: z.enum(["income", "expense"]),
        category: z.string().optional(),
        status: z.enum(["completed", "pending"]).optional(),
      })
    )
    .output(transactionSchema)
    .mutation(async ({ ctx, input }) => {
      const [data] = await db
        .insert(transactions)
        .values({ ...input, user_uid: ctx.user.id })
        .returning();
      return data;
    }),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/transactions/{id}", tags: ["Transactions"], summary: "Update a transaction" } })
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
    .output(transactionSchema)
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
    .meta({ openapi: { method: "DELETE", path: "/transactions/{id}", tags: ["Transactions"], summary: "Delete a transaction" } })
    .input(z.object({ id: z.number() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(transactions)
        .where(and(eq(transactions.id, input.id), eq(transactions.user_uid, ctx.user.id)));
      return { success: true };
    }),
});
