// app/api/customers/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const onlyActive = url.searchParams.get('onlyActive') === 'true';
  const search = url.searchParams.get('q')?.trim();

  let query = supabase
    .from('customers')
    .select('id, name, email, phone, status, created_at')
    .eq('user_uid', user.id);

  if (onlyActive) {
    query = query.eq('status', 'active');
  }

  if (search && search !== '') {
    // Búsqueda simple por nombre o teléfono
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('GET /customers error:', error);
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
  const name = String(body.name ?? '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const newCustomer = {
    user_uid: user.id,
    name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    status: body.status === 'inactive' ? 'inactive' : 'active',
  };

  const { data, error } = await supabase
    .from('customers')
    .insert(newCustomer)
    .select('id, name, email, phone, status, created_at')
    .single();

  if (error) {
    console.error('POST /customers error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
