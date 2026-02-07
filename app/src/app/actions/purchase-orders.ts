'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';

const poItemSchema = z.object({
  product_id: z.string().uuid('Select a product'),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.enum(['lb', 'kg', 'each', 'case']),
  cost_per_unit: z.coerce.number().positive('Cost must be positive'),
});

const poSchema = z.object({
  supplier_id: z.string().uuid('Select a supplier'),
  expected_delivery: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(poItemSchema).min(1, 'Add at least one line item'),
});

export async function createPO(formData: {
  supplier_id: string;
  expected_delivery?: string | null;
  notes?: string | null;
  items: { product_id: string; variant_id?: string | null; quantity: number; unit: string; cost_per_unit: number }[];
}) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const parsed = poSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const { supplier_id, expected_delivery, notes, items } = parsed.data;
  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.cost_per_unit, 0);

  // Generate PO number
  const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

  const supabase = await createClient();

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      tenant_id: profile.tenant_id,
      supplier_id,
      po_number: poNumber,
      status: 'draft',
      ordered_by: profile.id,
      expected_delivery: expected_delivery ?? null,
      total_cost: Math.round(totalCost * 100) / 100,
      notes: notes ?? null,
    })
    .select('id, po_number')
    .single();

  if (poError) {
    console.error('createPO error:', poError.message);
    return { error: 'Failed to create purchase order' };
  }

  const poItems = items.map((item) => ({
    tenant_id: profile.tenant_id,
    po_id: po.id,
    product_id: item.product_id,
    variant_id: item.variant_id ?? null,
    quantity: item.quantity,
    unit: item.unit,
    cost_per_unit: item.cost_per_unit,
    received_quantity: 0,
  }));

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(poItems);

  if (itemsError) {
    console.error('createPO items error:', itemsError.message);
    return { error: 'PO created but failed to save line items' };
  }

  revalidatePath('/admin/inventory');
  return { id: po.id, po_number: po.po_number };
}

const PO_STATUS_FLOW: Record<string, string[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['confirmed', 'cancelled'],
  confirmed: ['received', 'cancelled'],
  received: [],
  cancelled: [],
};

export async function updatePOStatus(poId: string, newStatus: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('status')
    .eq('id', poId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!po) return { error: 'PO not found' };

  const allowed = PO_STATUS_FLOW[po.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${po.status} to ${newStatus}` };
  }

  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: newStatus })
    .eq('id', poId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updatePOStatus error:', error.message);
    return { error: 'Failed to update PO status' };
  }

  revalidatePath('/admin/inventory');
  return { success: true };
}

export async function receivePO(poId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Get PO with items
  const { data: po } = await supabase
    .from('purchase_orders')
    .select(`
      id, status, supplier_id,
      items:purchase_order_items(id, product_id, variant_id, quantity, unit, cost_per_unit)
    `)
    .eq('id', poId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!po) return { error: 'PO not found' };
  if (po.status !== 'confirmed') {
    return { error: 'PO must be confirmed before receiving' };
  }

  type POItem = {
    id: string;
    product_id: string;
    variant_id: string | null;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  };

  const items = (po as unknown as { items: POItem[] }).items;

  // Create inventory lots from PO items
  const lotsToCreate = items
    .filter((item) => item.unit === 'lb' || item.unit === 'kg')
    .map((item) => ({
      tenant_id: profile.tenant_id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      supplier_id: po.supplier_id,
      lot_number: `PO-${poId.slice(0, 8)}-${item.id.slice(0, 4)}`,
      status: 'receiving' as const,
      initial_weight_lb: item.quantity,
      current_weight_lb: item.quantity,
      cost_per_lb: item.cost_per_unit,
      received_date: new Date().toISOString().split('T')[0],
    }));

  if (lotsToCreate.length > 0) {
    const { error: lotsError } = await supabase
      .from('inventory_lots')
      .insert(lotsToCreate);

    if (lotsError) {
      console.error('receivePO lots error:', lotsError.message);
      // Continue — mark PO received even if lot creation fails
    }
  }

  // Mark items as fully received
  for (const item of items) {
    await supabase
      .from('purchase_order_items')
      .update({ received_quantity: item.quantity })
      .eq('id', item.id)
      .eq('tenant_id', profile.tenant_id);
  }

  // Update PO status
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: 'received' })
    .eq('id', poId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('receivePO status error:', error.message);
    return { error: 'Failed to update PO status' };
  }

  revalidatePath('/admin/inventory');
  return { success: true, lots_created: lotsToCreate.length };
}
