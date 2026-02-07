'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { upsertPricing, removePricing, copyPricingFromCustomer } from '@/app/actions/pricing';

interface Variant {
  id: string;
  name: string;
  sku: string | null;
  default_price_per_unit: number;
  unit: string;
  weight_type: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  variants: Variant[];
}

interface PricingGridProps {
  customerId: string;
  products: Product[];
  pricingMap: Record<string, number>;
  otherCustomers: Array<{ id: string; business_name: string }>;
}

export function PricingGrid({ customerId, products, pricingMap, otherCustomers }: PricingGridProps) {
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [variantId, price] of Object.entries(pricingMap)) {
      initial[variantId] = price.toFixed(2);
    }
    return initial;
  });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [copySource, setCopySource] = useState('');
  const [isPending, startTransition] = useTransition();

  function handlePriceChange(variantId: string, value: string) {
    setPrices((prev) => ({ ...prev, [variantId]: value }));
  }

  function handleSavePrice(variantId: string) {
    const value = parseFloat(prices[variantId]);
    if (isNaN(value) || value <= 0) {
      toast.error('Enter a valid price');
      return;
    }

    startTransition(async () => {
      const result = await upsertPricing(customerId, variantId, value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSavedIds((prev) => new Set(prev).add(variantId));
      setTimeout(() => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(variantId);
          return next;
        });
      }, 1500);
    });
  }

  function handleRemovePrice(variantId: string) {
    startTransition(async () => {
      const result = await removePricing(customerId, variantId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPrices((prev) => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
      toast.success('Pricing removed');
    });
  }

  function handleCopyPricing() {
    if (!copySource) return;
    startTransition(async () => {
      const result = await copyPricingFromCustomer(customerId, copySource);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Copied ${result.count} price${result.count !== 1 ? 's' : ''}`);
      setCopySource('');
      // Page will revalidate and re-render with new data
    });
  }

  const assignedCount = Object.keys(pricingMap).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {assignedCount} variant{assignedCount !== 1 ? 's' : ''} assigned.
          Enter a price to assign, clear to unassign.
        </p>

        {otherCustomers.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={copySource} onValueChange={setCopySource}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Copy pricing from..." />
              </SelectTrigger>
              <SelectContent>
                {otherCustomers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleCopyPricing} disabled={!copySource || isPending}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
          </div>
        )}
      </div>

      {products.map((product) => {
        const activeVariants = product.variants.filter((v) => v.is_active);
        if (activeVariants.length === 0) return null;

        return (
          <div key={product.id}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {product.name}
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Variant</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">SKU</th>
                    <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Type</th>
                    <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Default</th>
                    <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider w-[180px]">Customer Price</th>
                    <th className="w-[70px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {activeVariants.map((variant) => {
                    const hasPrice = prices[variant.id] !== undefined && prices[variant.id] !== '';
                    const isSaved = savedIds.has(variant.id);

                    return (
                      <tr key={variant.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-medium">{variant.name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">
                          {variant.sku ?? '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-xs font-normal">
                            {variant.weight_type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">
                          ${Number(variant.default_price_per_unit).toFixed(2)}/{variant.unit}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-muted-foreground text-xs">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={prices[variant.id] ?? ''}
                              onChange={(e) => handlePriceChange(variant.id, e.target.value)}
                              onBlur={() => {
                                if (prices[variant.id] && parseFloat(prices[variant.id]) > 0) {
                                  handleSavePrice(variant.id);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePrice(variant.id);
                              }}
                              placeholder="—"
                              className="w-24 h-8 text-right text-sm"
                            />
                            <span className="text-muted-foreground text-xs">/{variant.unit}</span>
                            {isSaved && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {hasPrice && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemovePrice(variant.id)}
                              disabled={isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {products.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">
          No active products. Create products first before setting pricing.
        </p>
      )}
    </div>
  );
}
