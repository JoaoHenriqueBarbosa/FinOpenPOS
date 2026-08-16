import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
	createProduct,
	deleteProduct,
	listProducts,
	updateProduct,
} from "@/lib/es";
import { protectedProcedure, router } from "../init";

const productSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string().nullable(),
	price: z.number(),
	in_stock: z.number(),
	category: z.string().nullable(),
	user_uid: z.string(),
	ncm: z.string().nullable(),
	cfop: z.string().nullable(),
	icms_cst: z.string().nullable(),
	pis_cst: z.string().nullable(),
	cofins_cst: z.string().nullable(),
	unit_of_measure: z.string().nullable(),
	created_at: z.date().nullable(),
});

export const productsRouter = router({
	list: protectedProcedure
		.meta({
			openapi: {
				method: "GET",
				path: "/products",
				tags: ["Products"],
				summary: "List all products",
			},
		})
		.input(z.void())
		.output(z.array(productSchema))
		.query(async ({ ctx }) => {
			return listProducts(ctx.user.id);
		}),

	create: protectedProcedure
		.meta({
			openapi: {
				method: "POST",
				path: "/products",
				tags: ["Products"],
				summary: "Create a product",
			},
		})
		.input(
			z.object({
				name: z.string().min(1),
				description: z.string().optional(),
				price: z.number().int(),
				in_stock: z.number().int().min(0),
				category: z.string().optional(),
				ncm: z.string().max(8).optional(),
				cfop: z.string().max(4).optional(),
				icms_cst: z.string().max(3).optional(),
				pis_cst: z.string().max(2).optional(),
				cofins_cst: z.string().max(2).optional(),
				unit_of_measure: z.string().max(6).optional(),
			}),
		)
		.output(productSchema)
		.mutation(async ({ ctx, input }) => {
			return createProduct(ctx.user.id, input);
		}),

	update: protectedProcedure
		.meta({
			openapi: {
				method: "PATCH",
				path: "/products/{id}",
				tags: ["Products"],
				summary: "Update a product",
			},
		})
		.input(
			z.object({
				id: z.number(),
				name: z.string().min(1).optional(),
				description: z.string().optional(),
				price: z.number().int().optional(),
				in_stock: z.number().int().min(0).optional(),
				category: z.string().optional(),
				ncm: z.string().max(8).optional(),
				cfop: z.string().max(4).optional(),
				icms_cst: z.string().max(3).optional(),
				pis_cst: z.string().max(2).optional(),
				cofins_cst: z.string().max(2).optional(),
				unit_of_measure: z.string().max(6).optional(),
			}),
		)
		.output(productSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;
			const updated = await updateProduct(ctx.user.id, id, data);
			if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
			return updated;
		}),

	delete: protectedProcedure
		.meta({
			openapi: {
				method: "DELETE",
				path: "/products/{id}",
				tags: ["Products"],
				summary: "Delete a product",
			},
		})
		.input(z.object({ id: z.number() }))
		.output(z.object({ success: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			await deleteProduct(ctx.user.id, input.id);
			return { success: true };
		}),
});
