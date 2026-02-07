-- Fix: Allow customers to insert order_items for their own orders
-- This was missing from the initial schema, causing order items to silently
-- fail when customers place orders (only the order header was created).

create policy "Customer can create order items" on order_items
  for insert with check (
    tenant_id = public.get_tenant_id()
    and order_id in (
      select id from orders
      where customer_id in (
        select id from customers where profile_id = auth.uid()
      )
    )
  );
