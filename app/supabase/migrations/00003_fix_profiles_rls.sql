-- Fix circular RLS dependency on profiles table
-- The subquery in the policy was subject to RLS itself, creating a loop.
-- Use the security definer function get_tenant_id() instead.

drop policy if exists "Users can view tenant profiles" on profiles;

create policy "Users can view tenant profiles" on profiles
  for select using (tenant_id = public.get_tenant_id());
