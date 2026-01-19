// app/api/players/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';

// Endpoint de solo lectura para socios (players)
// Los socios se crean y editan directamente desde la base de datos
export async function GET(request: Request) {
  try {
    const repos = await createRepositories();
    const url = new URL(request.url);
    const onlyActive = url.searchParams.get('onlyActive') === 'true';
    const search = url.searchParams.get('q')?.trim();

    const players = await repos.players.findAll({
      onlyActive,
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
