import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
	createCustomer,
	deleteCustomer,
	listCustomers,
	updateCustomer,
} from "@/lib/es";
import { protectedProcedure, router } from "../init";

const customerSchema = z.object({
	id: z.number(),
	name: z.string(),
	email: z.string(),
	phone: z.string().nullable(),
	status: z.string().nullable(),
	user_uid: z.string(),
	created_at: z.date().nullable(),
});

export const customersRouter = router({
	list: protectedProcedure
		.meta({
			openapi: {
				method: "GET",
				path: "/customers",
				tags: ["Customers"],
				summary: "List all customers",
			},
		})
		.input(z.void())
		.output(z.array(customerSchema))
		.query(async ({ ctx }) => {
			return listCustomers(ctx.user.id);
		}),

	create: protectedProcedure
		.meta({
			openapi: {
				method: "POST",
				path: "/customers",
				tags: ["Customers"],
				summary: "Create a customer",
			},
		})
		.input(
			z.object({
				name: z.string().min(1),
				email: z.string().email(),
				phone: z.string().optional(),
				status: z.enum(["active", "inactive"]).optional(),
			}),
		)
		.output(customerSchema)
		.mutation(async ({ ctx, input }) => {
			return createCustomer(ctx.user.id, input);
		}),

	update: protectedProcedure
		.meta({
			openapi: {
				method: "PATCH",
				path: "/customers/{id}",
				tags: ["Customers"],
				summary: "Update a customer",
			},
		})
		.input(
			z.object({
				id: z.number(),
				name: z.string().min(1).optional(),
				email: z.string().email().optional(),
				phone: z.string().optional(),
				status: z.enum(["active", "inactive"]).optional(),
			}),
		)
		.output(customerSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;
			const updated = await updateCustomer(ctx.user.id, id, data);
			if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
			return updated;
		}),

	delete: protectedProcedure
		.meta({
			openapi: {
				method: "DELETE",
				path: "/customers/{id}",
				tags: ["Customers"],
				summary: "Delete a customer",
			},
		})
		.input(z.object({ id: z.number() }))
		.output(z.object({ success: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			await deleteCustomer(ctx.user.id, input.id);
			return { success: true };
		}),
});
