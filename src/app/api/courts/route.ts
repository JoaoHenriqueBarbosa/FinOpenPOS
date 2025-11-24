// app/api/courts/route.ts
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

  let query = supabase
    .from('courts')
    .select('id, name, is_active, created_at')
    .eq('user_uid', user.id);

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('id', { ascending: true });

  if (error) {
    console.error('GET /courts error:', error);
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

  const { data, error } = await supabase
    .from('courts')
    .insert({
      user_uid: user.id,
      name,
      is_active: body.is_active ?? true,
    })
    .select('id, name, is_active, created_at')
    .single();

  if (error) {
    console.error('POST /courts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
