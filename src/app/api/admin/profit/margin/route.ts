import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('id, total_amount, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: true });

  const { data: transactionsData, error: transactionsError } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: true });

  if (ordersError || transactionsError) {
    console.error('Error fetching profit margin data:', ordersError || transactionsError);
    return NextResponse.json({ error: 'Failed to fetch profit margin data' }, { status: 500 });
  }

  const profitMargin = ordersData?.map(order => {
    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
    const expenses = transactionsData
      ?.filter(t => new Date(t.created_at).toISOString().split('T')[0] === orderDate)
      .reduce((sum, t) => sum + t.amount, 0) || 0;
    
    const revenue = order.total_amount;
    const profit = revenue - expenses;
    const margin = (profit / revenue) * 100;

    return {
      date: orderDate,
      margin: parseFloat(margin.toFixed(2))
    };
  });

  return NextResponse.json({ profitMargin });
}
