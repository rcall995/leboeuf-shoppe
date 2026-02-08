import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ReportsView } from './reports-view';

export default async function ReportsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  // Fetch all orders with customer info
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, estimated_total, actual_total, delivered_at, created_at, customer:customers(id, business_name)')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: true });

  // Fetch order items with product info (for delivered orders)
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_id, quantity, estimated_weight_lb, actual_weight_lb, variant:product_variants(name, product:products(name))')
    .eq('tenant_id', profile.tenant_id);

  type OrderRow = {
    id: string;
    status: string;
    estimated_total: number | null;
    actual_total: number | null;
    delivered_at: string | null;
    created_at: string;
    customer: { id: string; business_name: string };
  };

  type ItemRow = {
    order_id: string;
    quantity: number;
    estimated_weight_lb: number | null;
    actual_weight_lb: number | null;
    variant: { name: string; product: { name: string } };
  };

  const allOrders = (orders ?? []) as unknown as OrderRow[];
  const allItems = (orderItems ?? []) as unknown as ItemRow[];

  // Build a set of delivered order IDs
  const deliveredOrders = allOrders.filter((o) => o.status === 'delivered');
  const deliveredIds = new Set(deliveredOrders.map((o) => o.id));

  // --- Revenue by day ---
  const revenueMap = new Map<string, number>();
  for (const order of deliveredOrders) {
    const date = order.delivered_at
      ? order.delivered_at.split('T')[0]
      : order.created_at.split('T')[0];
    const revenue = Number(order.actual_total ?? order.estimated_total ?? 0);
    revenueMap.set(date, (revenueMap.get(date) ?? 0) + revenue);
  }
  const revenueByDay = Array.from(revenueMap.entries())
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Top customers ---
  const customerMap = new Map<string, { name: string; revenue: number }>();
  for (const order of deliveredOrders) {
    const name = order.customer.business_name;
    const revenue = Number(order.actual_total ?? order.estimated_total ?? 0);
    const entry = customerMap.get(name) ?? { name, revenue: 0 };
    entry.revenue += revenue;
    customerMap.set(name, entry);
  }
  const topCustomers = Array.from(customerMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((c) => ({ name: c.name, revenue: Math.round(c.revenue * 100) / 100 }));

  // --- Status distribution ---
  const statusMap = new Map<string, number>();
  for (const order of allOrders) {
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1);
  }
  const statusDistribution = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }));

  // --- Top products by weight ---
  const productMap = new Map<string, { name: string; weight: number }>();
  for (const item of allItems) {
    if (!deliveredIds.has(item.order_id)) continue;
    const name = `${item.variant.product.name} - ${item.variant.name}`;
    const weight = Number(item.actual_weight_lb ?? item.estimated_weight_lb ?? 0);
    const entry = productMap.get(name) ?? { name, weight: 0 };
    entry.weight += weight;
    productMap.set(name, entry);
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10)
    .map((p) => ({ name: p.name, weight: Math.round(p.weight * 100) / 100 }));

  // --- Summary ---
  const totalOrders = allOrders.length;
  const totalRevenue = deliveredOrders.reduce(
    (sum, o) => sum + Number(o.actual_total ?? o.estimated_total ?? 0),
    0
  );
  const averageOrderValue = deliveredOrders.length > 0
    ? totalRevenue / deliveredOrders.length
    : 0;
  const nonCancelled = allOrders.filter((o) => o.status !== 'cancelled').length;
  const fulfillmentRate = nonCancelled > 0
    ? (deliveredOrders.length / nonCancelled) * 100
    : 0;

  return (
    <ReportsView
      revenueByDay={revenueByDay}
      topCustomers={topCustomers}
      statusDistribution={statusDistribution}
      topProducts={topProducts}
      summary={{
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        fulfillmentRate: Math.round(fulfillmentRate * 10) / 10,
      }}
    />
  );
}
