import { requireCustomer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Scale } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  weighed: { label: 'Weighed', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  packed: { label: 'Packed', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' },
};

export default async function OrderHistoryPage() {
  const profile = await requireCustomer();
  const supabase = await createClient();

  // Get customer record
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', profile.id)
    .single();

  let orders: Array<{
    id: string;
    order_number: string;
    status: string;
    estimated_total: number | null;
    actual_total: number | null;
    notes: string | null;
    delivery_date: string | null;
    created_at: string;
    items: Array<{
      id: string;
      quantity: number;
      price_per_unit: number;
      unit: string;
      estimated_weight_lb: number | null;
      actual_weight_lb: number | null;
      estimated_line_total: number | null;
      actual_line_total: number | null;
      variant: {
        name: string;
        weight_type: string;
        product: { name: string };
      };
    }>;
  }> = [];

  if (customer) {
    const { data } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        estimated_total,
        actual_total,
        notes,
        delivery_date,
        created_at,
        items:order_items(
          id,
          quantity,
          price_per_unit,
          unit,
          estimated_weight_lb,
          actual_weight_lb,
          estimated_line_total,
          actual_line_total,
          variant:product_variants(
            name,
            weight_type,
            product:products(name)
          )
        )
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    orders = (data ?? []) as unknown as typeof orders;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Order History</h2>
        <p className="text-sm text-muted-foreground">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] ?? { label: order.status, color: '' };
            const displayTotal = order.actual_total ?? order.estimated_total;
            const isEstimate = !order.actual_total && order.estimated_total;

            return (
              <Card key={order.id} className="shadow-sm">
                <CardContent className="py-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-sm">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`${status.color} border text-xs`}>
                        {status.label}
                      </Badge>
                      <p className="text-sm font-bold mt-1">
                        {isEstimate && <span className="text-xs font-normal text-muted-foreground">~</span>}
                        ${displayTotal ? Number(displayTotal).toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="border rounded-lg overflow-hidden">
                    {order.items.map((item, idx) => {
                      const variant = item.variant as { name: string; weight_type: string; product: { name: string } };
                      const lineTotal = item.actual_line_total ?? item.estimated_line_total;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between px-3 py-2 text-xs ${idx > 0 ? 'border-t' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{variant.product.name}</span>
                            {variant.name !== 'Standard' && (
                              <span className="text-muted-foreground"> - {variant.name}</span>
                            )}
                            <div className="text-muted-foreground mt-0.5">
                              {item.quantity}x @ ${Number(item.price_per_unit).toFixed(2)}/{item.unit}
                              {variant.weight_type === 'catch_weight' && (
                                <span className="inline-flex items-center gap-0.5 ml-1">
                                  <Scale className="h-2.5 w-2.5" />
                                  {item.actual_weight_lb
                                    ? `${item.actual_weight_lb} lb`
                                    : `~${item.estimated_weight_lb} lb`
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-medium shrink-0 ml-2">
                            ${lineTotal ? Number(lineTotal).toFixed(2) : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {order.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Note: {order.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No orders yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1 mb-4">Place your first order from the catalog</p>
          <Link href="/order/catalog">
            <Button variant="outline">Browse Catalog</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
