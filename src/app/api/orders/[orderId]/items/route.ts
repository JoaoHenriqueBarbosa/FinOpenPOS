// app/api/orders/[id]/items/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orderId = Number(params.id);
  const { products } = await request.json();
  // products: [{ id, quantity, price }, ...]

  const orderItems = products.map(
    (p: { id: number; quantity: number; price: number }) => ({
      user_uid: user.id,
      order_id: orderId,
      product_id: p.id,
      quantity: p.quantity,
      unit_price: p.price,
    })
  );

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // recalcular total
  const { data: rows, error: sumError } = await supabase
    .from('order_items')
    .select('total_price')
    .eq('user_uid', user.id)
    .eq('order_id', orderId);

  if (sumError) {
    return NextResponse.json({ error: sumError.message }, { status: 500 });
  }

  const totalAmount = (rows ?? []).reduce(
    (acc, row) => acc + Number(row.total_price),
    0
  );

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ total_amount: totalAmount })
    .eq('user_uid', user.id)
    .eq('id', orderId)
    .select('id, customer_id, status, total_amount, created_at, closed_at')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updatedOrder);
}
