import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PickListDetail } from './pick-list-detail';

export default async function PickListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the pick list
  const { data: pickList } = await supabase
    .from('pick_lists')
    .select(`
      id,
      is_complete,
      completed_at,
      created_at,
      assigned_to,
      order:orders(id, order_number, customer:customers(business_name)),
      assignee:profiles!pick_lists_assigned_to_fkey(full_name)
    `)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!pickList) notFound();

  // Fetch pick list items with order item details
  const { data: items } = await supabase
    .from('pick_list_items')
    .select(`
      id,
      order_item_id,
      lot_id,
      picked,
      picked_weight_lb,
      picked_at,
      order_item:order_items(
        quantity,
        estimated_weight_lb,
        price_per_unit,
        variant:product_variants(
          name,
          unit,
          weight_type,
          product:products(name)
        )
      )
    `)
    .eq('pick_list_id', id)
    .eq('tenant_id', profile.tenant_id);

  // Fetch available lots for picking
  const { data: lots } = await supabase
    .from('inventory_lots')
    .select('id, lot_number, current_weight_lb, product:products(name)')
    .eq('tenant_id', profile.tenant_id)
    .in('status', ['available', 'allocated'])
    .gt('current_weight_lb', 0)
    .order('lot_number');

  // Staff for assignment
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('tenant_id', profile.tenant_id)
    .in('role', ['owner', 'admin', 'staff']);

  type PLRow = {
    id: string;
    is_complete: boolean;
    completed_at: string | null;
    created_at: string;
    assigned_to: string | null;
    order: { id: string; order_number: string; customer: { business_name: string } };
    assignee: { full_name: string } | null;
  };

  type ItemRow = {
    id: string;
    order_item_id: string;
    lot_id: string | null;
    picked: boolean;
    picked_weight_lb: number | null;
    picked_at: string | null;
    order_item: {
      quantity: number;
      estimated_weight_lb: number | null;
      price_per_unit: number;
      variant: {
        name: string;
        unit: string;
        weight_type: string;
        product: { name: string };
      };
    };
  };

  type LotRow = {
    id: string;
    lot_number: string;
    current_weight_lb: number;
    product: { name: string };
  };

  return (
    <PickListDetail
      pickList={pickList as unknown as PLRow}
      items={(items ?? []) as unknown as ItemRow[]}
      availableLots={(lots ?? []) as unknown as LotRow[]}
      staff={(staff ?? []) as { id: string; full_name: string }[]}
    />
  );
}
