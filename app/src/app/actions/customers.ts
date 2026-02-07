'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';

const customerSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  contact_name: z.string().optional(),
  email: z.email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  delivery_instructions: z.string().optional(),
  payment_terms: z.string().optional(),
  tax_exempt: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function createCustomer(formData: z.input<typeof customerSchema>) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const parsed = customerSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customers')
    .insert({
      tenant_id: profile.tenant_id,
      business_name: parsed.data.business_name,
      contact_name: parsed.data.contact_name || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address_line1: parsed.data.address_line1 || null,
      address_line2: parsed.data.address_line2 || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      zip: parsed.data.zip || null,
      delivery_instructions: parsed.data.delivery_instructions || null,
      payment_terms: parsed.data.payment_terms || 'net_30',
      tax_exempt: parsed.data.tax_exempt ?? false,
      is_active: parsed.data.is_active ?? true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('createCustomer error:', error.message);
    return { error: 'Failed to create customer' };
  }

  revalidatePath('/admin/customers');
  return { id: data.id };
}

export async function updateCustomer(
  customerId: string,
  formData: Partial<z.input<typeof customerSchema>>
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const updateData: Record<string, unknown> = {};

  if (formData.business_name !== undefined) updateData.business_name = formData.business_name;
  if (formData.contact_name !== undefined) updateData.contact_name = formData.contact_name || null;
  if (formData.email !== undefined) updateData.email = formData.email || null;
  if (formData.phone !== undefined) updateData.phone = formData.phone || null;
  if (formData.address_line1 !== undefined) updateData.address_line1 = formData.address_line1 || null;
  if (formData.address_line2 !== undefined) updateData.address_line2 = formData.address_line2 || null;
  if (formData.city !== undefined) updateData.city = formData.city || null;
  if (formData.state !== undefined) updateData.state = formData.state || null;
  if (formData.zip !== undefined) updateData.zip = formData.zip || null;
  if (formData.delivery_instructions !== undefined) updateData.delivery_instructions = formData.delivery_instructions || null;
  if (formData.payment_terms !== undefined) updateData.payment_terms = formData.payment_terms;
  if (formData.tax_exempt !== undefined) updateData.tax_exempt = formData.tax_exempt;
  if (formData.is_active !== undefined) updateData.is_active = formData.is_active;

  const { error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', customerId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updateCustomer error:', error.message);
    return { error: 'Failed to update customer' };
  }

  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
  return { success: true };
}
