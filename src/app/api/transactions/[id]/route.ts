// app/api/transactions/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type');       // income | expense
  const status = url.searchParams.get('status');   // pending | completed | failed
  const from = url.searchParams.get('from');       // '2025-01-01'
  const to = url.searchParams.get('to');           // '2025-01-31'
  const orderId = url.searchParams.get('orderId'); // opcional
  const customerId = url.searchParams.get('customerId'); // opcional

  let query = supabase
    .from('transactions')
    .select(
      `
      id,
      order_id,
      customer_id,
      payment_method_id,
      description,
      amount,
      type,
      status,
      created_at
    `
    )
    .eq('user_uid', user.id);

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (from) {
    query = query.gte('created_at', from);
  }

  if (to) {
    // sumo un día para incluir todo el día to (si te molesta, lo dejamos como lte directo)
    query = query.lte('created_at', to + ' 23:59:59');
  }

  if (orderId) {
    query = query.eq('order_id', Number(orderId));
  }

  if (customerId) {
    query = query.eq('customer_id', Number(customerId));
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('GET /transactions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const amount = Number(body.amount);
  if (!amount || Number.isNaN(amount)) {
    return NextResponse.json({ error: 'Amount is required and must be a number' }, { status: 400 });
  }

  const type = body.type === 'expense' ? 'expense' : 'income';
  const status = ['pending', 'completed', 'failed'].includes(body.status)
    ? body.status
    : 'completed';

  const newTx = {
    user_uid: user.id,
    order_id: body.orderId ?? null,
    customer_id: body.customerId ?? null,
    payment_method_id: body.paymentMethodId ?? null,
    description: body.description ?? null,
    amount,
    type,
    status,
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(newTx)
    .select(
      `
      id,
      order_id,
      customer_id,
      payment_method_id,
      description,
      amount,
      type,
      status,
      created_at
    `
    )
    .single();

  if (error) {
    console.error('POST /transactions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
