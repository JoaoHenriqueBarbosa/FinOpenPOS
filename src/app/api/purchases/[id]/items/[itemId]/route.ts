export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string; itemId: string } };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const purchaseId = Number(params.id);
    const itemId = Number(params.itemId);

    if (Number.isNaN(purchaseId) || Number.isNaN(itemId)) {
      return NextResponse.json({ error: "Invalid purchase or item id" }, { status: 400 });
    }

    const body = await request.json();
    const { quantity, unitCost } = body;

    if (quantity === undefined && unitCost === undefined) {
      return NextResponse.json(
        { error: "quantity or unitCost must be provided" },
        { status: 400 }
      );
    }

    // Verify purchase exists and is not cancelled
    const purchase = await repos.purchases.findById(purchaseId);
    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot update items in a cancelled purchase" },
        { status: 400 }
      );
    }

    // Get current item to check if product changed
    const allItems = await repos.purchaseItems.findByPurchaseId(purchaseId);
    const currentItem = allItems.find((item) => item.id === itemId);
    
    if (!currentItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Update item (we need to delete and recreate since there's no update method)
    // For now, we'll delete and recreate
    await repos.purchaseItems.delete(itemId);
    
    const updatedItem = await repos.purchaseItems.create({
      purchase_id: purchaseId,
      product_id: currentItem.product_id,
      quantity: quantity !== undefined ? Number(quantity) : currentItem.quantity,
      unit_cost: unitCost !== undefined ? Number(unitCost) : currentItem.unit_cost,
    });

    // Update purchase total
    const updatedItems = await repos.purchaseItems.findByPurchaseId(purchaseId);
    const newTotal = updatedItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0
    );

    await repos.purchases.update(purchaseId, { total_amount: newTotal });

    // Return updated purchase
    const updatedPurchase = await repos.purchases.findById(purchaseId);
    return NextResponse.json(updatedPurchase);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PATCH /api/purchases/[id]/items/[itemId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const purchaseId = Number(params.id);
    const itemId = Number(params.itemId);

    if (Number.isNaN(purchaseId) || Number.isNaN(itemId)) {
      return NextResponse.json({ error: "Invalid purchase or item id" }, { status: 400 });
    }

    // Verify purchase exists and is not cancelled
    const purchase = await repos.purchases.findById(purchaseId);
    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot delete items from a cancelled purchase" },
        { status: 400 }
      );
    }

    // Delete the item
    await repos.purchaseItems.delete(itemId);

    // Update purchase total
    const allItems = await repos.purchaseItems.findByPurchaseId(purchaseId);
    const newTotal = allItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0
    );

    await repos.purchases.update(purchaseId, { total_amount: newTotal });

    // Return updated purchase
    const updatedPurchase = await repos.purchases.findById(purchaseId);
    return NextResponse.json(updatedPurchase);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("DELETE /api/purchases/[id]/items/[itemId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

