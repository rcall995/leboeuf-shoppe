'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Scale,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  XCircle,
  Calculator,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateOrderStatus, updateOrderItemWeight, recalculateOrderTotal } from '@/app/actions/orders';

interface OrderItem {
  id: string;
  variant_id: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  estimated_weight_lb: number | null;
  actual_weight_lb: number | null;
  estimated_line_total: number | null;
  actual_line_total: number | null;
  variant: {
    id: string;
    name: string;
    sku: string | null;
    weight_type: string;
    product: { name: string };
  };
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  estimated_total: number | null;
  actual_total: number | null;
  notes: string | null;
  delivery_date: string | null;
  delivered_at: string | null;
  created_at: string;
  customer: {
    id: string;
    business_name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Package },
  weighed: { label: 'Weighed', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Scale },
  packed: { label: 'Packed', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Package },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

const STATUS_FLOW: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['weighed', 'cancelled'],
  weighed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

const ALL_STATUSES = ['pending', 'confirmed', 'processing', 'weighed', 'packed', 'out_for_delivery', 'delivered'];

export function OrderDetail({ order }: { order: OrderData }) {
  const [weights, setWeights] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of order.items) {
      if (item.actual_weight_lb) {
        initial[item.id] = String(item.actual_weight_lb);
      }
    }
    return initial;
  });
  const [isPending, startTransition] = useTransition();

  const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: '', icon: Clock };
  const nextStatuses = STATUS_FLOW[order.status] ?? [];
  const currentIdx = ALL_STATUSES.indexOf(order.status);

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, newStatus);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Order ${newStatus === 'cancelled' ? 'cancelled' : `moved to ${newStatus.replace('_', ' ')}`}`);
    });
  }

  function handleWeightSave(itemId: string) {
    const weight = parseFloat(weights[itemId]);
    if (isNaN(weight) || weight <= 0) {
      toast.error('Enter a valid weight');
      return;
    }

    startTransition(async () => {
      const result = await updateOrderItemWeight(itemId, weight);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Weight saved');
    });
  }

  function handleRecalculate() {
    startTransition(async () => {
      const result = await recalculateOrderTotal(order.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Total recalculated: $${result.actual_total?.toFixed(2)}`);
    });
  }

  const displayTotal = order.actual_total ?? order.estimated_total;
  const isEstimate = !order.actual_total && !!order.estimated_total;

  return (
    <div className="space-y-6">
      {/* Status timeline */}
      <Card className="shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {ALL_STATUSES.map((s, idx) => {
              const conf = STATUS_CONFIG[s];
              const isActive = s === order.status;
              const isPast = idx < currentIdx;
              const isCancelled = order.status === 'cancelled';

              return (
                <div key={s} className="flex items-center">
                  {idx > 0 && (
                    <div className={`h-0.5 w-6 ${isPast ? 'bg-emerald-400' : 'bg-border'}`} />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      isActive
                        ? `${conf.color} border`
                        : isPast
                        ? 'bg-emerald-50 text-emerald-700'
                        : isCancelled
                        ? 'bg-muted text-muted-foreground/40'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isActive && <conf.icon className="h-3 w-3" />}
                    {conf.label}
                  </div>
                </div>
              );
            })}
          </div>

          {nextStatuses.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="flex gap-2">
                {nextStatuses.filter(s => s !== 'cancelled').map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    onClick={() => handleStatusChange(s)}
                    disabled={isPending}
                  >
                    Move to {STATUS_CONFIG[s]?.label ?? s}
                  </Button>
                ))}
                {nextStatuses.includes('cancelled') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive hover:text-white"
                    onClick={() => handleStatusChange('cancelled')}
                    disabled={isPending}
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer info */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{order.customer.business_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
            {order.customer.contact_name && <span>{order.customer.contact_name}</span>}
            {order.customer.phone && (
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{order.customer.phone}</span>
            )}
            {order.customer.email && (
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{order.customer.email}</span>
            )}
            {order.customer.address_line1 && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {order.customer.address_line1}, {order.customer.city}, {order.customer.state} {order.customer.zip}
              </span>
            )}
          </div>
          {order.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">Note: {order.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Order items with weight entry */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Order Items</CardTitle>
            <Button size="sm" variant="outline" onClick={handleRecalculate} disabled={isPending}>
              <Calculator className="h-3.5 w-3.5 mr-1.5" />
              Recalculate Total
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Product</th>
                  <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Price</th>
                  <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Est. Wt.</th>
                  <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider w-[140px]">Actual Wt.</th>
                  <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => {
                  const variant = item.variant;
                  const isCatchWeight = variant.weight_type === 'catch_weight';
                  const lineTotal = item.actual_line_total ?? item.estimated_line_total;

                  return (
                    <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{variant.product.name}</span>
                        {variant.name !== 'Standard' && (
                          <span className="text-muted-foreground"> - {variant.name}</span>
                        )}
                        {isCatchWeight && (
                          <Badge variant="outline" className="text-[10px] ml-2">
                            <Scale className="h-2.5 w-2.5 mr-0.5" /> catch wt.
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        ${Number(item.price_per_unit).toFixed(2)}/{item.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {item.estimated_weight_lb ? `${item.estimated_weight_lb} lb` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {isCatchWeight ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={weights[item.id] ?? ''}
                              onChange={(e) => setWeights((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              onBlur={() => {
                                if (weights[item.id] && parseFloat(weights[item.id]) > 0) {
                                  handleWeightSave(item.id);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleWeightSave(item.id);
                              }}
                              placeholder="0.00"
                              className="w-20 h-7 text-right text-xs"
                            />
                            <span className="text-xs text-muted-foreground">lb</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {item.actual_weight_lb ? `${item.actual_weight_lb} lb` : '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">
                        {lineTotal ? `$${Number(lineTotal).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="text-right space-y-1">
              {order.estimated_total && (
                <p className="text-sm text-muted-foreground">
                  Estimated: ${Number(order.estimated_total).toFixed(2)}
                </p>
              )}
              <p className="text-lg font-bold">
                {isEstimate && <span className="text-xs font-normal text-muted-foreground">~</span>}
                Total: ${displayTotal ? Number(displayTotal).toFixed(2) : '0.00'}
                {order.actual_total && (
                  <Badge variant="outline" className="text-[10px] ml-2 font-normal">Final</Badge>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
