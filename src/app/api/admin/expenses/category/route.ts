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
    .select('amount, category, status, user_uid')
    .eq('status', 'completed')
    .eq('type', 'expense')
    .eq('user_uid', user.id);

  if (expensesError) {
    console.error('Error fetching expenses by category:', expensesError);
    return NextResponse.json({ error: 'Failed to fetch expenses by category' }, { status: 500 });
  }

  const expensesByCategory = expensesData?.reduce((acc, item) => {
    const category = item.category; // Acessando a categoria do primeiro produto
    if (!category) {
      return acc; // Se a categoria não existir, continuar para o último item
    }
    const expenses = item.amount;
    if (acc[category]) {
      acc[category] += expenses;
    } else {
      acc[category] = expenses;
    }
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ expensesByCategory });
}
