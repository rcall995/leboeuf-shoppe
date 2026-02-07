import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { OrdersList } from './orders-list';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(business_name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: orders } = await query;

  // Get counts per status for the tabs
  const { data: statusCounts } = await supabase
    .from('orders')
    .select('status')
    .eq('tenant_id', profile.tenant_id);

  const counts: Record<string, number> = {};
  for (const row of statusCounts ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }

  type OrderRow = {
    id: string;
    order_number: string;
    status: string;
    estimated_total: number | null;
    actual_total: number | null;
    created_at: string;
    customer: { business_name: string };
  };

  return (
    <OrdersList
      orders={(orders ?? []) as unknown as OrderRow[]}
      statusCounts={counts}
      currentFilter={status ?? 'all'}
    />
  );
}
