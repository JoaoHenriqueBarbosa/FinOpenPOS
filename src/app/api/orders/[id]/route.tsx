import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    // 1) Buscar la order del usuario
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
      .eq("user_uid", user.id)
      .single();

    if (orderError || !order) {
      console.error("GET /orders/[id] orderError:", orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2) Traer items de la order (no filtramos por user_uid acá)
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
      console.error("GET /orders/[id] itemsError:", itemsError);
      return NextResponse.json(
        { error: "Error fetching order items" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...order,
      items: items ?? [],
    });
  } catch (err) {
    console.error("GET /orders/[id] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
