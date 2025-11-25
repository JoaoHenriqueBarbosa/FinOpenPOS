// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const categoryId = url.searchParams.get('categoryId');
  const search = url.searchParams.get('q');
  const onlyActive = url.searchParams.get('onlyActive') === 'true';

  let query = supabase
    .from('products')
    .select('*')
    .eq('user_uid', user.id);

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  if (categoryId) {
    query = query.eq('category_id', Number(categoryId));
  }

  if (search && search.trim() !== '') {
    // simple búsqueda por nombre
    query = query.ilike('name', `%${search.trim()}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('GET /products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Campos que esperamos para un producto nuevo
  const newProduct = {
    name: body.name,
    description: body.description ?? null,
    price: body.price,
    uses_stock: body.uses_stock ?? true,
    min_stock: body.min_stock ?? 0,
    category_id: body.category_id ?? null,
    is_active: body.is_active ?? true,
    user_uid: user.id,
  };

  const { data, error } = await supabase
    .from('products')
    .insert([newProduct])
    .select()
    .single();

  if (error) {
    console.error('POST /products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
