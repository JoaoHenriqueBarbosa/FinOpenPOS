// app/api/orders/client-ranking/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface ClientRankingItem {
  playerId: number;
  playerName: string;
  totalAmount: number;
  orderCount: number;
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');

    // Obtener órdenes cerradas con información del cliente
    // Excluir cliente de venta ocasional (id = 1)
    let ordersQuery = supabase
      .from('orders')
      .select(`
        id,
        player_id,
        total_amount,
        closed_at,
        player:player_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('status', 'closed')
      .neq('player_id', 1);

    // Filtrar por fecha de cierre (closed_at)
    if (fromDate) {
      const fromISO = new Date(fromDate + 'T00:00:00').toISOString();
      ordersQuery = ordersQuery.gte('closed_at', fromISO);
    }
    if (toDate) {
      const toISO = new Date(toDate + 'T23:59:59.999').toISOString();
      ordersQuery = ordersQuery.lte('closed_at', toISO);
    }

    const { data: orders, error } = await ordersQuery;

    if (error) {
      console.error('Error fetching client ranking:', error);
      return NextResponse.json(
        { error: 'Failed to fetch client ranking' },
        { status: 500 }
      );
    }

    // Agregar datos por cliente
    const clientStats = new Map<number, ClientRankingItem>();

    (orders || []).forEach((order: any) => {
      if (!order.player_id || !order.player) return;

      const player = Array.isArray(order.player) ? order.player[0] : order.player;
      const playerId = player.id;
      const playerName = `${player.first_name} ${player.last_name}`.trim();

      const existing = clientStats.get(playerId) || {
        playerId: playerId,
        playerName: playerName,
        totalAmount: 0,
        orderCount: 0,
      };

      existing.totalAmount += Number(order.total_amount || 0);
      existing.orderCount += 1;

      clientStats.set(playerId, existing);
    });

    // Convertir a array y ordenar por monto descendente
    const ranking = Array.from(clientStats.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    return NextResponse.json(ranking);
  } catch (error) {
    console.error('GET /orders/client-ranking error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
