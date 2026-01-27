// app/api/stock-movements/statistics/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface StockStatisticsItem {
  productId: number;
  productName: string;
  categoryId: number | null;
  categoryName: string | null;
  totalPurchases: number;
  totalSales: number;
  totalAdjustments: number;
  currentStock: number; // purchases - sales + adjustments
}

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

    // Obtener movimientos de stock con información del producto
    let query = supabase
      .from('stock_movements')
      .select(`
        product_id,
        movement_type,
        quantity,
        product:product_id (
          id,
          name,
          uses_stock,
          category:category_id (
            id,
            name
          )
        )
      `);

    // Filtrar por rango de fechas
    if (fromDate) {
      const fromISO = new Date(fromDate + 'T00:00:00').toISOString();
      query = query.gte('created_at', fromISO);
    }
    if (toDate) {
      const toISO = new Date(toDate + 'T23:59:59.999').toISOString();
      query = query.lte('created_at', toISO);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock statistics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Agregar los datos por producto
    const productStats = new Map<number, StockStatisticsItem>();

    (data || []).forEach((item: any) => {
      if (!item.product) return;

      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      if (product && product.uses_stock === false) {
        return;
      }
      const category = product.category 
        ? (Array.isArray(product.category) ? product.category[0] : product.category)
        : null;

      const productId = product.id;
      const existing = productStats.get(productId) || {
        productId: product.id,
        productName: product.name,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        totalPurchases: 0,
        totalSales: 0,
        totalAdjustments: 0,
        currentStock: 0,
      };

      // Sumar según el tipo de movimiento
      if (item.movement_type === 'purchase') {
        existing.totalPurchases += item.quantity;
        existing.currentStock += item.quantity;
      } else if (item.movement_type === 'sale') {
        existing.totalSales += item.quantity;
        existing.currentStock -= item.quantity;
      } else if (item.movement_type === 'adjustment') {
        existing.totalAdjustments += item.quantity;
        existing.currentStock += item.quantity; // Los ajustes pueden ser positivos o negativos, pero quantity ya tiene el signo
      }

      productStats.set(productId, existing);
    });

    // Convertir a array y ordenar por nombre de producto
    const filteredStats = categoryId
      ? Array.from(productStats.values()).filter((item) => item.categoryId === categoryId)
      : Array.from(productStats.values());

    const statistics = filteredStats.sort((a, b) => a.productName.localeCompare(b.productName));

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('GET /stock-movements/statistics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

