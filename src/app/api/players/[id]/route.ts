// app/api/players/[id]/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';

type Params = { params: { id: string } };

// Endpoint de solo lectura para socios (players)
// Los socios se crean y editan directamente desde la base de datos
export async function GET(_request: Request, { params }: Params) {
  try {
    const repos = await createRepositories();
    const id = Number(params.id);

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const player = await repos.players.findById(id);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /players/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
