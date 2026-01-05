// app/api/court-slots/[id]/route.ts
export const dynamic = 'force-dynamic'
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

    const slot = await repos.courtSlots.findById(id);
    if (!slot) {
      return NextResponse.json({ error: 'Court slot not found' }, { status: 404 });
    }

    return NextResponse.json(slot);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /court-slots/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const repos = await createRepositories();
    const slotId = Number(params.id);
    
    if (Number.isNaN(slotId)) {
      return NextResponse.json({ error: "Invalid slot id" }, { status: 400 });
    }

    const body = await request.json();

    const allowedFields = [
      "was_played",
      "notes",
      "player1_payment_method_id",
      "player1_note",
      "player2_payment_method_id",
      "player2_note",
      "player3_payment_method_id",
      "player3_note",
      "player4_payment_method_id",
      "player4_note",
    ] as const;

    const updatePayload: Record<string, any> = {};

    for (const key of allowedFields) {
      if (key in body) {
        updatePayload[key] = body[key];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const slot = await repos.courtSlots.update(slotId, updatePayload);
    return NextResponse.json(slot);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PATCH /court-slots/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
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

    await repos.courtSlots.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /court-slots/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
