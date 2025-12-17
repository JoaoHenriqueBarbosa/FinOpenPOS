import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

// Helper: trae la order + items + player
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
    .eq("order_id", orderId)
    .eq("user_uid", userId)
    .order("id", { ascending: true });

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

// GET /api/orders/:id
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
    const order = await getOrderWithItems(supabase, orderId, user.id);
    return NextResponse.json(order);
  } catch (err) {
    console.error("GET /orders/:id error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/:id - Actualiza toda la orden con sus items
// body: { items: [{ id?, product_id, quantity, unit_price }] }
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
  const { items } = body as { items: Array<{ id?: number; product_id: number; quantity: number; unit_price: number }> };

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Items must be an array" }, { status: 400 });
  }

  try {
    // 1) Verificar que la orden existe y es del usuario
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

    // 2) Obtener items actuales de la BD
    const { data: currentItems, error: currentItemsError } = await supabase
      .from("order_items")
      .select("id, product_id, quantity, unit_price")
      .eq("order_id", orderId)
      .eq("user_uid", user.id);

    if (currentItemsError) {
      console.error("Error fetching current items:", currentItemsError);
      return NextResponse.json(
        { error: "Error fetching current items" },
        { status: 500 }
      );
    }

    const currentItemsMap = new Map(
      (currentItems ?? []).map((item) => [item.id, item])
    );
    const newItemsMap = new Map(
      items
        .filter((item) => item.id && item.id > 0) // Solo items con ID real (no temporales)
        .map((item) => [item.id!, item])
    );

    // 3) Identificar items a insertar, actualizar y eliminar
    const itemsToInsert: Array<{
      order_id: number;
      product_id: number;
      quantity: number;
      unit_price: number;
      user_uid: string;
    }> = [];
    const itemsToUpdate: Array<{ id: number; quantity: number }> = [];
    const itemsToDelete: number[] = [];

    // Items nuevos (sin ID o con ID negativo/temporal)
    for (const item of items) {
      if (!item.id || item.id <= 0) {
        // Verificar que el producto existe y obtener su precio actual
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, price")
          .eq("id", item.product_id)
          .eq("user_uid", user.id)
          .single();

        if (productError || !product) {
          console.warn(`Product ${item.product_id} not found, skipping`);
          continue;
        }

        itemsToInsert.push({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: product.price, // Usar precio actual del producto
          user_uid: user.id,
        });
      } else if (currentItemsMap.has(item.id)) {
        // Item existente que puede haber cambiado
        const currentItem = currentItemsMap.get(item.id)!;
        if (
          currentItem.quantity !== item.quantity ||
          currentItem.unit_price !== item.unit_price
        ) {
          itemsToUpdate.push({
            id: item.id,
            quantity: item.quantity,
          });
        }
      }
    }

    // Items a eliminar (están en BD pero no en la lista nueva)
    for (const [itemId] of currentItemsMap) {
      if (!newItemsMap.has(itemId)) {
        itemsToDelete.push(itemId);
      }
    }

    // 4) Ejecutar operaciones en orden: eliminar, actualizar, insertar
    if (itemsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId)
        .in("id", itemsToDelete);

      if (deleteError) {
        console.error("Error deleting items:", deleteError);
        return NextResponse.json(
          { error: "Error deleting items" },
          { status: 500 }
        );
      }
    }

    for (const update of itemsToUpdate) {
      const { error: updateError } = await supabase
        .from("order_items")
        .update({ quantity: update.quantity })
        .eq("id", update.id)
        .eq("order_id", orderId)
        .eq("user_uid", user.id);

      if (updateError) {
        console.error("Error updating item:", updateError);
        return NextResponse.json(
          { error: "Error updating item" },
          { status: 500 }
        );
      }
    }

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (insertError) {
        console.error("Error inserting items:", insertError);
        return NextResponse.json(
          { error: "Error inserting items" },
          { status: 500 }
        );
      }
    }

    // 5) Recalcular total y devolver orden actualizada
    await recalcOrderTotal(supabase, orderId, user.id);
    const updatedOrder = await getOrderWithItems(supabase, orderId, user.id);

    return NextResponse.json(updatedOrder);
  } catch (err) {
    console.error("PATCH /orders/:id error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

