import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Redirect based on role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Root page profile error:', error.message, 'for user:', user.id);
  }

  // If no profile found, send to login instead of creating a loop
  if (!profile) {
    console.error('No profile found for authenticated user:', user.id);
    redirect('/login?error=no_profile');
  }

  if (profile.role === 'customer') {
    redirect('/order/catalog');
  } else {
    redirect('/admin');
  }
}
