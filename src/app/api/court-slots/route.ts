// app/api/court-slots/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SLOT_STARTS = ['13:00', '14:30', '16:00', '17:30', '19:00', '20:30', '22:00'];

function addMinutes(time: string, minutes: number): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(nh)}:${pad(nm)}`;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get('date'); // YYYY-MM-DD obligatorio
  const courtId = url.searchParams.get('courtId');

  if (!date) {
    return NextResponse.json({ error: 'date query param is required (YYYY-MM-DD)' }, { status: 400 });
  }

  let query = supabase
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
      created_at,
      court:court_id (
        id,
        name
      )
    `
    )
    .eq('user_uid', user.id)
    .eq('slot_date', date);

  if (courtId) {
    query = query.eq('court_id', Number(courtId));
  }

  const { data, error } = await query
    .order('court_id', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('GET /court-slots error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/court-slots
 * Body:
 * {
 *   "date": "2025-01-01",
 *   "courtId": 1           // opcional, si no se manda genera para todas las canchas activas
 * }
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const date = body.date as string | undefined;
  const courtId = body.courtId as number | undefined;

  if (!date) {
    return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
  }

  // 1) Obtener canchas correspondientes
  let courtsQuery = supabase
    .from('courts')
    .select('id')
    .eq('user_uid', user.id)
    .eq('is_active', true);

  if (courtId) {
    courtsQuery = courtsQuery.eq('id', courtId);
  }

  const { data: courts, error: courtsError } = await courtsQuery;

  if (courtsError) {
    console.error('POST /court-slots courts error:', courtsError);
    return NextResponse.json({ error: courtsError.message }, { status: 500 });
  }

  if (!courts || courts.length === 0) {
    return NextResponse.json({ error: 'No courts found' }, { status: 400 });
  }

  const courtIds = courts.map(c => c.id);

  // 2) Obtener slots existentes para esa fecha y esas canchas
  const { data: existingSlots, error: slotsError } = await supabase
    .from('court_slots')
    .select('id, court_id, start_time')
    .eq('user_uid', user.id)
    .eq('slot_date', date)
    .in('court_id', courtIds);

  if (slotsError) {
    console.error('POST /court-slots existing slots error:', slotsError);
    return NextResponse.json({ error: slotsError.message }, { status: 500 });
  }

  const existingKey = new Set(
    (existingSlots ?? []).map(
      s => `${s.court_id}-${s.start_time}`
    )
  );

  // 3) Generar nuevos slots que falten
  const slotsToInsert: any[] = [];

  for (const cId of courtIds) {
    for (const start of SLOT_STARTS) {
      const key = `${cId}-${start}:00`; // Supabase suele devolver TIME como HH:MM:SS
      if (existingKey.has(key)) continue;

      const end = addMinutes(start, 90);
      slotsToInsert.push({
        user_uid: user.id,
        court_id: cId,
        slot_date: date,
        start_time: start,
        end_time: end,
        was_played: false,
        // players paid true by default
        player1_paid: true,
        player2_paid: true,
        player3_paid: true,
        player4_paid: true,
      });
    }
  }

  if (slotsToInsert.length === 0) {
    return NextResponse.json(
      { message: 'No new slots to create' },
      { status: 200 }
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from('court_slots')
    .insert(slotsToInsert)
    .select('id, court_id, slot_date, start_time, end_time');

  if (insertError) {
    console.error('POST /court-slots insert error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}
