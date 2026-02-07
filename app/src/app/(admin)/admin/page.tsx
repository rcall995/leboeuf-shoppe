import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Users, Package, DollarSign } from 'lucide-react';

export default async function AdminDashboard() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const [ordersRes, customersRes, productsRes, variantsRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('product_variants').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const pendingOrders = ordersRes.count ?? 0;
  const activeCustomers = customersRes.count ?? 0;
  const activeProducts = productsRes.count ?? 0;
  const activeVariants = variantsRes.count ?? 0;

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*, customer:customers(business_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  const kpis = [
    {
      label: 'Pending Orders',
      value: pendingOrders,
      sub: 'Awaiting processing',
      icon: ShoppingCart,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Active Customers',
      value: activeCustomers,
      sub: 'Restaurant accounts',
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Products',
      value: activeProducts,
      sub: `${activeVariants} active variants`,
      icon: Package,
      color: 'text-brand bg-brand/10',
    },
    {
      label: 'Revenue (MTD)',
      value: '$0',
      sub: 'Month to date',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {profile.full_name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <div className={`p-2 rounded-lg ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders && recentOrders.length > 0 ? (
            <p className="text-muted-foreground text-sm">Orders listed here.</p>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No orders yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Orders will appear here once customers start placing them.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
