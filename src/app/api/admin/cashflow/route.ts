import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: transactionsData, error: transactionsError } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('status', 'completed')
    .eq('user_uid', user.id)
    .order('created_at', { ascending: true });

  if (transactionsError) {
    console.error('Error fetching cash flow data:', transactionsError);
    return NextResponse.json({ error: 'Failed to fetch cash flow data' }, { status: 500 });
  }

  const cashFlow = transactionsData?.reduce((acc, transaction) => {
    const date = new Date(transaction.created_at).toISOString().split('T')[0];
    if (acc[date]) {
      acc[date] += transaction.amount;
    } else {
      acc[date] = transaction.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ cashFlow });
}
