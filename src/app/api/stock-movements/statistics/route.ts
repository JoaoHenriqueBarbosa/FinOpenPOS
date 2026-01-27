// app/api/stock-movements/statistics/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StockMovementsRepository } from '@/repositories/stock-movements.repository';
import { StockMovementsStatisticsService } from '@/services/stock-movements-statistics.service';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');
    const categoryIdParam = url.searchParams.get('categoryId');
    const categoryId = categoryIdParam ? Number(categoryIdParam) : null;
    const limitParam = url.searchParams.get('limit');
    const limit =
      limitParam && !Number.isNaN(Number(limitParam))
        ? Number(limitParam)
        : undefined;

    const repository = new StockMovementsRepository(supabase, user.id);
    const statisticsService = new StockMovementsStatisticsService(repository);

    const statistics = await statisticsService.getStatistics({
      fromDate: fromDate ?? undefined,
      toDate: toDate ?? undefined,
      categoryId,
      pageSize: limit,
    });

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('GET /stock-movements/statistics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

