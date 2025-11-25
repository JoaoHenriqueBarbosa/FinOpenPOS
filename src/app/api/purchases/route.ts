import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const supplierId = Number(body.supplierId);
  const paymentMethodId =
    body.paymentMethodId !== undefined && body.paymentMethodId !== null
      ? Number(body.paymentMethodId)
      : null;
  const notes: string = body.notes ?? "";
  const items: Array<{
    productId: number;
    quantity: number;
    unitCost: number;
  }> = body.items ?? [];

  if (!supplierId || Number.isNaN(supplierId)) {
    return NextResponse.json(
      { error: "supplierId is required and must be a number" },
      { status: 400 }
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "At least one item is required" },
      { status: 400 }
    );
  }

  for (const item of items) {
    if (!item.productId || Number.isNaN(Number(item.productId))) {
      return NextResponse.json(
        { error: "Invalid productId in items" },
        { status: 400 }
      );
    }
    if (!item.quantity || item.quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid quantity in items" },
        { status: 400 }
      );
    }
    if (item.unitCost < 0) {
      return NextResponse.json(
        { error: "Invalid unitCost in items" },
        { status: 400 }
      );
    }
  }

  // Calcular total de la compra
  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  try {
    // 1) Verificar que el supplier existe y es del usuario
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", supplierId)
      .eq("user_uid", user.id)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // 2) Crear purchase (sin transaction_id aún)
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        supplier_id: supplierId,
        user_uid: user.id,
        total_amount: totalAmount,
        status: "completed",
        payment_method_id: paymentMethodId,
        notes,
      })
      .select("id, supplier_id, total_amount, status, created_at")
      .single();

    if (purchaseError || !purchase) {
      console.error("Error inserting purchase:", purchaseError);
      return NextResponse.json(
        { error: "Error inserting purchase" },
        { status: 500 }
      );
    }

    const purchaseId = purchase.id;

    // 3) Insertar purchase_items
    const purchaseItemsPayload = items.map((item) => ({
      purchase_id: purchaseId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_cost: item.unitCost,
    }));

    const { error: piError } = await supabase
      .from("purchase_items")
      .insert(purchaseItemsPayload);

    if (piError) {
      console.error("Error inserting purchase items:", piError);
      return NextResponse.json(
        { error: "Error inserting purchase items" },
        { status: 500 }
      );
    }

    // 4) Generar movimientos de stock
    const stockMovementsPayload = items.map((item) => ({
      product_id: item.productId,
      movement_type: "purchase",
      quantity: item.quantity,
      unit_cost: item.unitCost,
      notes: `Purchase #${purchaseId} from supplier: ${supplier.name}`,
      user_uid: user.id,
    }));

    const { error: smError } = await supabase
      .from("stock_movements")
      .insert(stockMovementsPayload);

    if (smError) {
      console.error("Error inserting stock movements:", smError);
      return NextResponse.json(
        { error: "Error inserting stock movements" },
        { status: 500 }
      );
    }

    // 5) Crear transaction como expense (si tiene payment_method)
    let transactionId: number | null = null;

    if (paymentMethodId) {
      const { data: pm, error: pmError } = await supabase
        .from("payment_methods")
        .select("id, name")
        .eq("id", paymentMethodId)
        .single();

      if (pmError || !pm) {
        return NextResponse.json(
          { error: "Payment method not found" },
          { status: 404 }
        );
      }

      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert({
          amount: totalAmount,
          user_uid: user.id,
          type: "expense",
          status: "completed",
          payment_method_id: paymentMethodId,
          description: `Purchase #${purchaseId} from ${supplier.name} (${pm.name})`,
        })
        .select("id")
        .single();

      if (txError || !tx) {
        console.error("Error inserting transaction:", txError);
        return NextResponse.json(
          { error: "Error inserting transaction" },
          { status: 500 }
        );
      }

      transactionId = tx.id;

      // 6) Actualizar purchase con transaction_id
      const { error: updatePurchaseError } = await supabase
        .from("purchases")
        .update({ transaction_id: transactionId })
        .eq("id", purchaseId)
        .eq("user_uid", user.id);

      if (updatePurchaseError) {
        console.error(
          "Error updating purchase with transaction_id:",
          updatePurchaseError
        );
      }
    }

    // 7) Devolver purchase básica + total
    return NextResponse.json({
      id: purchaseId,
      supplier_id: supplierId,
      total_amount: totalAmount,
      status: "completed",
      payment_method_id: paymentMethodId,
      transaction_id: transactionId,
      created_at: purchase.created_at,
    });
  } catch (err) {
    console.error("POST /api/purchases error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
