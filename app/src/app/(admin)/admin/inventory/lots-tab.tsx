'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Package } from 'lucide-react';
import { toast } from 'sonner';
import { updateLotStatus } from '@/app/actions/inventory';
import { LotForm } from './lot-form';

interface Lot {
  id: string;
  lot_number: string;
  status: string;
  product_id: string;
  variant_id: string | null;
  supplier_id: string | null;
  initial_weight_lb: number;
  current_weight_lb: number;
  cost_per_lb: number | null;
  kill_date: string | null;
  received_date: string;
  aging_start_date: string | null;
  best_by_date: string | null;
  notes: string | null;
  product: { name: string };
  variant: { name: string } | null;
  supplier: { name: string } | null;
}

interface Product {
  id: string;
  name: string;
  variants: { id: string; name: string }[];
}

interface Supplier {
  id: string;
  name: string;
}

interface LotsTabProps {
  lots: Lot[];
  products: Product[];
  suppliers: Supplier[];
}

const STATUS_COLORS: Record<string, string> = {
  receiving: 'bg-blue-100 text-blue-800',
  aging: 'bg-purple-100 text-purple-800',
  available: 'bg-emerald-100 text-emerald-800',
  allocated: 'bg-amber-100 text-amber-800',
  depleted: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-800',
  waste: 'bg-red-100 text-red-800',
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'receiving', label: 'Receiving' },
  { key: 'aging', label: 'Aging' },
  { key: 'available', label: 'Available' },
  { key: 'depleted', label: 'Depleted' },
  { key: 'expired', label: 'Expired' },
];

const LOT_STATUS_FLOW: Record<string, string[]> = {
  receiving: ['aging', 'available'],
  aging: ['available', 'expired', 'waste'],
  available: ['allocated', 'depleted', 'expired', 'waste'],
  allocated: ['available', 'depleted'],
  depleted: [],
  expired: ['waste'],
  waste: [],
};

function daysAging(agingStartDate: string | null): number | null {
  if (!agingStartDate) return null;
  const start = new Date(agingStartDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function bestByClass(bestByDate: string | null): string {
  if (!bestByDate) return '';
  const days = Math.floor((new Date(bestByDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'text-red-600 font-semibold';
  if (days <= 3) return 'text-red-600';
  if (days <= 7) return 'text-amber-600';
  return 'text-emerald-600';
}

export function LotsTab({ lots, products, suppliers }: LotsTabProps) {
  const [filter, setFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = filter === 'all' ? lots : lots.filter((l) => l.status === filter);
  const statusCounts: Record<string, number> = {};
  for (const lot of lots) {
    statusCounts[lot.status] = (statusCounts[lot.status] ?? 0) + 1;
  }

  function handleEdit(lot: Lot) {
    setEditingLot(lot);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingLot(null);
  }

  function handleStatusChange(lotId: string, newStatus: string) {
    startTransition(async () => {
      const result = await updateLotStatus(lotId, newStatus);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Lot status updated to ${newStatus}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const count = tab.key === 'all' ? lots.length : (statusCounts[tab.key] ?? 0);
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
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
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Receive Lot
        </Button>
      </div>

      {filtered.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Lot #</th>
                <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Product</th>
                <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Weight (lb)</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Aging</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Best By</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lot) => {
                const aging = daysAging(lot.aging_start_date);
                const nextStatuses = LOT_STATUS_FLOW[lot.status] ?? [];

                return (
                  <tr key={lot.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{lot.lot_number}</td>
                    <td className="px-3 py-2.5">
                      <span>{lot.product.name}</span>
                      {lot.variant && (
                        <span className="text-muted-foreground"> - {lot.variant.name}</span>
                      )}
                      {lot.supplier && (
                        <p className="text-xs text-muted-foreground">{lot.supplier.name}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-xs ${STATUS_COLORS[lot.status] ?? ''}`}>
                        {lot.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-medium">{Number(lot.current_weight_lb).toFixed(1)}</span>
                      {lot.current_weight_lb !== lot.initial_weight_lb && (
                        <span className="text-xs text-muted-foreground"> / {Number(lot.initial_weight_lb).toFixed(1)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      {aging !== null ? `${aging}d` : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-xs ${bestByClass(lot.best_by_date)}`}>
                      {lot.best_by_date
                        ? new Date(lot.best_by_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEdit(lot)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {nextStatuses.length > 0 && nextStatuses.length <= 2 && (
                          nextStatuses.filter(s => s !== 'waste' && s !== 'expired').slice(0, 1).map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={isPending}
                              onClick={() => handleStatusChange(lot.id, s)}
                            >
                              {s}
                            </Button>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {filter === 'all' ? 'No inventory lots yet' : `No ${filter} lots`}
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Click &quot;Receive Lot&quot; to record an incoming shipment.
          </p>
        </div>
      )}

      <LotForm
        open={formOpen}
        onOpenChange={handleFormClose}
        lot={editingLot}
        products={products}
        suppliers={suppliers}
      />
    </div>
  );
}
