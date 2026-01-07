export const dynamic = 'force-dynamic'
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
      payment_method:payment_methods!payment_method_id (
        id,
        name
      )
    `);

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (from) {
    // El frontend ahora envía ISO strings que ya representan el inicio del día en zona horaria local
    // convertidos a UTC. Si viene como "YYYY-MM-DD HH:MM:SS", mantener compatibilidad.
    // Si viene como ISO string completo, usarlo directamente.
    if (from.includes('T') || from.includes('Z')) {
      // Es un ISO string completo (viene del frontend con zona horaria local convertida)
      query = query.gte('created_at', from);
    } else if (from.includes(' ')) {
      // Formato "YYYY-MM-DD HH:MM:SS" (legacy, mantener compatibilidad)
      query = query.gte('created_at', from);
    } else {
      // Formato "YYYY-MM-DD" - interpretar como inicio del día en UTC (legacy)
      query = query.gte('created_at', `${from} 00:00:00`);
    }
  }

  if (to) {
    // El frontend ahora envía ISO strings que ya representan el fin del día en zona horaria local
    // convertidos a UTC. Si viene como "YYYY-MM-DD HH:MM:SS", mantener compatibilidad.
    // Si viene como ISO string completo, usarlo directamente.
    if (to.includes('T') || to.includes('Z')) {
      // Es un ISO string completo (viene del frontend con zona horaria local convertida)
      query = query.lte('created_at', to);
    } else if (to.includes(' ')) {
      // Formato "YYYY-MM-DD HH:MM:SS" (legacy, mantener compatibilidad)
      query = query.lte('created_at', to);
    } else {
      // Formato "YYYY-MM-DD" - interpretar como fin del día en UTC (legacy)
      query = query.lte('created_at', `${to} 23:59:59`);
    }
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
