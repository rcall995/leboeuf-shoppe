'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';

export async function generatePickList(orderId: string, assignedTo?: string | null) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Verify order exists and is eligible
  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!order) return { error: 'Order not found' };
  if (!['confirmed', 'processing'].includes(order.status)) {
    return { error: `Order must be confirmed or processing (currently ${order.status})` };
  }

  // Check no existing pick list
  const { count } = await supabase
    .from('pick_lists')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('tenant_id', profile.tenant_id);

  if (count && count > 0) {
    return { error: 'A pick list already exists for this order' };
  }

  // Create pick list
  const { data: pickList, error: plError } = await supabase
    .from('pick_lists')
    .insert({
      tenant_id: profile.tenant_id,
      order_id: orderId,
      assigned_to: assignedTo ?? null,
    })
    .select('id')
    .single();

  if (plError) {
    console.error('generatePickList error:', plError.message);
    return { error: 'Failed to create pick list' };
  }

  // Get order items
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('tenant_id', profile.tenant_id);

  if (orderItems && orderItems.length > 0) {
    const pickItems = orderItems.map((item) => ({
      tenant_id: profile.tenant_id,
      pick_list_id: pickList.id,
      order_item_id: item.id,
      picked: false,
    }));

    const { error: itemsError } = await supabase
      .from('pick_list_items')
      .insert(pickItems);

    if (itemsError) {
      console.error('generatePickList items error:', itemsError.message);
    }
  }

  // Advance order to processing if still confirmed
  if (order.status === 'confirmed') {
    await supabase
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', orderId)
      .eq('tenant_id', profile.tenant_id);
  }

  revalidatePath('/admin/pick-lists');
  revalidatePath(`/admin/orders/${orderId}`);
  return { id: pickList.id };
}

export async function assignPickList(pickListId: string, assignedTo: string | null) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('pick_lists')
    .update({ assigned_to: assignedTo })
    .eq('id', pickListId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('assignPickList error:', error.message);
    return { error: 'Failed to assign pick list' };
  }

  revalidatePath(`/admin/pick-lists/${pickListId}`);
  revalidatePath('/admin/pick-lists');
  return { success: true };
}

const pickItemSchema = z.object({
  lot_id: z.string().uuid('Select an inventory lot'),
  picked_weight_lb: z.coerce.number().positive('Weight must be positive'),
});

export async function pickItem(
  pickListItemId: string,
  data: { lot_id: string; picked_weight_lb: number }
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const parsed = pickItemSchema.safeParse(data);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const supabase = await createClient();

  // Get the pick list item with its order_item
  const { data: plItem } = await supabase
    .from('pick_list_items')
    .select('id, order_item_id, pick_list_id')
    .eq('id', pickListItemId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!plItem) return { error: 'Pick list item not found' };

  // Update pick list item
  const { error: updateError } = await supabase
    .from('pick_list_items')
    .update({
      lot_id: parsed.data.lot_id,
      picked_weight_lb: parsed.data.picked_weight_lb,
      picked: true,
      picked_at: new Date().toISOString(),
    })
    .eq('id', pickListItemId)
    .eq('tenant_id', profile.tenant_id);

  if (updateError) {
    console.error('pickItem error:', updateError.message);
    return { error: 'Failed to pick item' };
  }

  // Also update the order item with lot and actual weight
  const { data: orderItem } = await supabase
    .from('order_items')
    .select('price_per_unit')
    .eq('id', plItem.order_item_id)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (orderItem) {
    const actualLineTotal = Math.round(parsed.data.picked_weight_lb * Number(orderItem.price_per_unit) * 100) / 100;
    await supabase
      .from('order_items')
      .update({
        lot_id: parsed.data.lot_id,
        actual_weight_lb: parsed.data.picked_weight_lb,
        actual_line_total: actualLineTotal,
      })
      .eq('id', plItem.order_item_id)
      .eq('tenant_id', profile.tenant_id);
  }

  revalidatePath(`/admin/pick-lists/${plItem.pick_list_id}`);
  return { success: true };
}

export async function unpickItem(pickListItemId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  const { data: plItem } = await supabase
    .from('pick_list_items')
    .select('id, order_item_id, pick_list_id')
    .eq('id', pickListItemId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!plItem) return { error: 'Pick list item not found' };

  // Reset pick list item
  const { error } = await supabase
    .from('pick_list_items')
    .update({
      lot_id: null,
      picked_weight_lb: null,
      picked: false,
      picked_at: null,
    })
    .eq('id', pickListItemId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('unpickItem error:', error.message);
    return { error: 'Failed to unpick item' };
  }

  // Reset order item
  await supabase
    .from('order_items')
    .update({
      lot_id: null,
      actual_weight_lb: null,
      actual_line_total: null,
    })
    .eq('id', plItem.order_item_id)
    .eq('tenant_id', profile.tenant_id);

  revalidatePath(`/admin/pick-lists/${plItem.pick_list_id}`);
  return { success: true };
}

export async function completePickList(pickListId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Check all items are picked
  const { data: items } = await supabase
    .from('pick_list_items')
    .select('picked')
    .eq('pick_list_id', pickListId)
    .eq('tenant_id', profile.tenant_id);

  if (!items || items.length === 0) return { error: 'No items found' };
  const unpicked = items.filter((i) => !i.picked);
  if (unpicked.length > 0) {
    return { error: `${unpicked.length} item(s) still need to be picked` };
  }

  // Complete the pick list
  const { error } = await supabase
    .from('pick_lists')
    .update({
      is_complete: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', pickListId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('completePickList error:', error.message);
    return { error: 'Failed to complete pick list' };
  }

  // Get the order id and advance to 'weighed'
  const { data: pickList } = await supabase
    .from('pick_lists')
    .select('order_id')
    .eq('id', pickListId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (pickList) {
    await supabase
      .from('orders')
      .update({ status: 'weighed' })
      .eq('id', pickList.order_id)
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['confirmed', 'processing']);
  }

  revalidatePath(`/admin/pick-lists/${pickListId}`);
  revalidatePath('/admin/pick-lists');
  revalidatePath('/admin/orders');
  return { success: true };
}
