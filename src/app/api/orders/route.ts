// app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';
import type { OrderStatus } from '@/models/db/order';

export async function GET(request: Request) {
  try {
    const repos = await createRepositories();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as OrderStatus | null;

    const orders = await repos.orders.findAll(status ?? undefined);
    return NextResponse.json(orders);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /orders error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const repos = await createRepositories();
    const { playerId } = await request.json();

    // 🔒 Validación: siempre tiene que venir un playerId
    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    // 🔒 Chequear si ya existe una cuenta OPEN para ese cliente
    const { hasOpen, orderId } = await repos.orders.hasOpenOrder(playerId);

    if (hasOpen) {
      return NextResponse.json(
        {
          error: 'Player already has an open order',
          orderId,
        },
        { status: 409 }
      );
    }

    // ✅ Crear nueva orden
    const order = await repos.orders.create({
      playerId,
      total_amount: 0,
      status: 'open',
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /orders error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
