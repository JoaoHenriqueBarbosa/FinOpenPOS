import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: revenueData, error: revenueError } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('status', 'completed');

  const { data: expensesData, error: expensesError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('status', 'completed');

  if (revenueError || expensesError) {
    console.error('Error fetching data:', revenueError || expensesError);
    return NextResponse.json({ error: 'Failed to fetch profit data' }, { status: 500 });
  }

  const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
  const totalExpenses = expensesData?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
  const totalProfit = totalRevenue - totalExpenses;

  return NextResponse.json({ totalProfit });
}
