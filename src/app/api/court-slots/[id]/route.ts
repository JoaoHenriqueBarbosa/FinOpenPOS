// app/api/court-slots/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);

  const { data, error } = await supabase
    .from('court_slots')
    .select(
      `
      id,
      court_id,
      slot_date,
      start_time,
      end_time,
      was_played,
      notes,
      player1_payment_method_id,
      player1_paid,
      player1_note,
      player2_payment_method_id,
      player2_paid,
      player2_note,
      player3_payment_method_id,
      player3_paid,
      player3_note,
      player4_payment_method_id,
      player4_paid,
      player4_note,
      created_at
    `
    )
    .eq('user_uid', user.id)
    .eq('id', id)
    .single();

  if (error) {
    console.error('GET /court-slots/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);
  const body = await request.json();

  const updateFields: Record<string, any> = {};

  if (typeof body.was_played === 'boolean') {
    updateFields.was_played = body.was_played;
  }

  if (body.notes !== undefined) {
    updateFields.notes = body.notes ?? null;
  }

  // Campos por jugador
  const fields = [
    'player1_payment_method_id',
    'player1_paid',
    'player1_note',
    'player2_payment_method_id',
    'player2_paid',
    'player2_note',
    'player3_payment_method_id',
    'player3_paid',
    'player3_note',
    'player4_payment_method_id',
    'player4_paid',
    'player4_note',
  ];

  for (const key of fields) {
    if (body[key] !== undefined) {
      updateFields[key] = body[key];
    }
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('court_slots')
    .update(updateFields)
    .eq('user_uid', user.id)
    .eq('id', id)
    .select(
      `
      id,
      court_id,
      slot_date,
      start_time,
      end_time,
      was_played,
      notes,
      player1_payment_method_id,
      player1_paid,
      player1_note,
      player2_payment_method_id,
      player2_paid,
      player2_note,
      player3_payment_method_id,
      player3_paid,
      player3_note,
      player4_payment_method_id,
      player4_paid,
      player4_note,
      created_at
    `
    )
    .single();

  if (error) {
    console.error('PATCH /court-slots/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);

  const { error } = await supabase
    .from('court_slots')
    .delete()
    .eq('user_uid', user.id)
    .eq('id', id);

  if (error) {
    console.error('DELETE /court-slots/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
