// app/api/products/[id]/route.ts
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
    .from('products')
    .select('*')
    .eq('user_uid', user.id)
    .eq('id', id)
    .single();

  if (error) {
    console.error('GET /products/[id] error:', error);
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
  const allowedFields = [
    'name',
    'description',
    'price',
    'stock_quantity',
    'uses_stock',
    'min_stock',
    'category_id',
    'is_active',
  ];

  for (const key of allowedFields) {
    if (key in body) {
      updateFields[key] = body[key];
    }
  }

  // actualizamos updated_at
  updateFields.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('products')
    .update(updateFields)
    .eq('user_uid', user.id)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('PATCH /products/[id] error:', error);
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

  // Podés hacer soft-delete (is_active = false) si preferís
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('user_uid', user.id)
    .eq('id', id);

  if (error) {
    console.error('DELETE /products/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
