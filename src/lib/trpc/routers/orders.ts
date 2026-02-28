import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { orders, orderItems, transactions, customers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const ordersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
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

        return { ...orderData, customer };
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        total_amount: z.number().int().optional(),
        status: z.enum(["completed", "pending", "cancelled"]).optional(),
      })
    )
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

      return { ...updated, customer };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
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
