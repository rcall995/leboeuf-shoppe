-- Le Boeuf Shoppe - Initial Schema
-- Multi-tenant B2B ordering + inventory management

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('owner', 'admin', 'sales_rep', 'customer');
create type order_status as enum ('pending', 'confirmed', 'processing', 'weighed', 'packed', 'out_for_delivery', 'delivered', 'cancelled');
create type lot_status as enum ('receiving', 'aging', 'available', 'allocated', 'depleted', 'expired', 'waste');
create type po_status as enum ('draft', 'submitted', 'confirmed', 'received', 'cancelled');
create type unit_type as enum ('lb', 'kg', 'each', 'case');
create type weight_type as enum ('catch_weight', 'fixed_weight', 'each');

-- ============================================================
-- 1. TENANTS
-- ============================================================
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  domain text,
  logo_url text,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 2. PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id),
  role user_role not null default 'customer',
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 3. CATEGORIES
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  slug text not null,
  sort_order integer default 0,
  created_at timestamptz default now(),
  unique (tenant_id, slug)
);

-- ============================================================
-- 4. PRODUCTS
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  category_id uuid references categories(id),
  name text not null,
  description text,
  image_url text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 5. PRODUCT VARIANTS
-- ============================================================
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  product_id uuid not null references products(id) on delete cascade,
  name text not null, -- e.g. 'King Cut', 'Standard Cut', 'Half', 'Whole'
  sku text,
  weight_type weight_type not null default 'catch_weight',
  default_price_per_unit numeric(10,2) not null,
  unit unit_type not null default 'lb',
  estimated_weight_lb numeric(8,2), -- for catch weight: average expected weight
  min_weight_lb numeric(8,2),
  max_weight_lb numeric(8,2),
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, sku)
);

-- ============================================================
-- 6. CUSTOMERS (restaurant accounts)
-- ============================================================
create table customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  profile_id uuid references profiles(id), -- linked user account
  business_name text not null,
  contact_name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  delivery_instructions text,
  payment_terms text default 'net_30',
  tax_exempt boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 7. CUSTOMER PRICING (per-customer per-variant pricing)
-- ============================================================
create table customer_pricing (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  customer_id uuid not null references customers(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  price_per_unit numeric(10,2) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (customer_id, variant_id)
);

-- ============================================================
-- 8. SUPPLIERS
-- ============================================================
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 9. ORDERS
-- ============================================================
create table orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  customer_id uuid not null references customers(id),
  order_number text not null,
  status order_status not null default 'pending',
  placed_by uuid references profiles(id), -- who placed the order
  assigned_to uuid references profiles(id), -- sales rep
  estimated_total numeric(10,2),
  actual_total numeric(10,2),
  notes text,
  delivery_date date,
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, order_number)
);

-- ============================================================
-- 10. ORDER ITEMS
-- ============================================================
create table order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  lot_id uuid, -- assigned at fulfillment
  quantity integer not null default 1,
  unit unit_type not null default 'lb',
  price_per_unit numeric(10,2) not null, -- locked at order time
  estimated_weight_lb numeric(8,2),
  actual_weight_lb numeric(8,2), -- entered at fulfillment
  estimated_line_total numeric(10,2),
  actual_line_total numeric(10,2),
  created_at timestamptz default now()
);

-- ============================================================
-- 11. INVENTORY LOTS
-- ============================================================
create table inventory_lots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  product_id uuid not null references products(id),
  variant_id uuid references product_variants(id),
  supplier_id uuid references suppliers(id),
  lot_number text not null,
  status lot_status not null default 'receiving',
  initial_weight_lb numeric(10,2) not null,
  current_weight_lb numeric(10,2) not null,
  cost_per_lb numeric(10,2),
  kill_date date,
  received_date date not null default current_date,
  aging_start_date date,
  best_by_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, lot_number)
);

-- ============================================================
-- 12. CUTTING SESSIONS
-- ============================================================
create table cutting_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  source_lot_id uuid not null references inventory_lots(id),
  performed_by uuid references profiles(id),
  session_date date not null default current_date,
  input_weight_lb numeric(10,2) not null,
  total_output_weight_lb numeric(10,2),
  waste_weight_lb numeric(10,2),
  yield_percentage numeric(5,2),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- 13. CUTTING SESSION ITEMS (output pieces)
-- ============================================================
create table cutting_session_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  session_id uuid not null references cutting_sessions(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  output_lot_id uuid references inventory_lots(id), -- new lot created
  quantity integer not null default 1,
  weight_lb numeric(8,2) not null,
  created_at timestamptz default now()
);

-- ============================================================
-- 14. PURCHASE ORDERS
-- ============================================================
create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  supplier_id uuid not null references suppliers(id),
  po_number text not null,
  status po_status not null default 'draft',
  ordered_by uuid references profiles(id),
  expected_delivery date,
  total_cost numeric(10,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, po_number)
);

