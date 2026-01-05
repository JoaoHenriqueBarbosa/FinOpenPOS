// app/api/orders/statistics/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface OrderStatisticsItem {
  productId: number;
  productName: string;
  categoryId: number | null;
  categoryName: string | null;
  totalQuantity: number;
  totalAmount: number;
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
    const productId = url.searchParams.get('productId');
    const categoryId = url.searchParams.get('categoryId');

    // Obtener order_items directamente, filtrando por fecha del item y orden cerrada
    let itemsQuery = supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        total_price,
        created_at,
        order:order_id (
          status
        ),
        product:product_id (
          id,
          name,
          category:category_id (
            id,
            name
          )
        )
      `)
      .eq('order.status', 'closed');

    // Filtrar por fecha del item (created_at)
    if (fromDate) {
      const fromISO = new Date(fromDate + 'T00:00:00').toISOString();
      itemsQuery = itemsQuery.gte('created_at', fromISO);
    }
    if (toDate) {
      const toISO = new Date(toDate + 'T23:59:59.999').toISOString();
      itemsQuery = itemsQuery.lte('created_at', toISO);
    }

    // Filtrar por producto si se especifica
    if (productId) {
      itemsQuery = itemsQuery.eq('product_id', Number(productId));
    }

    const { data, error } = await itemsQuery;

    if (error) {
      console.error('Error fetching order statistics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Agregar los datos por producto
    const productStats = new Map<number, OrderStatisticsItem>();

    (data || []).forEach((item: any) => {
      if (!item.product || !item.order) return;

      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const category = product.category 
        ? (Array.isArray(product.category) ? product.category[0] : product.category)
        : null;

      // Filtro por producto
      if (productId && product.id !== Number(productId)) {
        return;
      }

      // Filtro por categoría (aplicar después de obtener los datos)
      if (categoryId && category?.id !== Number(categoryId)) {
        return;
      }

      const productIdKey = product.id;
      const existing = productStats.get(productIdKey) || {
        productId: product.id,
        productName: product.name,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        totalQuantity: 0,
        totalAmount: 0,
      };

      existing.totalQuantity += item.quantity;
      existing.totalAmount += Number(item.total_price);

      productStats.set(productIdKey, existing);
    });

    // Convertir a array y ordenar por monto
    const statistics = Array.from(productStats.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('GET /orders/statistics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

