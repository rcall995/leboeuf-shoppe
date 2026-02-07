'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';

const lotSchema = z.object({
  lot_number: z.string().min(1, 'Lot number is required'),
  product_id: z.string().uuid('Select a product'),
  variant_id: z.string().uuid().nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  initial_weight_lb: z.coerce.number().positive('Weight must be positive'),
  cost_per_lb: z.coerce.number().positive().nullable().optional(),
  kill_date: z.string().nullable().optional(),
  received_date: z.string().min(1, 'Received date is required'),
  aging_start_date: z.string().nullable().optional(),
  best_by_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['receiving', 'aging', 'available', 'allocated', 'depleted', 'expired', 'waste']).optional(),
});

export async function createLot(formData: {
  lot_number: string;
  product_id: string;
  variant_id?: string | null;
  supplier_id?: string | null;
  initial_weight_lb: number;
  cost_per_lb?: number | null;
  kill_date?: string | null;
  received_date: string;
  aging_start_date?: string | null;
  best_by_date?: string | null;
  notes?: string | null;
  status?: string;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const parsed = lotSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inventory_lots')
    .insert({
      tenant_id: profile.tenant_id,
      lot_number: parsed.data.lot_number,
      product_id: parsed.data.product_id,
      variant_id: parsed.data.variant_id ?? null,
      supplier_id: parsed.data.supplier_id ?? null,
      initial_weight_lb: parsed.data.initial_weight_lb,
      current_weight_lb: parsed.data.initial_weight_lb,
      cost_per_lb: parsed.data.cost_per_lb ?? null,
      kill_date: parsed.data.kill_date ?? null,
      received_date: parsed.data.received_date,
      aging_start_date: parsed.data.aging_start_date ?? null,
      best_by_date: parsed.data.best_by_date ?? null,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status ?? 'receiving',
    })
    .select('id')
    .single();

  if (error) {
    console.error('createLot error:', error.message);
    if (error.code === '23505') return { error: 'Lot number already exists' };
    return { error: 'Failed to create lot' };
  }

  revalidatePath('/admin/inventory');
  return { id: data.id };
}

export async function updateLot(
  lotId: string,
  formData: {
    lot_number?: string;
    product_id?: string;
    variant_id?: string | null;
    supplier_id?: string | null;
    initial_weight_lb?: number;
    current_weight_lb?: number;
    cost_per_lb?: number | null;
    kill_date?: string | null;
    received_date?: string;
    aging_start_date?: string | null;
    best_by_date?: string | null;
    notes?: string | null;
  }
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const updateData: Record<string, unknown> = {};
  if (formData.lot_number !== undefined) updateData.lot_number = formData.lot_number;
  if (formData.product_id !== undefined) updateData.product_id = formData.product_id;
  if (formData.variant_id !== undefined) updateData.variant_id = formData.variant_id ?? null;
  if (formData.supplier_id !== undefined) updateData.supplier_id = formData.supplier_id ?? null;
  if (formData.initial_weight_lb !== undefined) updateData.initial_weight_lb = formData.initial_weight_lb;
  if (formData.current_weight_lb !== undefined) updateData.current_weight_lb = formData.current_weight_lb;
  if (formData.cost_per_lb !== undefined) updateData.cost_per_lb = formData.cost_per_lb ?? null;
  if (formData.kill_date !== undefined) updateData.kill_date = formData.kill_date ?? null;
  if (formData.received_date !== undefined) updateData.received_date = formData.received_date;
  if (formData.aging_start_date !== undefined) updateData.aging_start_date = formData.aging_start_date ?? null;
  if (formData.best_by_date !== undefined) updateData.best_by_date = formData.best_by_date ?? null;
  if (formData.notes !== undefined) updateData.notes = formData.notes ?? null;

  const { error } = await supabase
    .from('inventory_lots')
    .update(updateData)
    .eq('id', lotId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updateLot error:', error.message);
    if (error.code === '23505') return { error: 'Lot number already exists' };
    return { error: 'Failed to update lot' };
  }

  revalidatePath('/admin/inventory');
  return { success: true };
}

const LOT_STATUS_FLOW: Record<string, string[]> = {
  receiving: ['aging', 'available'],
  aging: ['available', 'expired', 'waste'],
  available: ['allocated', 'depleted', 'expired', 'waste'],
  allocated: ['available', 'depleted'],
  depleted: [],
  expired: ['waste'],
  waste: [],
};

export async function updateLotStatus(lotId: string, newStatus: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  const { data: lot } = await supabase
    .from('inventory_lots')
    .select('status')
    .eq('id', lotId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!lot) return { error: 'Lot not found' };

  const allowed = LOT_STATUS_FLOW[lot.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${lot.status} to ${newStatus}` };
  }

  const { error } = await supabase
    .from('inventory_lots')
    .update({ status: newStatus })
    .eq('id', lotId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updateLotStatus error:', error.message);
    return { error: 'Failed to update lot status' };
  }

  revalidatePath('/admin/inventory');
  return { success: true };
}
