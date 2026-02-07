-- Fix RLS policies to work without custom JWT claims

-- Replace helper functions using $func$ delimiters (avoids Supabase SQL editor $$ issue)

create or replace function public.get_tenant_id()
returns uuid as $func$
  select tenant_id from public.profiles where id = auth.uid();
$func$ language sql stable security definer;

create or replace function public.get_user_role()
returns text as $func$
  select role::text from public.profiles where id = auth.uid();
$func$ language sql stable security definer;

-- Fix profiles table policies (can't use get_tenant_id since it reads from profiles)
drop policy if exists "Users can view tenant profiles" on profiles;
drop policy if exists "Users can update own profile" on profiles;

create policy "Users can view tenant profiles" on profiles
  for select using (
    tenant_id = (select p.tenant_id from profiles p where p.id = auth.uid())
  );

create policy "Users can update own profile" on profiles
  for update using (id = auth.uid());

create policy "Allow insert own profile" on profiles
  for insert with check (id = auth.uid());