-- ============================================================
-- 15. PURCHASE ORDER ITEMS
-- ============================================================
create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  product_id uuid not null references products(id),
  variant_id uuid references product_variants(id),
  quantity numeric(10,2) not null,
  unit unit_type not null default 'lb',
  cost_per_unit numeric(10,2),
  received_quantity numeric(10,2),
  created_at timestamptz default now()
);

-- ============================================================
-- 16. PICK LISTS
-- ============================================================
create table pick_lists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  order_id uuid not null references orders(id),
  assigned_to uuid references profiles(id),
  is_complete boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- 17. PICK LIST ITEMS
-- ============================================================
create table pick_list_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  pick_list_id uuid not null references pick_lists(id) on delete cascade,
  order_item_id uuid not null references order_items(id),
  lot_id uuid references inventory_lots(id),
  picked boolean default false,
  picked_weight_lb numeric(8,2),
  picked_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- 18. DELIVERY ROUTES
-- ============================================================
create table delivery_routes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  driver_id uuid references profiles(id),
  route_date date not null,
  is_complete boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- 19. DELIVERY STOPS
-- ============================================================
create table delivery_stops (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  route_id uuid not null references delivery_routes(id) on delete cascade,
  order_id uuid not null references orders(id),
  customer_id uuid not null references customers(id),
  stop_order integer not null,
  delivered boolean default false,
  delivered_at timestamptz,
  signature_url text,
  photo_url text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- 20. ANNOUNCEMENTS
-- ============================================================
create table announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  title text not null,
  body text not null,
  created_by uuid references profiles(id),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- 21. ANNOUNCEMENT READS
-- ============================================================
create table announcement_reads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  announcement_id uuid not null references announcements(id) on delete cascade,
  profile_id uuid not null references profiles(id),
  read_at timestamptz default now(),
  unique (announcement_id, profile_id)
);

-- ============================================================
-- 22. INTEGRATIONS
-- ============================================================
create table integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  provider text not null, -- 'quickbooks', 'shopify', etc.
  config jsonb default '{}', -- encrypted tokens, settings
  is_active boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, provider)
);

-- ============================================================
-- 23. AUDIT LOG
-- ============================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid references profiles(id),
  action text not null,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_profiles_tenant on profiles(tenant_id);
create index idx_products_tenant on products(tenant_id);
create index idx_products_category on products(category_id);
create index idx_variants_product on product_variants(product_id);
create index idx_variants_tenant on product_variants(tenant_id);
create index idx_customers_tenant on customers(tenant_id);
create index idx_customer_pricing_customer on customer_pricing(customer_id);
create index idx_customer_pricing_variant on customer_pricing(variant_id);
create index idx_orders_tenant on orders(tenant_id);
create index idx_orders_customer on orders(customer_id);
create index idx_orders_status on orders(status);
create index idx_order_items_order on order_items(order_id);
create index idx_inventory_lots_tenant on inventory_lots(tenant_id);
create index idx_inventory_lots_product on inventory_lots(product_id);
create index idx_inventory_lots_status on inventory_lots(status);
create index idx_cutting_sessions_lot on cutting_sessions(source_lot_id);
create index idx_purchase_orders_tenant on purchase_orders(tenant_id);
create index idx_pick_lists_order on pick_lists(order_id);
create index idx_delivery_routes_tenant on delivery_routes(tenant_id);
create index idx_delivery_stops_route on delivery_stops(route_id);
create index idx_announcements_tenant on announcements(tenant_id);
create index idx_audit_log_tenant on audit_log(tenant_id);
create index idx_audit_log_record on audit_log(table_name, record_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tenants_updated before update on tenants for each row execute function update_updated_at();
create trigger trg_profiles_updated before update on profiles for each row execute function update_updated_at();
create trigger trg_products_updated before update on products for each row execute function update_updated_at();
create trigger trg_variants_updated before update on product_variants for each row execute function update_updated_at();
create trigger trg_customers_updated before update on customers for each row execute function update_updated_at();
create trigger trg_customer_pricing_updated before update on customer_pricing for each row execute function update_updated_at();
create trigger trg_orders_updated before update on orders for each row execute function update_updated_at();
create trigger trg_inventory_lots_updated before update on inventory_lots for each row execute function update_updated_at();
create trigger trg_purchase_orders_updated before update on purchase_orders for each row execute function update_updated_at();
create trigger trg_integrations_updated before update on integrations for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper function to get tenant_id from JWT
create or replace function public.get_tenant_id()
returns uuid as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid,
    null
  );
$$ language sql stable;

-- Helper function to get user role from JWT
create or replace function public.get_user_role()
returns text as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'user_role',
    'customer'
  );
$$ language sql stable;

-- Enable RLS on all tables
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table customers enable row level security;
alter table customer_pricing enable row level security;
alter table suppliers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table inventory_lots enable row level security;
alter table cutting_sessions enable row level security;
alter table cutting_session_items enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
alter table pick_lists enable row level security;
alter table pick_list_items enable row level security;
alter table delivery_routes enable row level security;
alter table delivery_stops enable row level security;
alter table announcements enable row level security;
alter table announcement_reads enable row level security;
alter table integrations enable row level security;
alter table audit_log enable row level security;

