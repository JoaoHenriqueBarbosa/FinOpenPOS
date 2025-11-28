// app/api/payment-methods/route.ts
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
  const scopeParam = url.searchParams.get('scope');

  let query = supabase
    .from('payment_methods')
    .select('id, name, scope, is_active, created_at')
    .eq('user_uid', user.id);

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  // Always include BOTH
  const ALWAYS_INCLUDE = ['BOTH'];

  if (scopeParam) {
    const scopes = scopeParam
      .split(',')
      .map((s) => s.trim().toUpperCase());

    const valid = ['BAR', 'COURT', 'BOTH'];

    // Filter valid scopes and ALWAYS add BOTH
    const filteredScopes = Array.from(
      new Set([
        ...scopes.filter((s) => valid.includes(s)),
        ...ALWAYS_INCLUDE,
      ])
    );

    if (filteredScopes.length > 0) {
      query = query.in('scope', filteredScopes);
    }
  }

  // If no scope param → return all, including BOTH (default behavior)
  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    console.error('GET /payment-methods error:', error);
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
    .from('payment_methods')
    .insert({
      user_uid: user.id,
      name,
      is_active: body.is_active ?? true,
    })
    .select('id, name, is_active, created_at')
    .single();

  if (error) {
    console.error('POST /payment-methods error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
