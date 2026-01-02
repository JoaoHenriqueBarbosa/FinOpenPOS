import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";
import type { PurchaseStatus } from "@/models/db/purchase";

export async function GET(request: Request) {
  try {
    const repos = await createRepositories();
    const url = new URL(request.url);
    const supplierIdParam = url.searchParams.get("supplierId");
    const paymentMethodIdParam = url.searchParams.get("paymentMethodId");
    const statusParam = url.searchParams.get("status");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const purchases = await repos.purchases.findAll();

    return NextResponse.json(purchases);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching purchases" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const repos = await createRepositories();
    const body = await request.json();

    // Aceptar tanto snake_case como camelCase para compatibilidad
    const supplierId = Number(body.supplier_id || body.supplierId);
    const paymentMethodId =
      (body.payment_method_id !== undefined && body.payment_method_id !== null)
        ? Number(body.payment_method_id)
        : (body.paymentMethodId !== undefined && body.paymentMethodId !== null)
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
        { error: "supplier_id is required and must be a number" },
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

    // Verify supplier exists
    const supplier = await repos.suppliers.findById(supplierId);
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Create purchase with items, stock movements, and transaction
    const purchase = await repos.purchases.createWithItems({
      supplier_id: supplierId,
      payment_method_id: paymentMethodId,
      notes,
      items,
    });

    return NextResponse.json({
      id: purchase.id,
      supplier_id: supplierId,
      total_amount: purchase.total_amount,
      status: purchase.status,
      payment_method_id: paymentMethodId,
      transaction_id: purchase.transaction_id,
      created_at: purchase.created_at,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("POST /api/purchases error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