-- Tenant isolation policies (admin/owner can see all tenant data)
-- Customers see only their own data

-- Tenants: users can read their own tenant
create policy "Users can view own tenant" on tenants
  for select using (id = public.get_tenant_id());

-- Profiles: users see profiles in their tenant
create policy "Users can view tenant profiles" on profiles
  for select using (tenant_id = public.get_tenant_id());
create policy "Users can update own profile" on profiles
  for update using (id = auth.uid());

-- Categories: tenant-scoped read
create policy "Tenant can view categories" on categories
  for select using (tenant_id = public.get_tenant_id());
create policy "Admin can manage categories" on categories
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Products: tenant-scoped read, admin write
create policy "Tenant can view products" on products
  for select using (tenant_id = public.get_tenant_id());
create policy "Admin can manage products" on products
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Product Variants: tenant-scoped read, admin write
create policy "Tenant can view variants" on product_variants
  for select using (tenant_id = public.get_tenant_id());
create policy "Admin can manage variants" on product_variants
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Customers: admin sees all, customer sees own
create policy "Admin can view all customers" on customers
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin', 'sales_rep'));
create policy "Customer can view own record" on customers
  for select using (tenant_id = public.get_tenant_id() and profile_id = auth.uid());
create policy "Admin can manage customers" on customers
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Customer Pricing: admin sees all, customer sees own
create policy "Admin can view all pricing" on customer_pricing
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin', 'sales_rep'));
create policy "Customer can view own pricing" on customer_pricing
  for select using (
    tenant_id = public.get_tenant_id()
    and customer_id in (select id from customers where profile_id = auth.uid())
  );
create policy "Admin can manage pricing" on customer_pricing
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Suppliers: admin only
create policy "Admin can view suppliers" on suppliers
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage suppliers" on suppliers
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Orders: admin sees all, customer sees own
create policy "Admin can view all orders" on orders
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin', 'sales_rep'));
create policy "Customer can view own orders" on orders
  for select using (
    tenant_id = public.get_tenant_id()
    and customer_id in (select id from customers where profile_id = auth.uid())
  );
create policy "Customer can create orders" on orders
  for insert with check (
    tenant_id = public.get_tenant_id()
    and customer_id in (select id from customers where profile_id = auth.uid())
  );
create policy "Admin can manage orders" on orders
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin', 'sales_rep'));

-- Order Items: follow order access
create policy "Users can view order items" on order_items
  for select using (
    tenant_id = public.get_tenant_id()
    and order_id in (select id from orders)
  );
create policy "Admin can manage order items" on order_items
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin', 'sales_rep'));

-- Inventory: admin only
create policy "Admin can view inventory" on inventory_lots
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage inventory" on inventory_lots
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Cutting sessions: admin only
create policy "Admin can view cutting sessions" on cutting_sessions
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage cutting sessions" on cutting_sessions
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

create policy "Admin can view cutting items" on cutting_session_items
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage cutting items" on cutting_session_items
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Purchase orders: admin only
create policy "Admin can view POs" on purchase_orders
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage POs" on purchase_orders
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

create policy "Admin can view PO items" on purchase_order_items
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage PO items" on purchase_order_items
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Pick lists: admin only
create policy "Admin can view pick lists" on pick_lists
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage pick lists" on pick_lists
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

create policy "Admin can view pick items" on pick_list_items
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage pick items" on pick_list_items
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Delivery routes: admin only
create policy "Admin can view routes" on delivery_routes
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage routes" on delivery_routes
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

create policy "Admin can view stops" on delivery_stops
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));
create policy "Admin can manage stops" on delivery_stops
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- Announcements: all tenant users can read, admin can write
create policy "Tenant can view announcements" on announcements
  for select using (tenant_id = public.get_tenant_id());
create policy "Admin can manage announcements" on announcements
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

create policy "Users can view own reads" on announcement_reads
  for select using (tenant_id = public.get_tenant_id() and profile_id = auth.uid());
create policy "Users can mark as read" on announcement_reads
  for insert with check (tenant_id = public.get_tenant_id() and profile_id = auth.uid());

-- Integrations: owner only
create policy "Owner can view integrations" on integrations
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() = 'owner');
create policy "Owner can manage integrations" on integrations
  for all using (tenant_id = public.get_tenant_id() and public.get_user_role() = 'owner');

-- Audit log: admin read only
create policy "Admin can view audit log" on audit_log
  for select using (tenant_id = public.get_tenant_id() and public.get_user_role() in ('owner', 'admin'));

-- ============================================================
-- ORDER NUMBER GENERATION
-- ============================================================
create or replace function generate_order_number(p_tenant_id uuid)
returns text as $$
declare
  v_count integer;
  v_prefix text;
begin
  select count(*) + 1 into v_count from orders where tenant_id = p_tenant_id;
  select upper(left(slug, 3)) into v_prefix from tenants where id = p_tenant_id;
  return v_prefix || '-' || lpad(v_count::text, 5, '0');
end;
$$ language plpgsql;
