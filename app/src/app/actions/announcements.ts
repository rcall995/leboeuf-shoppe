'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  published_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

export async function createAnnouncement(formData: {
  title: string;
  body: string;
  published_at?: string | null;
  expires_at?: string | null;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const parsed = announcementSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      tenant_id: profile.tenant_id,
      title: parsed.data.title,
      body: parsed.data.body,
      created_by: profile.id,
      published_at: parsed.data.published_at ?? null,
      expires_at: parsed.data.expires_at ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('createAnnouncement error:', error.message);
    return { error: 'Failed to create announcement' };
  }

  revalidatePath('/admin/announcements');
  revalidatePath('/order/catalog');
  return { id: data.id };
}

export async function updateAnnouncement(
  id: string,
  formData: {
    title?: string;
    body?: string;
    published_at?: string | null;
    expires_at?: string | null;
  }
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const updateData: Record<string, unknown> = {};
  if (formData.title !== undefined) updateData.title = formData.title;
  if (formData.body !== undefined) updateData.body = formData.body;
  if (formData.published_at !== undefined) updateData.published_at = formData.published_at ?? null;
  if (formData.expires_at !== undefined) updateData.expires_at = formData.expires_at ?? null;

  const { error } = await supabase
    .from('announcements')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updateAnnouncement error:', error.message);
    return { error: 'Failed to update announcement' };
  }

  revalidatePath('/admin/announcements');
  revalidatePath('/order/catalog');
  return { success: true };
}

export async function deleteAnnouncement(id: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('deleteAnnouncement error:', error.message);
    return { error: 'Failed to delete announcement' };
  }

  revalidatePath('/admin/announcements');
  revalidatePath('/order/catalog');
  return { success: true };
}

export async function markAnnouncementRead(announcementId: string) {
  const profile = await getProfile();
  if (!profile) {
    return { error: 'Not authenticated' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('announcement_reads')
    .upsert(
      {
        tenant_id: profile.tenant_id,
        announcement_id: announcementId,
        profile_id: profile.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: 'announcement_id,profile_id' }
    );

  if (error) {
    console.error('markAnnouncementRead error:', error.message);
    return { error: 'Failed to mark as read' };
  }

  revalidatePath('/order/catalog');
  return { success: true };
}
