'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';

const outputItemSchema = z.object({
  variant_id: z.string().uuid('Select a variant'),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  weight_lb: z.coerce.number().positive('Weight must be positive'),
});

const cuttingSessionSchema = z.object({
  source_lot_id: z.string().uuid('Select a source lot'),
  input_weight_lb: z.coerce.number().positive('Input weight must be positive'),
  session_date: z.string().min(1, 'Session date is required'),
  notes: z.string().nullable().optional(),
  items: z.array(outputItemSchema).min(1, 'Add at least one output item'),
});

export async function createCuttingSession(formData: {
  source_lot_id: string;
  input_weight_lb: number;
  session_date: string;
  notes?: string | null;
  items: { variant_id: string; quantity: number; weight_lb: number }[];
}) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const parsed = cuttingSessionSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const { source_lot_id, input_weight_lb, session_date, notes, items } = parsed.data;

  const totalOutputWeight = items.reduce((sum, item) => sum + item.weight_lb, 0);
  const wasteWeight = Math.round((input_weight_lb - totalOutputWeight) * 100) / 100;
  const yieldPercentage = Math.round((totalOutputWeight / input_weight_lb) * 10000) / 100;

  if (wasteWeight < 0) {
    return { error: 'Output weight exceeds input weight' };
  }

  const supabase = await createClient();

  // Verify source lot exists and has enough weight
  const { data: lot } = await supabase
    .from('inventory_lots')
    .select('current_weight_lb, status')
    .eq('id', source_lot_id)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!lot) return { error: 'Source lot not found' };
  if (!['aging', 'available'].includes(lot.status)) {
    return { error: `Lot must be aging or available (currently ${lot.status})` };
  }
  if (input_weight_lb > Number(lot.current_weight_lb)) {
    return { error: `Input weight (${input_weight_lb} lb) exceeds lot's current weight (${lot.current_weight_lb} lb)` };
  }

  // Create cutting session
  const { data: session, error: sessionError } = await supabase
    .from('cutting_sessions')
    .insert({
      tenant_id: profile.tenant_id,
      source_lot_id,
      performed_by: profile.id,
      session_date,
      input_weight_lb,
      total_output_weight_lb: totalOutputWeight,
      waste_weight_lb: wasteWeight,
      yield_percentage: yieldPercentage,
      notes: notes ?? null,
    })
    .select('id')
    .single();

  if (sessionError) {
    console.error('createCuttingSession error:', sessionError.message);
    return { error: 'Failed to create cutting session' };
  }

  // Insert output items
  const sessionItems = items.map((item) => ({
    tenant_id: profile.tenant_id,
    session_id: session.id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    weight_lb: item.weight_lb,
  }));

  const { error: itemsError } = await supabase
    .from('cutting_session_items')
    .insert(sessionItems);

  if (itemsError) {
    console.error('createCuttingSessionItems error:', itemsError.message);
    // Session was created, items failed — still return partial success
    return { error: 'Session created but failed to save some output items' };
  }

  // Deduct weight from source lot
  const newWeight = Math.round((Number(lot.current_weight_lb) - input_weight_lb) * 100) / 100;
  const lotUpdate: Record<string, unknown> = { current_weight_lb: newWeight };
  if (newWeight <= 0) {
    lotUpdate.status = 'depleted';
    lotUpdate.current_weight_lb = 0;
  }

  await supabase
    .from('inventory_lots')
    .update(lotUpdate)
    .eq('id', source_lot_id)
    .eq('tenant_id', profile.tenant_id);

  revalidatePath('/admin/inventory');
  return { id: session.id, yield_percentage: yieldPercentage, waste_weight_lb: wasteWeight };
}
