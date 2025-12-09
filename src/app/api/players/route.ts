// app/api/players/route.ts
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
    .from('players')
    .select('id, first_name, last_name, phone, status, created_at')
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
    console.error('GET /players error:', error);
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
  const first_name = String(body.first_name ?? '').trim();
  if (!first_name) {
    return NextResponse.json({ error: 'First Name is required' }, { status: 400 });
  }

  const last_name = String(body.last_name ?? '').trim();
  if (!last_name) {
    return NextResponse.json({ error: 'Last Name is required' }, { status: 400 });
  }

  const phone = String(body.phone ?? '').trim();
  if (!phone) {
    return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
  }

  const newPlayer = {
    user_uid: user.id,
    first_name: first_name,
    last_name: last_name,
    phone: body.phone ?? null,
    status: body.status === 'inactive' ? 'inactive' : 'active',
  };

  const { data, error } = await supabase
    .from('players')
    .insert(newPlayer)
    .select('id, first_name, last_name, phone, status, created_at')
    .single();

  if (error) {
    console.error('POST /players error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
