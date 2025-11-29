// app/api/orders/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status'); // ?status=open/closed opcional

  let query = supabase
    .from('orders')
    .select(`
      id,
      customer_id,
      total_amount,
      user_uid,
      status,
      created_at,
      closed_at,
      customer:customer_id (
        name
      )
    `)
    .eq('user_uid', user.id);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { customerId } = await request.json();

  // 🔒 Validación: siempre tiene que venir un customerId
  if (!customerId) {
    return NextResponse.json(
      { error: 'customerId is required' },
      { status: 400 }
    );
  }

  // 🔒 Chequear si ya existe una cuenta OPEN para ese cliente y usuario
  const { data: existingOpenOrders, error: existingError } = await supabase
    .from('orders')
    .select('id')
    .eq('user_uid', user.id)
    .eq('customer_id', customerId)
    .eq('status', 'open')
    .limit(1);

  if (existingError) {
    console.error('Error checking existing open orders:', existingError);
    return NextResponse.json(
      { error: 'Error checking existing open orders' },
      { status: 500 }
    );
  }

  if (existingOpenOrders && existingOpenOrders.length > 0) {
    // ⚠️ Ya hay una cuenta abierta para este cliente
    const existingOrder = existingOpenOrders[0];
    return NextResponse.json(
      {
        error: 'Customer already has an open order',
        orderId: existingOrder.id,
      },
      { status: 409 }
    );
  }

  // ✅ Crear nueva orden
  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      total_amount: 0,
      user_uid: user.id,
      status: 'open',
    })
    .select(`
      id,
      customer_id,
      total_amount,
      user_uid,
      status,
      created_at,
      closed_at,
      customer:customer_id ( name )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
