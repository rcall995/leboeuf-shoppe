import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { RouteDetail } from './route-detail';

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the route
  const { data: route } = await supabase
    .from('delivery_routes')
    .select(`
      id,
      name,
      route_date,
      is_complete,
      completed_at,
      driver_id,
      driver:profiles!delivery_routes_driver_id_fkey(full_name)
    `)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!route) notFound();

  // Fetch stops with order + customer
  const { data: stops } = await supabase
    .from('delivery_stops')
    .select(`
      id,
      stop_order,
      delivered,
      delivered_at,
      notes,
      order:orders(id, order_number),
      customer:customers(business_name)
    `)
    .eq('route_id', id)
    .eq('tenant_id', profile.tenant_id)
    .order('stop_order');

  // Eligible orders for adding stops (weighed, packed, or out_for_delivery)
  const { data: eligibleOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, customer_id, customer:customers(business_name)')
    .eq('tenant_id', profile.tenant_id)
    .in('status', ['weighed', 'packed', 'out_for_delivery'])
    .order('created_at', { ascending: false });

  type RouteRow = {
    id: string;
    name: string;
    route_date: string;
    is_complete: boolean;
    completed_at: string | null;
    driver_id: string | null;
    driver: { full_name: string } | null;
  };

  type StopRow = {
    id: string;
    stop_order: number;
    delivered: boolean;
    delivered_at: string | null;
    notes: string | null;
    order: { id: string; order_number: string };
    customer: { business_name: string };
  };

  type EligibleOrder = {
    id: string;
    order_number: string;
    status: string;
    customer_id: string;
    customer: { business_name: string };
  };

  return (
    <RouteDetail
      route={route as unknown as RouteRow}
      stops={(stops ?? []) as unknown as StopRow[]}
      eligibleOrders={(eligibleOrders ?? []) as unknown as EligibleOrder[]}
    />
  );
}
