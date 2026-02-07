'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, ChevronRight } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  estimated_total: number | null;
  actual_total: number | null;
  created_at: string;
  customer: { business_name: string };
}

interface OrdersListProps {
  orders: Order[];
  statusCounts: Record<string, number>;
  currentFilter: string;
}

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

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'delivered', label: 'Delivered' },
];

export function OrdersList({ orders, statusCounts, currentFilter }: OrdersListProps) {
  const router = useRouter();
  const totalOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  function handleFilter(key: string) {
    if (key === 'all') {
      router.push('/admin/orders');
    } else {
      router.push(`/admin/orders?status=${key}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Orders</h2>
        <span className="text-sm text-muted-foreground">{totalOrders} total</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {FILTER_TABS.map((tab) => {
          const count = tab.key === 'all' ? totalOrders : (statusCounts[tab.key] ?? 0);
          const isActive = currentFilter === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleFilter(tab.key)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const displayTotal = order.actual_total ?? order.estimated_total;
            const isEstimate = !order.actual_total && !!order.estimated_total;

            return (
              <Link key={order.id} href={`/admin/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{order.customer.business_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge className={statusColors[order.status] ?? ''}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                          <p className="text-sm font-medium mt-1">
                            {isEstimate && <span className="text-xs font-normal text-muted-foreground">~</span>}
                            {displayTotal ? `$${Number(displayTotal).toFixed(2)}` : '—'}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {currentFilter === 'all' ? 'No orders yet' : `No ${currentFilter} orders`}
          </p>
        </div>
      )}
    </div>
  );
}
