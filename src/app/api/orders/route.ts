import { db } from "@/lib/db";
import { orders, orderItems, transactions, customers } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth-guard";
import { parseDecimals } from "@/lib/utils/parse-decimals";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await db.query.orders.findMany({
      where: eq(orders.user_uid, user.id),
      with: {
        customer: {
          columns: { name: true },
        },
      },
    });

    return NextResponse.json(data.map((o) => parseDecimals(o, "total_amount")));
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const result = await db.transaction(async (tx) => {
      // Insert the order
      const [orderData] = await tx
        .insert(orders)
        .values({
          customer_id: customerId,
          total_amount: total,
          user_uid: user.id,
          status: "completed",
        })
        .returning();

      // Insert order items
      await tx.insert(orderItems).values(
        products.map((product) => ({
          order_id: orderData.id,
          product_id: product.id,
          quantity: product.quantity,
          price: product.price,
        }))
      );

      // Insert transaction record
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

      // Fetch customer name to match previous API shape
      const customer = customerId
        ? await tx.query.customers.findFirst({
            where: eq(customers.id, customerId),
            columns: { name: true },
          })
        : null;

      return { ...orderData, customer };
    });

    return NextResponse.json(parseDecimals(result, "total_amount"));
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
