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
  const playerId = url.searchParams.get('playerId'); // opcional

  let query = supabase
    .from('transactions')
    .select(`
      id,
      order_id,
      player_id,
      payment_method_id,
      description,
      amount,
      type,
      status,
      created_at,
      payment_method:payment_method_id (
        id,
        name
      )
    `)
    .eq('user_uid', user.id);

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (from) {
    // Si from no tiene hora, agregar 00:00:00 para incluir desde el inicio del día
    const fromWithTime = from.includes(' ') ? from : `${from} 00:00:00`;
    query = query.gte('created_at', fromWithTime);
  }

  if (to) {
    // Si to no tiene hora, agregar 23:59:59 para incluir hasta el fin del día
    const toWithTime = to.includes(' ') ? to : `${to} 23:59:59`;
    query = query.lte('created_at', toWithTime);
  }

  if (orderId) {
    query = query.eq('order_id', Number(orderId));
  }

  if (playerId) {
    query = query.eq('player_id', Number(playerId));
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('GET /transactions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
