'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';

const routeSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  route_date: z.string().min(1, 'Date is required'),
  driver_id: z.string().nullable().optional(),
});

export async function createRoute(data: {
  name: string;
  route_date: string;
  driver_id?: string | null;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const parsed = routeSchema.safeParse(data);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const supabase = await createClient();
  const { data: route, error } = await supabase
    .from('delivery_routes')
    .insert({
      tenant_id: profile.tenant_id,
      name: parsed.data.name,
      route_date: parsed.data.route_date,
      driver_id: parsed.data.driver_id ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('createRoute error:', error.message);
    return { error: 'Failed to create route' };
  }

  revalidatePath('/admin/delivery-routes');
  return { id: route.id };
}

export async function updateRoute(
  routeId: string,
  data: { name?: string; route_date?: string; driver_id?: string | null }
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('delivery_routes')
    .update(data)
    .eq('id', routeId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updateRoute error:', error.message);
    return { error: 'Failed to update route' };
  }

  revalidatePath(`/admin/delivery-routes/${routeId}`);
  revalidatePath('/admin/delivery-routes');
  return { success: true };
}

export async function deleteRoute(routeId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Delete stops first
  await supabase
    .from('delivery_stops')
    .delete()
    .eq('route_id', routeId)
    .eq('tenant_id', profile.tenant_id);

  const { error } = await supabase
    .from('delivery_routes')
    .delete()
    .eq('id', routeId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('deleteRoute error:', error.message);
    return { error: 'Failed to delete route' };
  }

  revalidatePath('/admin/delivery-routes');
  return { success: true };
}

export async function addStop(
  routeId: string,
  data: { order_id: string; customer_id: string }
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Get current max stop_order
  const { data: existing } = await supabase
    .from('delivery_stops')
    .select('stop_order')
    .eq('route_id', routeId)
    .eq('tenant_id', profile.tenant_id)
    .order('stop_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.stop_order ?? 0) + 1;

  const { error } = await supabase
    .from('delivery_stops')
    .insert({
      tenant_id: profile.tenant_id,
      route_id: routeId,
      order_id: data.order_id,
      customer_id: data.customer_id,
      stop_order: nextOrder,
    });

  if (error) {
    console.error('addStop error:', error.message);
    return { error: 'Failed to add stop' };
  }

  revalidatePath(`/admin/delivery-routes/${routeId}`);
  return { success: true };
}

export async function removeStop(stopId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  const { data: stop } = await supabase
    .from('delivery_stops')
    .select('route_id')
    .eq('id', stopId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!stop) return { error: 'Stop not found' };

  const { error } = await supabase
    .from('delivery_stops')
    .delete()
    .eq('id', stopId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('removeStop error:', error.message);
    return { error: 'Failed to remove stop' };
  }

  revalidatePath(`/admin/delivery-routes/${stop.route_id}`);
  return { success: true };
}

export async function reorderStops(routeId: string, orderedStopIds: string[]) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  for (let i = 0; i < orderedStopIds.length; i++) {
    const { error } = await supabase
      .from('delivery_stops')
      .update({ stop_order: i + 1 })
      .eq('id', orderedStopIds[i])
      .eq('tenant_id', profile.tenant_id);

    if (error) {
      console.error('reorderStops error:', error.message);
      return { error: 'Failed to reorder stops' };
    }
  }

  revalidatePath(`/admin/delivery-routes/${routeId}`);
  return { success: true };
}

export async function markStopDelivered(stopId: string, notes?: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  const { data: stop } = await supabase
    .from('delivery_stops')
    .select('route_id, order_id')
    .eq('id', stopId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!stop) return { error: 'Stop not found' };

  const { error } = await supabase
    .from('delivery_stops')
    .update({
      delivered: true,
      delivered_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq('id', stopId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('markStopDelivered error:', error.message);
    return { error: 'Failed to mark delivered' };
  }

  // Update the order status to delivered
  if (stop.order_id) {
    await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', stop.order_id)
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['packed', 'out_for_delivery']);
  }

  revalidatePath(`/admin/delivery-routes/${stop.route_id}`);
  revalidatePath('/admin/orders');
  return { success: true };
}

export async function completeRoute(routeId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Verify all stops delivered
  const { data: stops } = await supabase
    .from('delivery_stops')
    .select('delivered')
    .eq('route_id', routeId)
    .eq('tenant_id', profile.tenant_id);

  if (!stops || stops.length === 0) return { error: 'No stops found' };

  const undelivered = stops.filter((s) => !s.delivered);
  if (undelivered.length > 0) {
    return { error: `${undelivered.length} stop(s) still need to be delivered` };
  }

  const { error } = await supabase
    .from('delivery_routes')
    .update({
      is_complete: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', routeId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('completeRoute error:', error.message);
    return { error: 'Failed to complete route' };
  }

  revalidatePath(`/admin/delivery-routes/${routeId}`);
  revalidatePath('/admin/delivery-routes');
  return { success: true };
}
