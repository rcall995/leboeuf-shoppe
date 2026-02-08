'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, ClipboardList, RotateCcw, Clock, Package, ChevronRight } from 'lucide-react';
import { AnnouncementsBanner } from '@/components/announcements/announcements-banner';

interface OrderItem {
  id: string;
  quantity: number;
  unit: string;
  estimated_weight_lb: number | null;
  estimated_line_total: number | null;
  variant: {
    name: string;
    product: { name: string };
  };
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  estimated_total: number | null;
  created_at: string;
  items: OrderItem[];
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
}

interface HomeViewProps {
  customerName: string;
  businessName: string;
  recentOrders: Order[];
  announcements: Announcement[];
  readIds: Set<string>;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function HomeView({ customerName, businessName, recentOrders, announcements, readIds }: HomeViewProps) {
  const firstName = customerName.split(' ')[0];
  const activeOrders = recentOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const lastOrder = recentOrders[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative -mx-4 -mt-4 md:mx-0 md:mt-0 md:rounded-xl overflow-hidden">
        <div className="relative h-48 sm:h-56 md:h-64 lg:h-72">
          <Image
            src="/images/steak1.jpeg"
            alt="Premium wagyu steak"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 md:p-8">
            <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider uppercase">
              {businessName}
            </p>
            <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold mt-1">
              Welcome, {firstName}
            </h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1">
              Never Frozen. Always Fresh. Always Wagyu.
            </p>
          </div>
        </div>
      </div>

      {/* Announcements */}
      <AnnouncementsBanner announcements={announcements} readIds={readIds} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Link href="/order/catalog">
          <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-4 md:py-6 flex flex-col items-center text-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary">
                <ShoppingBag className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <span className="text-sm md:text-base font-semibold">Browse Catalog</span>
              <span className="text-xs text-muted-foreground hidden sm:block">View products & pricing</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/order/history">
          <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-4 md:py-6 flex flex-col items-center text-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary">
                <ClipboardList className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <span className="text-sm md:text-base font-semibold">Order History</span>
              <span className="text-xs text-muted-foreground hidden sm:block">View past orders</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Active Orders
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {activeOrders.map((order) => (
              <Link key={order.id} href="/order/history">
                <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-3 md:py-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{order.order_number}</span>
                          <Badge className={`text-[10px] ${statusColors[order.status] ?? ''}`}>
                            {formatStatus(order.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''} &middot; {timeAgo(order.created_at)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold">
                          ${(order.estimated_total ?? 0).toFixed(2)}
                        </p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Last Order / Quick Reorder */}
      {lastOrder && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Last Order
            </h2>
          </div>
          <Card className="shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-bold">{lastOrder.order_number}</span>
                  <span className="text-xs text-muted-foreground ml-2">{timeAgo(lastOrder.created_at)}</span>
                </div>
                <Badge className={`text-[10px] ${statusColors[lastOrder.status] ?? ''}`}>
                  {formatStatus(lastOrder.status)}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {lastOrder.items.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {item.variant.product.name}
                        {item.variant.name !== 'Standard' ? ` - ${item.variant.name}` : ''}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs shrink-0 ml-2">
                      {item.unit === 'case'
                        ? `${item.quantity} case${item.quantity !== 1 ? 's' : ''}`
                        : `${item.estimated_weight_lb ?? item.quantity} lbs`}
                    </span>
                  </div>
                ))}
                {lastOrder.items.length > 4 && (
                  <p className="text-xs text-muted-foreground">
                    +{lastOrder.items.length - 4} more item{lastOrder.items.length - 4 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <span className="text-sm font-bold">
                  ${(lastOrder.estimated_total ?? 0).toFixed(2)}
                </span>
                <Link href="/order/catalog">
                  <Button size="sm" variant="outline">
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reorder
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {recentOrders.length === 0 && (
        <Card className="shadow-sm">
          <CardContent className="py-8 md:py-12 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No orders yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1 mb-4">
              Browse the catalog to place your first order
            </p>
            <Link href="/order/catalog">
              <Button>Browse Catalog</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
