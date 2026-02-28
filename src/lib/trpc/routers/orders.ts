import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { orders, orderItems, transactions, customers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const orderWithCustomerSchema = z.object({
  id: z.number(),
  customer_id: z.number().nullable(),
  total_amount: z.number(),
  status: z.string().nullable(),
  user_uid: z.string(),
  created_at: z.date().nullable(),
  customer: z.object({ name: z.string() }).nullable(),
});

export const ordersRouter = router({
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/orders", tags: ["Orders"], summary: "List all orders" } })
    .input(z.void())
    .output(z.array(orderWithCustomerSchema))
    .query(async ({ ctx }) => {
      return db.query.orders.findMany({
        where: eq(orders.user_uid, ctx.user.id),
        with: {
          customer: {
            columns: { name: true },
          },
        },
      });
    }),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/orders", tags: ["Orders"], summary: "Create an order with items" } })
    .input(
      z.object({
        customerId: z.number(),
        paymentMethodId: z.number(),
        products: z.array(
          z.object({
            id: z.number(),
            quantity: z.number().int().positive(),
            price: z.number().int(),
          })
        ),
        total: z.number().int(),
      })
    )
    .output(orderWithCustomerSchema)
    .mutation(async ({ ctx, input }) => {
      return db.transaction(async (tx) => {
        const [orderData] = await tx
          .insert(orders)
          .values({
            customer_id: input.customerId,
            total_amount: input.total,
            user_uid: ctx.user.id,
            status: "completed",
          })
          .returning();

        await tx.insert(orderItems).values(
          input.products.map((product) => ({
            order_id: orderData.id,
            product_id: product.id,
            quantity: product.quantity,
            price: product.price,
          }))
        );

        await tx.insert(transactions).values({
          order_id: orderData.id,
          payment_method_id: input.paymentMethodId,
          amount: input.total,
          user_uid: ctx.user.id,
          status: "completed",
          category: "selling",
          type: "income",
          description: `Payment for order #${orderData.id}`,
        });

        const customer = input.customerId
          ? await tx.query.customers.findFirst({
              where: eq(customers.id, input.customerId),
              columns: { name: true },
            })
          : null;

        return { ...orderData, customer: customer ?? null };
      });
    }),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/orders/{id}", tags: ["Orders"], summary: "Update an order" } })
    .input(
      z.object({
        id: z.number(),
        total_amount: z.number().int().optional(),
        status: z.enum(["completed", "pending", "cancelled"]).optional(),
      })
    )
    .output(orderWithCustomerSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(orders)
        .set({ ...data, user_uid: ctx.user.id })
        .where(and(eq(orders.id, id), eq(orders.user_uid, ctx.user.id)))
        .returning();

      const customer = updated?.customer_id
        ? await db.query.customers.findFirst({
            where: eq(customers.id, updated.customer_id),
            columns: { name: true },
          })
        : null;

      return { ...updated, customer: customer ?? null };
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/orders/{id}", tags: ["Orders"], summary: "Delete an order and its items" } })
    .input(z.object({ id: z.number() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db.transaction(async (tx) => {
        await tx.delete(orderItems).where(eq(orderItems.order_id, input.id));
        await tx
          .delete(orders)
          .where(and(eq(orders.id, input.id), eq(orders.user_uid, ctx.user.id)));
      });
      return { success: true };
    }),
});
