// app/api/orders/[id]/pay/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orderId = Number(params.id);
  const { paymentMethodId } = await request.json();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_id, total_amount, status')
    .eq('user_uid', user.id)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'open') {
    return NextResponse.json({ error: 'Order is not open' }, { status: 400 });
  }

  const amount = Number(order.total_amount);

  const { error: txError } = await supabase.from('transactions').insert({
    user_uid: user.id,
    order_id: orderId,
    customer_id: order.customer_id,
    payment_method_id: paymentMethodId,
    amount,
    type: 'income',
    status: 'completed',
    description: `Payment for order #${orderId}`,
  });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  const { data: closedOrder, error: closeError } = await supabase
    .from('orders')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('user_uid', user.id)
    .eq('id', orderId)
    .select('id, customer_id, status, total_amount, created_at, closed_at')
    .single();

  if (closeError) {
    return NextResponse.json({ error: closeError.message }, { status: 500 });
  }

  return NextResponse.json(closedOrder);
}
