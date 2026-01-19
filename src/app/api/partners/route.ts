// app/api/partners/route.ts
// Read-only endpoint for partners (business owners in a partnership)
// Partners are created and edited directly from the database
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const onlyActive = url.searchParams.get('onlyActive') === 'true';

    let query = supabase
      .from('partners')
      .select('id, first_name, last_name, phone, email, status, notes, created_at')
      .eq('user_uid', user.id);

    if (onlyActive) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query.order('last_name', { ascending: true });

    if (error) {
      console.error('GET /partners error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch partners' },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('GET /partners error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
