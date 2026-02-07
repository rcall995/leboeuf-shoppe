import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SettingsView } from './settings-view';

export default async function SettingsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single();

  type TenantRow = {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    logo_url: string | null;
    settings: {
      contact_email?: string;
      contact_phone?: string;
      address?: string;
      tagline?: string;
    };
  };

  return (
    <SettingsView
      tenant={(tenant ?? { id: '', name: '', slug: '', domain: null, logo_url: null, settings: {} }) as unknown as TenantRow}
      profileName={profile.full_name}
      profileEmail={profile.email}
    />
  );
}
