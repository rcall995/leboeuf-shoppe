'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function upsertPricing(
  customerId: string,
  variantId: string,
  pricePerUnit: number
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  if (pricePerUnit <= 0) {
    return { error: 'Price must be positive' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('customer_pricing')
    .upsert(
      {
        tenant_id: profile.tenant_id,
        customer_id: customerId,
        variant_id: variantId,
        price_per_unit: Math.round(pricePerUnit * 100) / 100,
      },
      { onConflict: 'customer_id,variant_id' }
    );

  if (error) {
    console.error('upsertPricing error:', error.message);
    return { error: 'Failed to save pricing' };
  }

  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true };
}

export async function removePricing(customerId: string, variantId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('customer_pricing')
    .delete()
    .eq('customer_id', customerId)
    .eq('variant_id', variantId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('removePricing error:', error.message);
    return { error: 'Failed to remove pricing' };
  }

  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true };
}

export async function copyPricingFromCustomer(
  targetCustomerId: string,
  sourceCustomerId: string
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Get source pricing
  const { data: sourcePricing, error: fetchError } = await supabase
    .from('customer_pricing')
    .select('variant_id, price_per_unit')
    .eq('customer_id', sourceCustomerId)
    .eq('tenant_id', profile.tenant_id);

  if (fetchError || !sourcePricing) {
    return { error: 'Failed to fetch source pricing' };
  }

  if (sourcePricing.length === 0) {
    return { error: 'Source customer has no pricing' };
  }

  // Upsert all pricing rows for the target customer
  const rows = sourcePricing.map((p) => ({
    tenant_id: profile.tenant_id,
    customer_id: targetCustomerId,
    variant_id: p.variant_id,
    price_per_unit: p.price_per_unit,
  }));

  const { error: upsertError } = await supabase
    .from('customer_pricing')
    .upsert(rows, { onConflict: 'customer_id,variant_id' });

  if (upsertError) {
    console.error('copyPricing error:', upsertError.message);
    return { error: 'Failed to copy pricing' };
  }

  revalidatePath(`/admin/customers/${targetCustomerId}`);
  return { success: true, count: sourcePricing.length };
}
