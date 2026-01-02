import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string } };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const purchaseId = Number(params.id);

    if (Number.isNaN(purchaseId)) {
      return NextResponse.json({ error: "Invalid purchase id" }, { status: 400 });
    }

    const body = await request.json();
    const { productId, quantity, unitCost } = body;

    if (!productId || quantity === undefined || unitCost === undefined) {
      return NextResponse.json(
        { error: "productId, quantity, and unitCost are required" },
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
        { error: "Cannot add items to a cancelled purchase" },
        { status: 400 }
      );
    }

    // Create the item
    const newItem = await repos.purchaseItems.create({
      purchase_id: purchaseId,
      product_id: Number(productId),
      quantity: Number(quantity),
      unit_cost: Number(unitCost),
    });

    // Update purchase total
    const allItems = await repos.purchaseItems.findByPurchaseId(purchaseId);
    const newTotal = allItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0
    );

    await repos.purchases.update(purchaseId, { total_amount: newTotal });

    // Create stock movement
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supplier = await repos.suppliers.findById(purchase.supplier_id);

    const { error: smError } = await supabase
      .from("stock_movements")
      .insert({
        product_id: Number(productId),
        movement_type: "purchase",
        quantity: Number(quantity),
        unit_cost: Number(unitCost),
        notes: `Purchase #${purchaseId} from supplier: ${supplier?.name || "Unknown"}`,
        user_uid: user.id,
      });

    if (smError) {
      console.error("Error creating stock movement:", smError);
      // Don't fail the request if stock movement fails
    }

    // Return updated purchase
    const updatedPurchase = await repos.purchases.findById(purchaseId);
    return NextResponse.json(updatedPurchase);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("POST /api/purchases/[id]/items error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

