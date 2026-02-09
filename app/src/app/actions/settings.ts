'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';

const tenantSettingsSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  domain: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  settings: z.object({
    contact_email: z.string().optional(),
    contact_phone: z.string().optional(),
    address: z.string().optional(),
    tagline: z.string().optional(),
    order_notification_email: z.string().optional(),
  }).optional(),
});

export async function updateTenantSettings(formData: {
  name: string;
  domain?: string | null;
  logo_url?: string | null;
  settings?: {
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    tagline?: string;
    order_notification_email?: string;
  };
}) {
  const profile = await getProfile();
  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    return { error: 'Unauthorized' };
  }

  const parsed = tenantSettingsSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('tenants')
    .update({
      name: parsed.data.name,
      domain: parsed.data.domain ?? null,
      logo_url: parsed.data.logo_url ?? null,
      settings: parsed.data.settings ?? {},
    })
    .eq('id', profile.tenant_id);

  if (error) {
    console.error('updateTenantSettings error:', error.message);
    return { error: 'Failed to update settings' };
  }

  revalidatePath('/admin/settings');
  return { success: true };
}
