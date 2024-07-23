import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: { orderId: string, productId: string } }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updatedOrder = await request.json();
  const orderId = params.orderId;
  const productId = params.productId;

  const { data, error } = await supabase
    .from('orders')
    .update({ ...updatedOrder, user_uid: user.id })
    .eq('id', orderId)
    .eq('user_uid', user.id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (data.length === 0) {
    return NextResponse.json({ error: 'Order not found or not authorized' }, { status: 404 })
  }

  const productUpdate = await supabase
    .from('products')
    .update({ ...updatedOrder, user_uid: user.id })
    .eq('id', productId)
    .eq('user_uid', user.id)

  if (productUpdate.error) {
    return NextResponse.json({ error: productUpdate.error.message }, { status: 500 })
  }

  return NextResponse.json(data[0])
}

export async function DELETE(
  request: Request,
  { params }: { params: { orderId: string, productId: string } }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orderId = params.orderId;
  const productId = params.productId;

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('user_uid', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const productDelete = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('user_uid', user.id)

  if (productDelete.error) {
    return NextResponse.json({ error: productDelete.error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Order and Product deleted successfully' })
}
