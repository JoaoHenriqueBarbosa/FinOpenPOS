import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string; itemId: string } };

// --- helpers (same idea as before, pero sin user_uid en order_items) ---

async function getOrderWithItems(
  supabase: ReturnType<typeof createClient>,
  orderId: number,
  userId: string
) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
        id,
        customer_id,
        total_amount,
        status,
        created_at,
        customer:customer_id ( name )
      `
    )
    .eq("id", orderId)
    .eq("user_uid", userId)
    .single();

  if (orderError || !order) {
    throw new Error("Order not found");
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      `
        id,
        product_id,
        quantity,
        unit_price,
        product:product_id ( name )
      `
    )
    .eq("order_id", orderId)
    .order("id", { ascending: true });

  if (itemsError) {
    throw new Error("Error fetching order items");
  }

  return {
    ...order,
    items: items ?? [],
  };
}

async function recalcOrderTotal(
  supabase: ReturnType<typeof createClient>,
  orderId: number,
  userId: string
) {
  const { data, error } = await supabase
    .from("order_items")
    .select("quantity, unit_price")
    .eq("order_id", orderId);

  if (error) {
    throw new Error("Error calculating order total");
  }

  const total = (data ?? []).reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const { error: updateError } = await supabase
    .from("orders")
    .update({ total_amount: total })
    .eq("id", orderId)
    .eq("user_uid", userId);

  if (updateError) {
    throw new Error("Error updating order total");
  }
}

// ✏️ PATCH /api/orders/:id/items/:itemId
// body: { quantity }
export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    // check order belongs to user and is pending
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_uid", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Cannot modify a non-opened order" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("order_items")
      .update({ quantity })
      .eq("id", itemId)
      .eq("order_id", orderId);

    if (updateError) {
      console.error("Error updating order item:", updateError);
      return NextResponse.json(
        { error: "Error updating item" },
        { status: 500 }
      );
    }

    await recalcOrderTotal(supabase, orderId, user.id);
    const updatedOrder = await getOrderWithItems(supabase, orderId, user.id);

    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error("PATCH /orders/:id/items/:itemId error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 🗑️ DELETE /api/orders/:id/items/:itemId
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = Number(params.id);
  const itemId = Number(params.itemId);

  if (Number.isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }
  if (Number.isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  try {
    // check order belongs to user and is pending
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_uid", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Cannot modify a non-opened order" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId)
      .eq("order_id", orderId);

    if (deleteError) {
      console.error("Error deleting order item:", deleteError);
      return NextResponse.json(
        { error: "Error deleting item" },
        { status: 500 }
      );
    }

    await recalcOrderTotal(supabase, orderId, user.id);
    const updatedOrder = await getOrderWithItems(supabase, orderId, user.id);

    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error("DELETE /orders/:id/items/:itemId error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
