import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

// helpers (mismos que usamos en otros endpoints, pero copiados acá)

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
    .eq("order_id", orderId);

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

  return total;
}

// 💰 POST /api/orders/:id/pay
// body: { paymentMethodId, amount? }
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
  const paymentMethodId = Number(body.paymentMethodId);
  const amountInput =
    body.amount !== undefined && body.amount !== null
      ? Number(body.amount)
      : null;

  if (!paymentMethodId || Number.isNaN(paymentMethodId)) {
    return NextResponse.json(
      { error: "Invalid paymentMethodId" },
      { status: 400 }
    );
  }

  try {
    // 1) Traer la orden y validar que es del usuario y está abierta
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, total_amount")
      .eq("id", orderId)
      .eq("user_uid", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Order is not open" },
        { status: 400 }
      );
    }

    // 2) Asegurarnos que haya items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, quantity, unit_price, product_id")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("Error fetching items to pay:", itemsError);
      return NextResponse.json(
        { error: "Error fetching items" },
        { status: 500 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Cannot pay an empty order" },
        { status: 400 }
      );
    }

    // 3) Recalcular total por seguridad
    const total = await recalcOrderTotal(supabase, orderId, user.id);

    if (total <= 0) {
      return NextResponse.json(
        { error: "Order total is zero" },
        { status: 400 }
      );
    }

    // 4) Determinar monto a cobrar
    const amount = amountInput && !Number.isNaN(amountInput)
      ? amountInput
      : total;

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount to charge" },
        { status: 400 }
      );
    }

    // (opcional) podrías validar amount >= total, pero para buffet
    // con cambio quizás no hace falta hacer drama.

    // 5) Validar que el método de pago existe (aunque sea global)
    const { data: paymentMethod, error: pmError } = await supabase
      .from("payment_methods")
      .select("id, name")
      .eq("id", paymentMethodId)
      .single();

    if (pmError || !paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // 6) Crear transaction
    const { error: txError } = await supabase.from("transactions").insert({
      order_id: orderId,
      payment_method_id: paymentMethodId,
      amount,
      user_uid: user.id,
      type: "income",
      status: "completed",
      description: `Payment for order #${orderId} (${paymentMethod.name})`,
    });

    if (txError) {
      console.error("Error creating transaction:", txError);
      return NextResponse.json(
        { error: "Error creating transaction" },
        { status: 500 }
      );
    }

    // 7) Crear movimientos de stock tipo 'sale'
    //    Usamos quantity > 0 y movement_type = 'sale'.
    const stockMovementsPayload = items.map((item: any) => ({
      product_id: item.product_id,
      movement_type: "sale",
      quantity: item.quantity, // positiva, en los cálculos restás cuando movement_type = 'sale'
      unit_cost: item.unit_price, // acá queda el precio de venta por unidad
      notes: `Venta (order #${orderId})`,
      user_uid: user.id,
    }));

    const { error: smError } = await supabase
      .from("stock_movements")
      .insert(stockMovementsPayload);

    if (smError) {
      console.error("Error inserting stock movements (sale):", smError);
      // Si querés ser ultra prolijo, podrías hacer rollback de la transaction acá.
      return NextResponse.json(
        { error: "Error inserting stock movements" },
        { status: 500 }
      );
    }

    // 8) Marcar order como completed
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ status: "closed" })
      .eq("id", orderId)
      .eq("user_uid", user.id);

    if (updateOrderError) {
      console.error("Error updating order status:", updateOrderError);
      return NextResponse.json(
        { error: "Error updating order status" },
        { status: 500 }
      );
    }

    // 9) Devolver la orden actualizada con items (para refrescar la UI)
    const updatedOrder = await getOrderWithItems(supabase, orderId, user.id);
    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error("POST /orders/:id/pay error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
