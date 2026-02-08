import { requireCustomer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HomeView } from './home-view';

export default async function CustomerHomePage() {
  const profile = await requireCustomer();
  const supabase = await createClient();

  // Get customer record
  const { data: customer } = await supabase
    .from('customers')
    .select('id, business_name, contact_name')
    .eq('profile_id', profile.id)
    .single();

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">
          Your account is not linked to a customer profile yet. Please contact Le Boeuf Shoppe.
        </p>
      </div>
    );
  }

  // Fetch recent orders (last 5)
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      estimated_total,
      created_at,
      items:order_items(
        id,
        quantity,
        unit,
        estimated_weight_lb,
        estimated_line_total,
        variant:product_variants(
          name,
          product:products(name)
        )
      )
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch active announcements
  const now = new Date().toISOString();
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, body, published_at')
    .eq('tenant_id', profile.tenant_id)
    .not('published_at', 'is', null)
    .lte('published_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  const { data: reads } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('profile_id', profile.id);

  const readIds = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id));

  type OrderItem = {
    id: string;
    quantity: number;
    unit: string;
    estimated_weight_lb: number | null;
    estimated_line_total: number | null;
    variant: {
      name: string;
      product: { name: string };
    };
  };

  type Order = {
    id: string;
    order_number: string;
    status: string;
    estimated_total: number | null;
    created_at: string;
    items: OrderItem[];
  };

  type Announcement = {
    id: string;
    title: string;
    body: string;
    published_at: string | null;
  };

  return (
    <HomeView
      customerName={customer.contact_name ?? customer.business_name}
      businessName={customer.business_name}
      recentOrders={(recentOrders ?? []) as unknown as Order[]}
      announcements={(announcements ?? []) as unknown as Announcement[]}
      readIds={readIds}
    />
  );
}
