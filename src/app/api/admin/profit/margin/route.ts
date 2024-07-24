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
    .select('amount, type, category, created_at')
    .eq('status', 'completed')
    .eq('user_uid', user.id)
    .order('created_at', { ascending: true });

  if (transactionsError) {
    console.error('Error fetching transactions:', transactionsError);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }

  if (!transactionsData) {
    return NextResponse.json({ error: 'No transactions found' }, { status: 404 });
  }

  const profitMargin = calculateProfitMarginSeries(transactionsData);

  return NextResponse.json({ profitMargin });
}

function calculateProfitMarginSeries(transactions: any[]) {
  const dailyData: { [key: string]: { selling: number; expense: number } } = {};

  transactions.forEach(transaction => {
    const date = transaction.created_at.split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { selling: 0, expense: 0 };
    }

    if (transaction.category === 'selling') {
      dailyData[date].selling += transaction.amount;
    } else if (transaction.type === 'expense') {
      dailyData[date].expense += transaction.amount;
    }
  });

  const profitMarginSeries = Object.entries(dailyData).map(([date, data]) => {
    const { selling, expense } = data;
    const profit = selling - expense;
    const margin = selling > 0 ? (profit / selling) * 100 : 0;
    return {
      date,
      margin: parseFloat(margin.toFixed(2))
    };
  });

  return profitMarginSeries;
}
