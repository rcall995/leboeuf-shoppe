'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Scissors } from 'lucide-react';
import { CuttingForm } from './cutting-form';

interface CuttingSession {
  id: string;
  session_date: string;
  input_weight_lb: number;
  total_output_weight_lb: number | null;
  waste_weight_lb: number | null;
  yield_percentage: number | null;
  notes: string | null;
  source_lot: { lot_number: string; product: { name: string } };
  performed_by_profile: { full_name: string } | null;
  items: {
    id: string;
    quantity: number;
    weight_lb: number;
    variant: { name: string; product: { name: string } };
  }[];
}

interface LotOption {
  id: string;
  lot_number: string;
  current_weight_lb: number;
  product: { name: string };
}

interface VariantOption {
  id: string;
  name: string;
  product: { name: string };
}

interface CuttingTabProps {
  sessions: CuttingSession[];
  lots: LotOption[];
  variants: VariantOption[];
}

function yieldColor(pct: number | null): string {
  if (pct === null) return '';
  if (pct >= 85) return 'bg-emerald-100 text-emerald-800';
  if (pct >= 70) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

export function CuttingTab({ sessions, lots, variants }: CuttingTabProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Session
        </Button>
      </div>

      {sessions.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Source Lot</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Input (lb)</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Output (lb)</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Waste (lb)</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Yield</th>
                <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Output Items</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {new Date(session.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{session.source_lot.lot_number}</span>
                    <p className="text-xs text-muted-foreground">{session.source_lot.product.name}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    {Number(session.input_weight_lb).toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {session.total_output_weight_lb != null ? Number(session.total_output_weight_lb).toFixed(1) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">
                    {session.waste_weight_lb != null ? Number(session.waste_weight_lb).toFixed(1) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {session.yield_percentage != null ? (
                      <Badge className={`text-xs ${yieldColor(session.yield_percentage)}`}>
                        {Number(session.yield_percentage).toFixed(1)}%
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="space-y-0.5">
                      {session.items.map((item) => (
                        <p key={item.id} className="text-xs text-muted-foreground">
                          {item.quantity}x {item.variant.product.name} — {item.variant.name} ({Number(item.weight_lb).toFixed(1)} lb)
                        </p>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <Scissors className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No cutting sessions yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Record a session to track primal-to-steak yield.
          </p>
        </div>
      )}

      <CuttingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        lots={lots}
        variants={variants}
      />
    </div>
  );
}
