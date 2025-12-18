import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string } };

// GET /api/orders/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const repos = await createRepositories();
    const orderId = Number(params.id);
    
    if (Number.isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const order = await repos.orders.findByIdWithItems(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /orders/:id error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/:id - Actualiza toda la orden con sus items
// body: { items: [{ id?, product_id, quantity, unit_price }] }
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const orderId = Number(params.id);
    
    if (Number.isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const body = await request.json();
    const { items } = body as { items: Array<{ id?: number; product_id: number; quantity: number; unit_price: number }> };

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items must be an array" }, { status: 400 });
    }

    // Verify order exists and is open
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

    // Update items
    const updatedOrder = await repos.orders.updateOrderItems(orderId, items);
    return NextResponse.json(updatedOrder);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PATCH /orders/:id error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

