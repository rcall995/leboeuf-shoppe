'use client';

import { useCart } from '@/lib/cart-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag, Scale, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { placeOrder } from '@/app/actions/place-order';
import { toast } from 'sonner';
import Link from 'next/link';

export function CartView() {
  const { items, updateItem, removeItem, clearCart, estimatedTotal } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const router = useRouter();

  const hasCatchWeight = items.some((i) => i.weight_type === 'catch_weight');

  async function handlePlaceOrder() {
    if (items.length === 0) return;
    setSubmitting(true);

    try {
      const result = await placeOrder({
        items: items.map((item) => ({
          variant_id: item.variant_id,
          quantity_lbs: item.quantity_lbs,
          price_per_unit: item.price_per_unit,
          unit: item.unit,
          weight_type: item.weight_type,
        })),
        notes: notes || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }

      clearCart();
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success(`Order ${result.order_number} placed!`);
      }
      router.push('/order/history');
    } catch {
      toast.error('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Cart</h2>
        <div className="text-center py-12">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Your cart is empty</p>
          <p className="text-muted-foreground/60 text-xs mt-1 mb-4">Browse the catalog to add items</p>
          <Link href="/order/catalog">
            <Button variant="outline">Browse Catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Cart</h2>
        <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const lineEst = item.quantity_lbs * item.price_per_unit;

          return (
            <Card key={item.variant_id} className="shadow-sm">
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.variant_name !== 'Standard' && (
                        <Badge variant="secondary" className="text-xs">{item.variant_name}</Badge>
                      )}
                      {item.sku && (
                        <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm font-semibold">
                        ${Number(item.price_per_unit).toFixed(2)}/{item.unit}
                      </span>
                      {item.weight_type === 'catch_weight' && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Scale className="h-3 w-3" />
                          catch weight
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm font-bold">${lineEst.toFixed(2)}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5 border rounded-md px-2.5 h-8 focus-within:ring-1 focus-within:ring-ring">
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={item.quantity_lbs}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) {
                              updateItem(item.variant_id, val);
                            }
                          }}
                          className="w-16 text-sm bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-xs text-muted-foreground font-medium">lbs</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.variant_id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes */}
      <Card className="shadow-sm">
        <CardContent className="py-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Order Notes
          </label>
          <textarea
            className="w-full mt-1.5 text-sm bg-transparent border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            placeholder="Special instructions, delivery preferences..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estimated Total</span>
            <span className="text-xl font-bold">${estimatedTotal.toFixed(2)}</span>
          </div>

          {hasCatchWeight && (
            <div className="flex items-start gap-2 mt-3 p-2.5 bg-accent rounded-lg">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                This order contains catch-weight items. Final price will be based on actual weight at fulfillment.
              </p>
            </div>
          )}

          <Separator className="my-4" />

          <Button
            className="w-full"
            size="lg"
            disabled={submitting}
            onClick={handlePlaceOrder}
          >
            {submitting ? 'Placing Order...' : 'Place Order'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
