import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types/database';

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('getProfile error:', error.message, 'for user:', user.id);
  }

  return profile;
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/login');
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role === 'customer') {
    redirect('/order/catalog');
  }
  return profile;
}

export async function requireCustomer(): Promise<Profile> {
  const profile = await requireAuth();
  return profile;
}
