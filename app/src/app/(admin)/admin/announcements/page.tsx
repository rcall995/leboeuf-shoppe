import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AnnouncementsList } from './announcements-list';

export default async function AnnouncementsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from('announcements')
    .select('*, created_by_profile:profiles(full_name)')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false });

  type AnnouncementRow = {
    id: string;
    title: string;
    body: string;
    published_at: string | null;
    expires_at: string | null;
    created_at: string;
    created_by_profile: { full_name: string } | null;
  };

  return (
    <AnnouncementsList
      announcements={(announcements ?? []) as unknown as AnnouncementRow[]}
    />
  );
}
