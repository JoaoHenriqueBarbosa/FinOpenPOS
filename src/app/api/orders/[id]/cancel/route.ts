import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

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
        player_id,
        total_amount,
        status,
        created_at,
        player:player_id ( first_name, last_name )
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
    .eq("order_id", orderId);

  if (itemsError) {
    throw new Error("Error fetching order items");
  }

  return {
    ...order,
    items: items ?? [],
  };
}

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

  try {
    // 1) Traer la order y verificar estado
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
        { error: "Only open orders can be cancelled" },
        { status: 400 }
      );
    }

    // 2) Borrar todos los items de la cuenta
    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (deleteItemsError) {
      console.error("Error deleting order items:", deleteItemsError);
      return NextResponse.json(
        { error: "Error deleting order items" },
        { status: 500 }
      );
    }

    // 3) Actualizar estado y total de la order
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "cancelled", total_amount: 0 })
      .eq("id", orderId)
      .eq("user_uid", user.id);

    if (updateError) {
      console.error("Error cancelling order:", updateError);
      return NextResponse.json(
        { error: "Error cancelling order" },
        { status: 500 }
      );
    }

    // 4) Devolver la order actualizada (sin items)
    const updatedOrder = await getOrderWithItems(supabase, orderId, user.id);
    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error("POST /orders/:id/cancel error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
