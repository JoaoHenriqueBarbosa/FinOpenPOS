import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string } };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const purchaseId = Number(params.id);
    
    if (Number.isNaN(purchaseId)) {
      return NextResponse.json({ error: "Invalid purchase id" }, { status: 400 });
    }

    const purchase = await repos.purchases.findById(purchaseId);
    
    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /api/purchases/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const purchaseId = Number(params.id);
    
    if (Number.isNaN(purchaseId)) {
      return NextResponse.json({ error: "Invalid purchase id" }, { status: 400 });
    }

    const body = await request.json();
    
    // Check if items are being updated
    if (body.items && Array.isArray(body.items)) {
      // Full update with items
      const supplierId = body.supplier_id !== undefined ? Number(body.supplier_id) : undefined;
      const paymentMethodId = body.payment_method_id !== undefined 
        ? (body.payment_method_id === null ? null : Number(body.payment_method_id))
        : undefined;
      const notes = body.notes !== undefined ? body.notes : undefined;

      // Verify purchase exists
      const currentPurchase = await repos.purchases.findById(purchaseId);
      if (!currentPurchase) {
        return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
      }

      if (currentPurchase.status === "cancelled") {
        return NextResponse.json(
          { error: "Cannot update a cancelled purchase" },
          { status: 400 }
        );
      }

      // Validate items
      for (const item of body.items) {
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

      // Calculate new total
      const newTotal = body.items.reduce(
        (sum: number, item: { quantity: number; unitCost: number }) => 
          sum + item.quantity * item.unitCost,
        0
      );

      // Delete all existing items
      await repos.purchaseItems.deleteByPurchaseId(purchaseId);

      // Create new items
      for (const item of body.items) {
        await repos.purchaseItems.create({
          purchase_id: purchaseId,
          product_id: Number(item.productId),
          quantity: Number(item.quantity),
          unit_cost: Number(item.unitCost),
        });
      }

      // Update purchase
      const updates: any = {
        total_amount: newTotal,
      };
      
      if (supplierId !== undefined) {
        updates.supplier_id = supplierId;
      }
      
      if (paymentMethodId !== undefined) {
        updates.payment_method_id = paymentMethodId;
        updates.status = paymentMethodId ? "completed" : "pending";
      }
      
      if (notes !== undefined) {
        updates.notes = notes;
      }

      // Handle transaction updates (similar to PUT logic)
      const finalPaymentMethodId = paymentMethodId !== undefined ? paymentMethodId : currentPurchase.payment_method_id;
      
      if (finalPaymentMethodId && !currentPurchase.transaction_id) {
        // Create transaction
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supplier = await repos.suppliers.findById(supplierId ?? currentPurchase.supplier_id);
        if (!supplier) {
          return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        const { data: paymentMethod, error: pmError } = await supabase
          .from("payment_methods")
          .select("id, name")
          .eq("id", finalPaymentMethodId)
          .eq("user_uid", user.id)
          .single();

        if (pmError || !paymentMethod) {
          return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
        }

        const { data: tx, error: txError } = await supabase
          .from("transactions")
          .insert({
            amount: newTotal,
            user_uid: user.id,
            type: "expense",
            status: "completed",
            payment_method_id: finalPaymentMethodId,
            description: `Purchase #${purchaseId} from ${supplier.name} (${paymentMethod.name})`,
          })
          .select("id")
          .single();

        if (txError) {
          throw new Error(`Failed to create transaction: ${txError.message}`);
        }

        updates.transaction_id = tx.id;
      } else if (finalPaymentMethodId === null && currentPurchase.transaction_id) {
        // Delete transaction
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { error: txDeleteError } = await supabase
          .from("transactions")
          .delete()
          .eq("id", currentPurchase.transaction_id)
          .eq("user_uid", user.id);

        if (txDeleteError) {
          console.error("Error deleting transaction:", txDeleteError);
        }

        updates.transaction_id = null;
      } else if (finalPaymentMethodId && currentPurchase.transaction_id) {
        // Update transaction amount
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { error: txUpdateError } = await supabase
          .from("transactions")
          .update({ amount: newTotal })
          .eq("id", currentPurchase.transaction_id)
          .eq("user_uid", user.id);

        if (txUpdateError) {
          console.error("Error updating transaction:", txUpdateError);
        }
      }

      // Create stock movements for new items
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const supplier = await repos.suppliers.findById(supplierId ?? currentPurchase.supplier_id);
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }

      const stockMovementsPayload = body.items.map((item: { productId: number; quantity: number; unitCost: number }) => ({
        product_id: Number(item.productId),
        movement_type: "purchase",
        quantity: Number(item.quantity),
        unit_cost: Number(item.unitCost),
        notes: `Purchase #${purchaseId} from supplier: ${supplier.name}`,
        user_uid: user.id,
      }));

      const { error: smError } = await supabase
        .from("stock_movements")
        .insert(stockMovementsPayload);

      if (smError) {
        console.error("Error creating stock movements:", smError);
        // Don't fail the request if stock movement fails
      }

      const updatedPurchase = await repos.purchases.update(purchaseId, updates);
      const finalPurchase = await repos.purchases.findById(purchaseId);
      
      return NextResponse.json(finalPurchase);
    } else {
      // Partial update (existing PUT logic)
      return handlePartialUpdate(request, { params });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PATCH /api/purchases/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePartialUpdate(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const purchaseId = Number(params.id);
    
    if (Number.isNaN(purchaseId)) {
      return NextResponse.json({ error: "Invalid purchase id" }, { status: 400 });
    }

    const body = await request.json();
    
    // Aceptar tanto snake_case como camelCase
    const paymentMethodId = body.payment_method_id !== undefined 
      ? (body.payment_method_id === null ? null : Number(body.payment_method_id))
      : (body.paymentMethodId !== undefined 
        ? (body.paymentMethodId === null ? null : Number(body.paymentMethodId))
        : undefined);
    
    const notes = body.notes !== undefined ? body.notes : undefined;
    const status = body.status !== undefined ? body.status : undefined;

    // Obtener la compra actual
    const currentPurchase = await repos.purchases.findById(purchaseId);
    if (!currentPurchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Determinar el nuevo status
    let newStatus: "pending" | "completed" | "cancelled" | undefined;
    if (status !== undefined) {
      // Si se envía status explícitamente, usarlo
      newStatus = status;
    } else if (paymentMethodId !== undefined) {
      // Si se cambia el método de pago, actualizar status según corresponda
      newStatus = paymentMethodId ? "completed" : "pending";
    }

    // Preparar los updates
    const updates: any = {};
    if (paymentMethodId !== undefined) {
      updates.payment_method_id = paymentMethodId;
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }
    if (newStatus !== undefined) {
      updates.status = newStatus;
    }

    // Si se está cancelando la compra y hay transacción, eliminar la transacción
    if (newStatus === "cancelled" && currentPurchase.transaction_id) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { error: txDeleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", currentPurchase.transaction_id)
        .eq("user_uid", user.id);

      if (txDeleteError) {
        console.error("Error deleting transaction:", txDeleteError);
        // No fallar si no se puede eliminar la transacción
      }

      updates.transaction_id = null;
    }

    // Si se está agregando un método de pago y no hay transacción, crear una
    if (paymentMethodId && !currentPurchase.transaction_id && newStatus !== "cancelled") {
      const supplier = await repos.suppliers.findById(currentPurchase.supplier_id);
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }

      // Necesitamos acceder al supabase client y userId desde el repositorio
      // Usaremos el repositorio de transacciones si existe, o crearemos la transacción directamente
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: paymentMethod, error: pmError } = await supabase
        .from("payment_methods")
        .select("id, name")
        .eq("id", paymentMethodId)
        .eq("user_uid", user.id)
        .single();

      if (pmError || !paymentMethod) {
        return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
      }

      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert({
          amount: currentPurchase.total_amount,
          user_uid: user.id,
          type: "expense",
          status: "completed",
          payment_method_id: paymentMethodId,
          description: `Purchase #${purchaseId} from ${supplier.name} (${paymentMethod.name})`,
        })
        .select("id")
        .single();

      if (txError) {
        throw new Error(`Failed to create transaction: ${txError.message}`);
      }

      updates.transaction_id = tx.id;
    }

    // Si se está removiendo el método de pago y hay transacción, eliminar la transacción
    if (paymentMethodId === null && currentPurchase.transaction_id) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { error: txDeleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", currentPurchase.transaction_id)
        .eq("user_uid", user.id);

      if (txDeleteError) {
        console.error("Error deleting transaction:", txDeleteError);
        // No fallar si no se puede eliminar la transacción
      }

      updates.transaction_id = null;
    }

    // Actualizar la compra
    const updatedPurchase = await repos.purchases.update(purchaseId, updates);

    return NextResponse.json(updatedPurchase);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PUT /api/purchases/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const purchaseId = Number(params.id);
    
    if (Number.isNaN(purchaseId)) {
      return NextResponse.json({ error: "Invalid purchase id" }, { status: 400 });
    }

    const body = await request.json();
    
    // Aceptar tanto snake_case como camelCase
    const paymentMethodId = body.payment_method_id !== undefined 
      ? (body.payment_method_id === null ? null : Number(body.payment_method_id))
      : (body.paymentMethodId !== undefined 
        ? (body.paymentMethodId === null ? null : Number(body.paymentMethodId))
        : undefined);
    
    const notes = body.notes !== undefined ? body.notes : undefined;
    const status = body.status !== undefined ? body.status : undefined;

    // Obtener la compra actual
    const currentPurchase = await repos.purchases.findById(purchaseId);
    if (!currentPurchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Determinar el nuevo status
    let newStatus: "pending" | "completed" | "cancelled" | undefined;
    if (status !== undefined) {
      // Si se envía status explícitamente, usarlo
      newStatus = status;
    } else if (paymentMethodId !== undefined) {
      // Si se cambia el método de pago, actualizar status según corresponda
      newStatus = paymentMethodId ? "completed" : "pending";
    }

    // Preparar los updates
    const updates: any = {};
    if (paymentMethodId !== undefined) {
      updates.payment_method_id = paymentMethodId;
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }
    if (newStatus !== undefined) {
      updates.status = newStatus;
    }

    // Si se está cancelando la compra y hay transacción, eliminar la transacción
    if (newStatus === "cancelled" && currentPurchase.transaction_id) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { error: txDeleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", currentPurchase.transaction_id)
        .eq("user_uid", user.id);

      if (txDeleteError) {
        console.error("Error deleting transaction:", txDeleteError);
        // No fallar si no se puede eliminar la transacción
      }

      updates.transaction_id = null;
    }

    // Si se está agregando un método de pago y no hay transacción, crear una
    if (paymentMethodId && !currentPurchase.transaction_id && newStatus !== "cancelled") {
      const supplier = await repos.suppliers.findById(currentPurchase.supplier_id);
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }

      // Necesitamos acceder al supabase client y userId desde el repositorio
      // Usaremos el repositorio de transacciones si existe, o crearemos la transacción directamente
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: paymentMethod, error: pmError } = await supabase
        .from("payment_methods")
        .select("id, name")
        .eq("id", paymentMethodId)
        .eq("user_uid", user.id)
        .single();

      if (pmError || !paymentMethod) {
        return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
      }

      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert({
          amount: currentPurchase.total_amount,
          user_uid: user.id,
          type: "expense",
          status: "completed",
          payment_method_id: paymentMethodId,
          description: `Purchase #${purchaseId} from ${supplier.name} (${paymentMethod.name})`,
        })
        .select("id")
        .single();

      if (txError) {
        throw new Error(`Failed to create transaction: ${txError.message}`);
      }

      updates.transaction_id = tx.id;
    }

    // Si se está removiendo el método de pago y hay transacción, eliminar la transacción
    if (paymentMethodId === null && currentPurchase.transaction_id) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { error: txDeleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", currentPurchase.transaction_id)
        .eq("user_uid", user.id);

      if (txDeleteError) {
        console.error("Error deleting transaction:", txDeleteError);
        // No fallar si no se puede eliminar la transacción
      }

      updates.transaction_id = null;
    }

    // Actualizar la compra
    const updatedPurchase = await repos.purchases.update(purchaseId, updates);

    return NextResponse.json(updatedPurchase);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PUT /api/purchases/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

