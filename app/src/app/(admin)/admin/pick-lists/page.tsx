import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PickListsList } from './pick-lists-list';

export default async function PickListsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const profile = await requireAdmin();
  const { filter } = await searchParams;
  const supabase = await createClient();

  // Fetch pick lists with order + customer + assignee
  const { data: pickLists } = await supabase
    .from('pick_lists')
    .select(`
      id,
      order_id,
      is_complete,
      completed_at,
      created_at,
      assigned_to,
      order:orders(order_number, customer:customers(business_name)),
      assignee:profiles!pick_lists_assigned_to_fkey(full_name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false });

  // Count items per pick list
  const { data: itemCounts } = await supabase
    .from('pick_list_items')
    .select('pick_list_id, picked')
    .eq('tenant_id', profile.tenant_id);

  const countsMap = new Map<string, { total: number; picked: number }>();
  for (const item of itemCounts ?? []) {
    const entry = countsMap.get(item.pick_list_id) ?? { total: 0, picked: 0 };
    entry.total++;
    if (item.picked) entry.picked++;
    countsMap.set(item.pick_list_id, entry);
  }

  type PickListRow = {
    id: string;
    order_id: string;
    is_complete: boolean;
    completed_at: string | null;
    created_at: string;
    assigned_to: string | null;
    order: { order_number: string; customer: { business_name: string } };
    assignee: { full_name: string } | null;
    items_total: number;
    items_picked: number;
  };

  const rows: PickListRow[] = ((pickLists ?? []) as unknown as Omit<PickListRow, 'items_total' | 'items_picked'>[]).map((pl) => ({
    ...pl,
    items_total: countsMap.get(pl.id)?.total ?? 0,
    items_picked: countsMap.get(pl.id)?.picked ?? 0,
  }));

  // Eligible orders for the generate form (confirmed or processing, no existing pick list)
  const { data: existingPickListOrders } = await supabase
    .from('pick_lists')
    .select('order_id')
    .eq('tenant_id', profile.tenant_id);

  const existingOrderIds = new Set((existingPickListOrders ?? []).map((p: { order_id: string }) => p.order_id));

  const { data: eligibleOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, customer:customers(business_name)')
    .eq('tenant_id', profile.tenant_id)
    .in('status', ['confirmed', 'processing'])
    .order('created_at', { ascending: false });

  type EligibleOrder = {
    id: string;
    order_number: string;
    status: string;
    customer: { business_name: string };
  };

  const filteredEligible = ((eligibleOrders ?? []) as unknown as EligibleOrder[]).filter(
    (o) => !existingOrderIds.has(o.id)
  );

  // Staff for assignment
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('tenant_id', profile.tenant_id)
    .in('role', ['owner', 'admin', 'staff']);

  return (
    <PickListsList
      pickLists={rows}
      eligibleOrders={filteredEligible}
      staff={(staff ?? []) as { id: string; full_name: string }[]}
      currentFilter={filter ?? 'all'}
    />
  );
}
