// app/api/product-categories/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);

  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name, description, color, is_active, created_at')
    .eq('user_uid', user.id)
    .eq('id', id)
    .single();

  if (error) {
    console.error('GET /product-categories/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: Params) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);
  const body = await request.json();

  const updateFields: Record<string, any> = {};

  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }
    updateFields.name = name;
  }

  if (body.description !== undefined) {
    updateFields.description = body.description ?? null;
  }

  if (body.color !== undefined) {
    updateFields.color = body.color ?? null;
  }

  if (typeof body.is_active === 'boolean') {
    updateFields.is_active = body.is_active;
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json(
      { error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('product_categories')
    .update(updateFields)
    .eq('user_uid', user.id)
    .eq('id', id)
    .select('id, name, description, color, is_active, created_at')
    .single();

  if (error) {
    console.error('PATCH /product-categories/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: Params) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);

  // Soft delete: marcamos inactiva
  const { error } = await supabase
    .from('product_categories')
    .update({ is_active: false })
    .eq('user_uid', user.id)
    .eq('id', id);

  if (error) {
    console.error('DELETE /product-categories/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
