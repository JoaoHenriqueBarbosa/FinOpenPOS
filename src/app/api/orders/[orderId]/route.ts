import { db } from "@/lib/db";
import { orders, orderItems, customers } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth-guard";
import { parseDecimals } from "@/lib/utils/parse-decimals";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updatedOrder = await request.json();
    const { orderId } = await params;

    const [data] = await db
      .update(orders)
      .set({ ...updatedOrder, user_uid: user.id })
      .where(
        and(eq(orders.id, Number(orderId)), eq(orders.user_uid, user.id))
      )
      .returning();

    if (!data) {
      return NextResponse.json(
        { error: "Order not found or not authorized" },
        { status: 404 }
      );
    }

    // Fetch customer name to match previous API shape
    const customer = data.customer_id
      ? await db.query.customers.findFirst({
          where: eq(customers.id, data.customer_id),
          columns: { name: true },
        })
      : null;

    return NextResponse.json(parseDecimals({ ...data, customer }, "total_amount"));
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await params;
    const id = Number(orderId);

    await db.transaction(async (tx) => {
      await tx.delete(orderItems).where(eq(orderItems.order_id, id));
      await tx
        .delete(orders)
        .where(and(eq(orders.id, id), eq(orders.user_uid, user.id)));
    });

    return NextResponse.json({
      message: "Order and related items deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
