import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { RoutesList } from './routes-list';

export default async function DeliveryRoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const profile = await requireAdmin();
  const { filter } = await searchParams;
  const supabase = await createClient();

  // Fetch routes with driver
  const { data: routes } = await supabase
    .from('delivery_routes')
    .select(`
      id,
      name,
      route_date,
      is_complete,
      completed_at,
      created_at,
      driver_id,
      driver:profiles!delivery_routes_driver_id_fkey(full_name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('route_date', { ascending: false });

  // Count stops per route
  const { data: stopCounts } = await supabase
    .from('delivery_stops')
    .select('route_id, delivered')
    .eq('tenant_id', profile.tenant_id);

  const countsMap = new Map<string, { total: number; delivered: number }>();
  for (const stop of stopCounts ?? []) {
    const entry = countsMap.get(stop.route_id) ?? { total: 0, delivered: 0 };
    entry.total++;
    if (stop.delivered) entry.delivered++;
    countsMap.set(stop.route_id, entry);
  }

  type RouteRow = {
    id: string;
    name: string;
    route_date: string;
    is_complete: boolean;
    completed_at: string | null;
    created_at: string;
    driver_id: string | null;
    driver: { full_name: string } | null;
    stops_total: number;
    stops_delivered: number;
  };

  const rows: RouteRow[] = ((routes ?? []) as unknown as Omit<RouteRow, 'stops_total' | 'stops_delivered'>[]).map((r) => ({
    ...r,
    stops_total: countsMap.get(r.id)?.total ?? 0,
    stops_delivered: countsMap.get(r.id)?.delivered ?? 0,
  }));

  // Staff for driver selection
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('tenant_id', profile.tenant_id)
    .in('role', ['owner', 'admin', 'staff']);

  return (
    <RoutesList
      routes={rows}
      staff={(staff ?? []) as { id: string; full_name: string }[]}
      currentFilter={filter ?? 'all'}
    />
  );
}
