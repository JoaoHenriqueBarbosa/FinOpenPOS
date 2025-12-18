// app/api/players/[id]/route.ts
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';

type Params = { params: { id: string } };

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

export async function PATCH(request: Request, { params }: Params) {
  try {
    const repos = await createRepositories();
    const id = Number(params.id);
    const body = await request.json();

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const updateFields: Record<string, any> = {};

    if (typeof body.first_name === 'string') {
      updateFields.first_name = body.first_name.trim();
    }

    if (typeof body.last_name === 'string') {
      updateFields.last_name = body.last_name.trim();
    }

    if (typeof body.phone === 'string' || body.phone === null) {
      updateFields.phone = body.phone;
    }

    if (typeof body.status === 'string') {
      if (!['active', 'inactive'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateFields.status = body.status;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const player = await repos.players.update(id, updateFields);
    return NextResponse.json(player);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('PATCH /players/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const repos = await createRepositories();
    const id = Number(params.id);

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await repos.players.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /players/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
