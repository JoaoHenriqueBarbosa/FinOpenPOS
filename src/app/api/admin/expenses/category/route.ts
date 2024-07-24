import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: expensesData, error: expensesError } = await supabase
    .from('transactions')
    .select('amount, description')
    .eq('status', 'completed');

  if (expensesError) {
    console.error('Error fetching expenses by category:', expensesError);
    return NextResponse.json({ error: 'Failed to fetch expenses by category' }, { status: 500 });
  }

  const expensesByCategory = expensesData?.reduce((acc, transaction) => {
    const category = transaction.description || 'Uncategorized';
    if (acc[category]) {
      acc[category] += transaction.amount;
    } else {
      acc[category] = transaction.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ expensesByCategory });
}
