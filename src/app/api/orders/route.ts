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
