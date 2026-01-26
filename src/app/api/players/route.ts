// app/api/players/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';

import type { PlayerStatusFilter } from "@/models/db/player";

export async function GET(request: Request) {
  try {
    const repos = await createRepositories();
    const url = new URL(request.url);
    const onlyActiveParam = url.searchParams.get('onlyActive');
    const onlyActive = onlyActiveParam === null ? true : onlyActiveParam === 'true';
    const rawStatusParam = url.searchParams.get('status');
    const normalizedStatusParam = rawStatusParam?.toLowerCase();
    const allowedStatuses: PlayerStatusFilter[] = ["active", "inactive", "all"];
    const requestedStatus =
      normalizedStatusParam &&
      allowedStatuses.includes(normalizedStatusParam as PlayerStatusFilter)
        ? (normalizedStatusParam as PlayerStatusFilter)
        : null;
    const effectiveStatus: PlayerStatusFilter =
      requestedStatus ?? (onlyActive ? "active" : "all");
    const search = url.searchParams.get('q')?.trim();

    const players = await repos.players.findAll({
      status: effectiveStatus,
      search: search ?? undefined,
    });

    return NextResponse.json(players);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /players error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const repos = await createRepositories();
    const body = await request.json();
    
    const first_name = String(body.first_name ?? '').trim();
    if (!first_name) {
      return NextResponse.json({ error: 'First Name is required' }, { status: 400 });
    }

    const last_name = String(body.last_name ?? '').trim();
    if (!last_name) {
      return NextResponse.json({ error: 'Last Name is required' }, { status: 400 });
    }

    const phone = String(body.phone ?? '').trim();
    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }

    const player = await repos.players.create({
      first_name,
      last_name,
      phone: body.phone ?? null,
      status: body.status === 'inactive' ? 'inactive' : 'active',
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /players error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
