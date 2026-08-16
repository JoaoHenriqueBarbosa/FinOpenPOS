import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
	createPaymentMethod,
	deletePaymentMethod,
	listPaymentMethods,
	renamePaymentMethod,
} from "@/lib/es";
import { protectedProcedure, router } from "../init";

const paymentMethodSchema = z.object({
	id: z.number(),
	name: z.string(),
	created_at: z.date().nullable(),
});

export const paymentMethodsRouter = router({
	list: protectedProcedure
		.meta({
			openapi: {
				method: "GET",
				path: "/payment-methods",
				tags: ["Payment Methods"],
				summary: "List all payment methods",
			},
		})
		.input(z.void())
		.output(z.array(paymentMethodSchema))
		.query(async () => {
			return listPaymentMethods();
		}),

	create: protectedProcedure
		.meta({
			openapi: {
				method: "POST",
				path: "/payment-methods",
				tags: ["Payment Methods"],
				summary: "Create a payment method",
			},
		})
		.input(z.object({ name: z.string().min(1) }))
		.output(paymentMethodSchema)
		.mutation(async ({ ctx, input }) => {
			return createPaymentMethod(ctx.user.id, input.name.trim());
		}),

	update: protectedProcedure
		.meta({
			openapi: {
				method: "PATCH",
				path: "/payment-methods/{id}",
				tags: ["Payment Methods"],
				summary: "Update a payment method",
			},
		})
		.input(z.object({ id: z.number(), name: z.string().min(1) }))
		.output(paymentMethodSchema)
		.mutation(async ({ ctx, input }) => {
			const updated = await renamePaymentMethod(
				ctx.user.id,
				input.id,
				input.name.trim(),
			);
			if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
			return updated;
		}),

	delete: protectedProcedure
		.meta({
			openapi: {
				method: "DELETE",
				path: "/payment-methods/{id}",
				tags: ["Payment Methods"],
				summary: "Delete a payment method",
			},
		})
		.input(z.object({ id: z.number() }))
		.output(z.object({ success: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			await deletePaymentMethod(ctx.user.id, input.id);
			return { success: true };
		}),
});
