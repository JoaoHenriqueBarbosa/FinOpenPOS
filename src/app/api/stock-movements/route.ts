// app/api/stock-movements/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');
  const reason = url.searchParams.get('reason'); // purchase | adjustment | sale | return
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let query = supabase
    .from('stock_movements')
    .select(
      `
      id,
      product_id,
      quantity,
      reason,
      order_id,
      notes,
      created_at
    `
    )
    .eq('user_uid', user.id);

  if (productId) {
    query = query.eq('product_id', Number(productId));
  }

  if (reason) {
    query = query.eq('reason', reason);
  }

  if (from) {
    query = query.gte('created_at', from);
  }

  if (to) {
    query = query.lte('created_at', to + ' 23:59:59');
  }

  const { data, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /stock-movements error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/stock-movements
 * Para cargar stock o ajustar manualmente.
 * Body ejemplo:
 * {
 *   "productId": 10,
 *   "quantity": 24,
 *   "reason": "purchase",   // purchase | adjustment | return
 *   "notes": "Caja nueva"
 * }
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const productId = Number(body.productId);
  const quantity = Number(body.quantity);
  const reason = body.reason as string;

  if (!productId || Number.isNaN(productId)) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 });
  }

  if (!quantity || Number.isNaN(quantity)) {
    return NextResponse.json({ error: 'quantity is required and must be a number' }, { status: 400 });
  }

  if (!['purchase', 'adjustment', 'sale', 'return'].includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
  }

  // 1) Insertar movimiento de stock
  const movement = {
    user_uid: user.id,
    product_id: productId,
    quantity,
    reason,
    order_id: body.orderId ?? null,
    notes: body.notes ?? null,
  };

  const { error: insertError } = await supabase
    .from('stock_movements')
    .insert(movement);

  if (insertError) {
    console.error('POST /stock-movements insert error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 2) Actualizar stock_quantity del producto
  const { data: currentProduct, error: productError } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('user_uid', user.id)
    .eq('id', productId)
    .single();

  if (productError || !currentProduct) {
    console.error('Fetch product error:', productError);
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const newStock = Number(currentProduct.stock_quantity) + quantity;

  const { data: updatedProduct, error: updateError } = await supabase
    .from('products')
    .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
    .eq('user_uid', user.id)
    .eq('id', productId)
    .select('id, name, stock_quantity, min_stock, uses_stock, is_active')
    .single();

  if (updateError) {
    console.error('Update product stock error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updatedProduct, { status: 201 });
}
