import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

// Helper: trae la order + items + customer
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
    .eq("user_uid", userId);

  if (itemsError) {
    throw new Error("Error fetching order items");
  }

  return {
    ...order,
    items: items ?? [],
  };
}

// Helper: recalcular total_amount según los items
async function recalcOrderTotal(
  supabase: ReturnType<typeof createClient>,
  orderId: number,
  userId: string
) {
  const { data, error } = await supabase
    .from("order_items")
    .select("quantity, unit_price")
    .eq("order_id", orderId)
    .eq("user_uid", userId);

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

// 🚀 POST /api/orders/:id/items
// body: { productId, quantity }
export async function POST(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    // Verificar que la order existe y es del usuario
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
        { error: "Cannot modify a non-pending order" },
        { status: 400 }
      );
    }

    // Obtener precio actual del producto
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, price")
      .eq("id", productId)
      .eq("user_uid", user.id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Por simplicidad: siempre insertamos un nuevo item.
    // (Podrías buscar si ya hay un item con ese product_id y sumar quantity.)
    const { error: insertError } = await supabase.from("order_items").insert({
      order_id: orderId,
      product_id: productId,
      quantity,
      unit_price: product.price,
      user_uid: user.id,
    });

    if (insertError) {
      console.error("Error inserting order item:", insertError);
      return NextResponse.json(
        { error: "Error inserting order item" },
        { status: 500 }
      );
    }

    await recalcOrderTotal(supabase, orderId, user.id);
    const updatedOrder = await getOrderWithItems(supabase, orderId, user.id);

    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error("POST /orders/:id/items error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ✏️ PATCH /api/orders/:id/items
// body: { itemId, quantity }
export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = Number(params.id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = await request.json();
  const itemId = Number(body.itemId);
  const quantity = Number(body.quantity);

  if (!itemId || Number.isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  }
  if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  try {
    // Asegurarnos que la order pertenece al usuario y está pending
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_uid", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Cannot modify a non-pending order" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("order_items")
      .update({ quantity })
      .eq("id", itemId)
      .eq("order_id", orderId)
      .eq("user_uid", user.id);

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
    console.error("PATCH /orders/:id/items error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 🗑️ DELETE /api/orders/:id/items?itemId=123
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = Number(params.id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const itemIdParam = url.searchParams.get("itemId");
  const itemId = itemIdParam ? Number(itemIdParam) : NaN;

  if (!itemIdParam || Number.isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  }

  try {
    // Verificar order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_uid", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Cannot modify a non-pending order" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId)
      .eq("order_id", orderId)
      .eq("user_uid", user.id);

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
    console.error("DELETE /orders/:id/items error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
