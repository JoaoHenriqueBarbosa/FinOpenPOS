import { db } from "@/lib/db";
import { orders, orderItems, transactions, customers } from "@/lib/db/schema";
import { authHandler, json } from "@/lib/api";
import { eq } from "drizzle-orm";

export const GET = authHandler(async (user) => {
  const data = await db.query.orders.findMany({
    where: eq(orders.user_uid, user.id),
    with: {
      customer: {
        columns: { name: true },
      },
    },
  });

  return json(data);
});

export const POST = authHandler(async (user, request) => {
  const {
    customerId,
    paymentMethodId,
    products,
    total,
  }: {
    customerId: number;
    paymentMethodId: number;
    products: { id: number; quantity: number; price: number }[];
    total: number;
  } = await request.json();

  const result = await db.transaction(async (tx) => {
    const [orderData] = await tx
      .insert(orders)
      .values({
        customer_id: customerId,
        total_amount: total,
        user_uid: user.id,
        status: "completed",
      })
      .returning();

    await tx.insert(orderItems).values(
      products.map((product) => ({
        order_id: orderData.id,
        product_id: product.id,
        quantity: product.quantity,
        price: product.price,
      }))
    );

    await tx.insert(transactions).values({
      order_id: orderData.id,
      payment_method_id: paymentMethodId,
      amount: total,
      user_uid: user.id,
      status: "completed",
      category: "selling",
      type: "income",
      description: `Payment for order #${orderData.id}`,
    });

    const customer = customerId
      ? await tx.query.customers.findFirst({
          where: eq(customers.id, customerId),
          columns: { name: true },
        })
      : null;

    return { ...orderData, customer };
  });

  return json(result);
});
