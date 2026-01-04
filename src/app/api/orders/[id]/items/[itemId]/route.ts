export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string; itemId: string } };

// ✏️ PATCH /api/orders/:id/items/:itemId
// body: { quantity }
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const orderId = Number(params.id);
    const itemId = Number(params.itemId);

    if (Number.isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
    }

    const body = await request.json();
    const quantity = Number(body.quantity);

    if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    // Check order belongs to user and is open
    const order = await repos.orders.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Cannot modify a non-opened order" },
        { status: 400 }
      );
    }

    // Update item
    await repos.orderItems.update(itemId, { quantity });

    // Recalculate total
    const total = await repos.orderItems.calculateOrderTotal(orderId);
    await repos.orders.update(orderId, { total_amount: total });

    // Return updated order
    const updatedOrder = await repos.orders.findByIdWithItems(orderId);
    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PATCH /orders/:id/items/:itemId error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// 🗑️ DELETE /api/orders/:id/items/:itemId
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const orderId = Number(params.id);
    const itemId = Number(params.itemId);

    if (Number.isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
    }

    // Check order belongs to user and is open
    const order = await repos.orders.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Cannot modify a non-opened order" },
        { status: 400 }
      );
    }

    // Delete item
    await repos.orderItems.delete(itemId);

    // Recalculate total
    const total = await repos.orderItems.calculateOrderTotal(orderId);
    await repos.orders.update(orderId, { total_amount: total });

    // Return updated order
    const updatedOrder = await repos.orders.findByIdWithItems(orderId);
    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("DELETE /orders/:id/items/:itemId error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
