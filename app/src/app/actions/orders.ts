'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendOrderStatusUpdate } from '@/lib/email';

const STATUS_FLOW: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['weighed', 'cancelled'],
  weighed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

export async function getPendingOrders() {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, estimated_total, customers(business_name)')
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    estimated_total: o.estimated_total,
    business_name: (o.customers as unknown as { business_name: string } | null)?.business_name ?? 'Unknown',
  }));
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Get current order
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!order) return { error: 'Order not found' };

  const allowed = STATUS_FLOW[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${order.status} to ${newStatus}` };
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updateOrderStatus error:', error.message);
    return { error: 'Failed to update order status' };
  }

  // Send status update email for key transitions (fire-and-forget)
  if (['confirmed', 'out_for_delivery', 'delivered'].includes(newStatus)) {
    const { data: orderDetail } = await supabase
      .from('orders')
      .select('order_number, customer:customers(email, contact_name, business_name)')
      .eq('id', orderId)
      .single();

    if (orderDetail) {
      const cust = orderDetail.customer as unknown as {
        email: string | null;
        contact_name: string | null;
        business_name: string;
      };
      if (cust?.email) {
        sendOrderStatusUpdate({
          to: cust.email,
          customerName: cust.contact_name ?? cust.business_name,
          orderNumber: orderDetail.order_number,
          newStatus,
        });
      }
    }
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { success: true };
}

export async function updateOrderItemWeight(
  itemId: string,
  actualWeightLb: number
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  if (actualWeightLb <= 0) {
    return { error: 'Weight must be positive' };
  }

  const supabase = await createClient();

  // Get item to calculate line total
  const { data: item } = await supabase
    .from('order_items')
    .select('price_per_unit, order_id')
    .eq('id', itemId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!item) return { error: 'Item not found' };

  const actualLineTotal = Math.round(actualWeightLb * Number(item.price_per_unit) * 100) / 100;

  const { error } = await supabase
    .from('order_items')
    .update({
      actual_weight_lb: actualWeightLb,
      actual_line_total: actualLineTotal,
    })
    .eq('id', itemId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updateOrderItemWeight error:', error.message);
    return { error: 'Failed to update weight' };
  }

  revalidatePath(`/admin/orders/${item.order_id}`);
  return { success: true, actual_line_total: actualLineTotal };
}

export async function recalculateOrderTotal(orderId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Get all items for this order
  const { data: items } = await supabase
    .from('order_items')
    .select('actual_line_total, estimated_line_total')
    .eq('order_id', orderId)
    .eq('tenant_id', profile.tenant_id);

  if (!items) return { error: 'No items found' };

  // Use actual if available, fall back to estimated
  const actualTotal = items.reduce((sum, item) => {
    const lineTotal = item.actual_line_total ?? item.estimated_line_total ?? 0;
    return sum + Number(lineTotal);
  }, 0);

  const { error } = await supabase
    .from('orders')
    .update({ actual_total: Math.round(actualTotal * 100) / 100 })
    .eq('id', orderId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('recalculateOrderTotal error:', error.message);
    return { error: 'Failed to recalculate total' };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { success: true, actual_total: Math.round(actualTotal * 100) / 100 };
}
