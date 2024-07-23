import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updatedOrder = await request.json();
  const orderId = params.orderId;

  const { data, error } = await supabase
    .from('orders')
    .update({ ...updatedOrder, user_uid: user.id })
    .eq('id', orderId)
    .eq('user_uid', user.id)
    .select('*, customer:customers(name)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Order not found or not authorized' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orderId = params.orderId;

  // First, delete related order_items
  const { error: orderItemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId)

  if (orderItemsError) {
    return NextResponse.json({ error: orderItemsError.message }, { status: 500 })
  }

  // Then, delete the order
  const { error: orderError } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('user_uid', user.id)

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Order and related items deleted successfully' })
}
