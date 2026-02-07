'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/lib/cart-context';
import { Plus, Check, Scale, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface PricingRow {
  id: string;
  price_per_unit: number;
  variant: {
    id: string;
    name: string;
    sku: string | null;
    weight_type: string;
    default_price_per_unit: number;
    unit: string;
    estimated_weight_lb: number | null;
    min_weight_lb: number | null;
    max_weight_lb: number | null;
    product: {
      id: string;
      name: string;
      description: string | null;
      image_url: string | null;
      category: { id: string; name: string } | null;
    };
  };
}

interface CatalogViewProps {
  categories: {
    id: string;
    name: string;
    items: PricingRow[];
  }[];
}

export function CatalogView({ categories }: CatalogViewProps) {
  const { addItem, items: cartItems } = useCart();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [lbsInputs, setLbsInputs] = useState<Record<string, string>>({});

  function handleAdd(row: PricingRow) {
    const v = row.variant;
    const inputVal = lbsInputs[v.id];
    const lbs = parseFloat(inputVal);

    if (!inputVal || isNaN(lbs) || lbs <= 0) {
      toast.error('Enter weight in lbs');
      return;
    }

    addItem({
      variant_id: v.id,
      product_name: v.product.name,
      variant_name: v.name,
      sku: v.sku,
      quantity_lbs: lbs,
      price_per_unit: row.price_per_unit,
      unit: v.unit,
      weight_type: v.weight_type,
      estimated_weight_per_piece: v.estimated_weight_lb,
    });

    // Clear the input after adding
    setLbsInputs((prev) => ({ ...prev, [v.id]: '' }));

    setAddedIds((prev) => new Set(prev).add(v.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(v.id);
        return next;
      });
    }, 1500);

    toast.success(`Added ${lbs} lbs of ${v.product.name}`);
  }

  const getCartLbs = (variantId: string) =>
    cartItems.find((i) => i.variant_id === variantId)?.quantity_lbs ?? 0;

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Catalog</h2>
        <p className="text-sm text-muted-foreground">{totalItems} products at your pricing</p>
      </div>

      {categories.map((category) => (
        <div key={category.id} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {category.name}
          </h3>

          {category.items.map((row) => {
            const v = row.variant;
            const inCartLbs = getCartLbs(v.id);
            const justAdded = addedIds.has(v.id);
            const inputVal = lbsInputs[v.id] ?? '';

            return (
              <Card key={row.id} className="shadow-sm">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{v.product.name}</p>
                        {v.name !== 'Standard' && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {v.name}
                          </Badge>
                        )}
                      </div>

                      {v.product.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {v.product.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-base font-bold text-primary">
                          ${Number(row.price_per_unit).toFixed(2)}
                          <span className="text-xs font-normal text-muted-foreground">/{v.unit}</span>
                        </span>

                        {v.weight_type === 'catch_weight' && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Scale className="h-3 w-3" />
                            catch weight
                          </span>
                        )}
                      </div>

                      {v.weight_type === 'catch_weight' && (
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          Final price based on actual weight at fulfillment
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1.5 border rounded-md px-2.5 h-9 focus-within:ring-1 focus-within:ring-ring">
                          <input
                            type="number"
                            min="0.1"
                            step="0.5"
                            placeholder="0"
                            value={inputVal}
                            onChange={(e) =>
                              setLbsInputs((prev) => ({ ...prev, [v.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAdd(row);
                            }}
                            className="w-16 text-sm bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-muted-foreground font-medium">lbs</span>
                        </div>
                        <Button
                          size="sm"
                          variant={justAdded ? 'default' : 'outline'}
                          className="h-9 w-9 p-0"
                          onClick={() => handleAdd(row)}
                        >
                          {justAdded ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {inCartLbs > 0 && (
                        <span className="text-xs font-medium text-primary flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          {inCartLbs} lbs
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">No products assigned to your account yet.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Contact Le Boeuf Shoppe to get set up with your product catalog.</p>
        </div>
      )}
    </div>
  );
}
