// app/api/transactions/[id]/route.ts
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
    .from('transactions')
    .select(
      `
      id,
      order_id,
      customer_id,
      payment_method_id,
      description,
      amount,
      type,
      status,
      created_at
    `
    )
    .eq('user_uid', user.id)
    .eq('id', id)
    .single();

  if (error) {
    console.error('GET /transactions/[id] error:', error);
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

  if (body.description !== undefined) {
    updateFields.description = body.description ?? null;
  }

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!amount || Number.isNaN(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    updateFields.amount = amount;
  }

  if (body.paymentMethodId !== undefined) {
    updateFields.payment_method_id = body.paymentMethodId ?? null;
  }

  if (body.orderId !== undefined) {
    updateFields.order_id = body.orderId ?? null;
  }

  if (body.customerId !== undefined) {
    updateFields.customer_id = body.customerId ?? null;
  }

  if (body.type !== undefined) {
    if (!['income', 'expense'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    updateFields.type = body.type;
  }

  if (body.status !== undefined) {
    if (!['pending', 'completed', 'failed'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updateFields.status = body.status;
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(updateFields)
    .eq('user_uid', user.id)
    .eq('id', id)
    .select(
      `
      id,
      order_id,
      customer_id,
      payment_method_id,
      description,
      amount,
      type,
      status,
      created_at
    `
    )
    .single();

  if (error) {
    console.error('PATCH /transactions/[id] error:', error);
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
    .from('transactions')
    .delete()
    .eq('user_uid', user.id)
    .eq('id', id);

  if (error) {
    console.error('DELETE /transactions/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}