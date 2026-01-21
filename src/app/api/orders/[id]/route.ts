export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = Number(params.id);

    if (Number.isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    }

    const order = await repos.orders.findByIdWithItems(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Si la orden está cerrada, obtener información de la transacción y método de pago
    let paymentInfo = null;
    if (order.status === "closed") {
      const { data: transaction } = await supabase
        .from("transactions")
        .select(
          `
          id,
          payment_method_id,
          amount,
          payment_method:payment_methods!payment_method_id (
            id,
            name
          )
        `
        )
        .eq("order_id", orderId)
        .eq("type", "income")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (transaction) {
        paymentInfo = {
          payment_method_id: transaction.payment_method_id,
          payment_method: transaction.payment_method,
          amount: transaction.amount,
        };
      }
    }

    // Incluir campos de descuento y payment_info en la respuesta
    const orderWithDiscounts = {
      ...order,
      discount_percentage: (order as any).discount_percentage ?? null,
      discount_amount: (order as any).discount_amount ?? null,
      payment_info: paymentInfo,
    };

    return NextResponse.json(orderWithDiscounts);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /orders/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = Number(params.id);

    if (Number.isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    }

    const body = await request.json();

    // Verificar que la orden existe
    const order = await repos.orders.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Si se están actualizando items, la orden debe estar abierta
    if (body.items && order.status !== 'open') {
      return NextResponse.json(
        { error: 'Cannot modify items of a non-open order' },
        { status: 400 }
      );
    }

    // Actualizar items si vienen en el body
    if (body.items && Array.isArray(body.items)) {
      await repos.orders.updateOrderItems(orderId, body.items);
    }

    // Actualizar otros campos si vienen en el body
    const updateFields: any = {};
    if (body.status !== undefined) {
      updateFields.status = body.status;
    }
    if (body.payment_method_id !== undefined) {
      updateFields.payment_method_id = body.payment_method_id;
    }

    if (Object.keys(updateFields).length > 0) {
      await repos.orders.update(orderId, updateFields);
    }

    // Obtener la orden actualizada con items
    const updatedOrder = await repos.orders.findByIdWithItems(orderId);
    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Si la orden está cerrada, obtener información de pago
    let paymentInfo = null;
    if (updatedOrder.status === "closed") {
      const { data: transaction } = await supabase
        .from("transactions")
        .select(
          `
          id,
          payment_method_id,
          amount,
          payment_method:payment_methods!payment_method_id (
            id,
            name
          )
        `
        )
        .eq("order_id", orderId)
        .eq("type", "income")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (transaction) {
        paymentInfo = {
          payment_method_id: transaction.payment_method_id,
          payment_method: transaction.payment_method,
          amount: transaction.amount,
        };
      }
    }

    // Incluir campos de descuento y payment_info en la respuesta
    const orderWithDiscounts = {
      ...updatedOrder,
      discount_percentage: (updatedOrder as any).discount_percentage ?? null,
      discount_amount: (updatedOrder as any).discount_amount ?? null,
      payment_info: paymentInfo,
    };

    return NextResponse.json(orderWithDiscounts);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('PATCH /orders/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
