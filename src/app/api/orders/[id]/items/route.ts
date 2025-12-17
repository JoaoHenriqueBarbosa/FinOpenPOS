import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string } };

// 🚀 POST /api/orders/:id/items
// body: { productId, quantity }
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const orderId = Number(params.id);
    
    if (Number.isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const body = await request.json();
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);

    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }
    if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    // Verify order exists and is open
    const order = await repos.orders.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Cannot modify a non-pending order" },
        { status: 400 }
      );
    }

    // Get product price
    const product = await repos.products.findById(productId);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Create order item
    await repos.orderItems.create({
      order_id: orderId,
      product_id: productId,
      quantity,
      unit_price: product.price,
    });

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
    console.error("POST /orders/:id/items error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
