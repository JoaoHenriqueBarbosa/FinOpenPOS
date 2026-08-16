import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
	deleteTransaction,
	listTransactions,
	recordTransaction,
	updateTransaction,
} from "@/lib/es";
import { protectedProcedure, router } from "../init";

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
		.meta({
			openapi: {
				method: "GET",
				path: "/transactions",
				tags: ["Transactions"],
				summary: "List all transactions",
			},
		})
		.input(z.void())
		.output(z.array(transactionSchema))
		.query(async ({ ctx }) => {
			return listTransactions(ctx.user.id);
		}),

	create: protectedProcedure
		.meta({
			openapi: {
				method: "POST",
				path: "/transactions",
				tags: ["Transactions"],
				summary: "Create a transaction",
			},
		})
		.input(
			z.object({
				description: z.string().min(1),
				amount: z.number().int().positive(),
				type: z.enum(["income", "expense"]),
				category: z.string().optional(),
				status: z.enum(["completed", "pending"]).optional(),
			}),
		)
		.output(transactionSchema)
		.mutation(async ({ ctx, input }) => {
			return recordTransaction(ctx.user.id, input);
		}),

	update: protectedProcedure
		.meta({
			openapi: {
				method: "PATCH",
				path: "/transactions/{id}",
				tags: ["Transactions"],
				summary: "Update a transaction",
			},
		})
		.input(
			z.object({
				id: z.number(),
				description: z.string().optional(),
				amount: z.number().int().positive().optional(),
				type: z.enum(["income", "expense"]).optional(),
				category: z.string().optional(),
				status: z.enum(["completed", "pending"]).optional(),
			}),
		)
		.output(transactionSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;
			const updated = await updateTransaction(ctx.user.id, id, data);
			if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
			return updated;
		}),

	delete: protectedProcedure
		.meta({
			openapi: {
				method: "DELETE",
				path: "/transactions/{id}",
				tags: ["Transactions"],
				summary: "Delete a transaction",
			},
		})
		.input(z.object({ id: z.number() }))
		.output(z.object({ success: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			await deleteTransaction(ctx.user.id, input.id);
			return { success: true };
		}),
});
