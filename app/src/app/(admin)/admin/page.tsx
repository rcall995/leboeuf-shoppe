import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Users, Package, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  weighed: 'bg-indigo-100 text-indigo-800',
  packed: 'bg-cyan-100 text-cyan-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default async function AdminDashboard() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  // Fetch all counts and data in parallel
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

  // Revenue MTD — sum actual_total for delivered orders this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: deliveredOrders } = await supabase
    .from('orders')
    .select('actual_total')
    .eq('status', 'delivered')
    .gte('delivered_at', monthStart);

  const revenueMtd = (deliveredOrders ?? []).reduce(
    (sum, o) => sum + (Number(o.actual_total) || 0),
    0
  );

  // Recent orders (last 10)
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, estimated_total, actual_total, created_at, customer:customers(business_name)')
    .order('created_at', { ascending: false })
    .limit(10);

  // Count orders needing attention (pending + confirmed)
  const { count: needsAttention } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'confirmed']);

  const kpis = [
    {
      label: 'Pending Orders',
      value: pendingOrders,
      sub: 'Awaiting confirmation',
      icon: ShoppingCart,
      color: 'text-amber-600 bg-amber-50',
      href: '/admin/orders?status=pending',
    },
    {
      label: 'Active Customers',
      value: activeCustomers,
      sub: 'Restaurant accounts',
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
      href: '/admin/customers',
    },
    {
      label: 'Products',
      value: activeProducts,
      sub: `${activeVariants} active variants`,
      icon: Package,
      color: 'text-brand bg-brand/10',
      href: '/admin/products',
    },
    {
      label: 'Revenue (MTD)',
      value: revenueMtd > 0 ? `$${revenueMtd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00',
      sub: `${now.toLocaleString('en-US', { month: 'long' })} to date`,
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50',
      href: '/admin/orders?status=delivered',
    },
  ];

  type RecentOrder = {
    id: string;
    order_number: string;
    status: string;
    estimated_total: number | null;
    actual_total: number | null;
    created_at: string;
    customer: { business_name: string };
  };

  const orders = (recentOrders ?? []) as unknown as RecentOrder[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {profile.full_name}</p>
      </div>

      {/* Alerts */}
      {(needsAttention ?? 0) > 0 && (
        <Link href="/admin/orders?status=pending">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">
              {needsAttention} order{(needsAttention ?? 0) !== 1 ? 's' : ''} need attention
            </p>
          </div>
        </Link>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
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
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Order</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Customer</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Total</th>
                    <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const displayTotal = order.actual_total ?? order.estimated_total;
                    return (
                      <tr key={order.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary hover:underline">
                            {order.order_number}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {order.customer.business_name}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge className={`text-xs ${statusColors[order.status] ?? ''}`}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium">
                          {displayTotal ? `$${Number(displayTotal).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground text-xs">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No orders yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Orders will appear here once customers start placing them.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
