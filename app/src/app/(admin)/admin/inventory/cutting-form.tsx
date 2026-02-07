'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createCuttingSession } from '@/app/actions/cutting';

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

interface OutputItem {
  variant_id: string;
  quantity: string;
  weight_lb: string;
}

interface CuttingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lots: LotOption[];
  variants: VariantOption[];
}

export function CuttingForm({ open, onOpenChange, lots, variants }: CuttingFormProps) {
  const [sourceLotId, setSourceLotId] = useState('');
  const [inputWeight, setInputWeight] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OutputItem[]>([{ variant_id: '', quantity: '1', weight_lb: '' }]);
  const [saving, setSaving] = useState(false);

  const selectedLot = lots.find((l) => l.id === sourceLotId);
  const totalOutput = items.reduce((sum, item) => sum + (parseFloat(item.weight_lb) || 0), 0);
  const inputVal = parseFloat(inputWeight) || 0;
  const waste = inputVal > 0 ? Math.max(0, inputVal - totalOutput) : 0;
  const yieldPct = inputVal > 0 ? ((totalOutput / inputVal) * 100).toFixed(1) : '—';

  function resetForm() {
    setSourceLotId('');
    setInputWeight('');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([{ variant_id: '', quantity: '1', weight_lb: '' }]);
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    onOpenChange(val);
  }

  function addItem() {
    setItems([...items, { variant_id: '', quantity: '1', weight_lb: '' }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof OutputItem, value: string) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  }

  async function handleSave() {
    if (!sourceLotId) {
      toast.error('Select a source lot');
      return;
    }
    if (!inputWeight || parseFloat(inputWeight) <= 0) {
      toast.error('Enter input weight');
      return;
    }
    const validItems = items.filter((item) => item.variant_id && parseFloat(item.weight_lb) > 0);
    if (validItems.length === 0) {
      toast.error('Add at least one output item');
      return;
    }

    setSaving(true);
    try {
      const result = await createCuttingSession({
        source_lot_id: sourceLotId,
        input_weight_lb: parseFloat(inputWeight),
        session_date: sessionDate,
        notes: notes.trim() || null,
        items: validItems.map((item) => ({
          variant_id: item.variant_id,
          quantity: parseInt(item.quantity) || 1,
          weight_lb: parseFloat(item.weight_lb),
        })),
      });

      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Validation failed');
        return;
      }

      toast.success(`Cutting session recorded — ${result.yield_percentage}% yield`);
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Cutting Session</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Source Lot */}
          <div className="space-y-2">
            <Label>Source Lot</Label>
            <Select value={sourceLotId} onValueChange={(v) => {
              setSourceLotId(v);
              const lot = lots.find(l => l.id === v);
              if (lot) setInputWeight(String(lot.current_weight_lb));
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lot" />
              </SelectTrigger>
              <SelectContent>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.lot_number} — {lot.product.name} ({Number(lot.current_weight_lb).toFixed(1)} lb)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input weight & date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cut-input">Input Weight (lb)</Label>
              <Input
                id="cut-input"
                type="number"
                step="0.01"
                min="0"
                max={selectedLot ? Number(selectedLot.current_weight_lb) : undefined}
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                placeholder="0.00"
              />
              {selectedLot && (
                <p className="text-xs text-muted-foreground">
                  Max: {Number(selectedLot.current_weight_lb).toFixed(1)} lb
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cut-date">Session Date</Label>
              <Input
                id="cut-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Output items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Output Items</Label>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Select value={item.variant_id} onValueChange={(v) => updateItem(idx, 'variant_id', v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.product.name} — {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.weight_lb}
                      onChange={(e) => updateItem(idx, 'weight_lb', e.target.value)}
                      placeholder="Weight (lb)"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Yield summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Output</span>
              <span className="font-medium">{totalOutput.toFixed(2)} lb</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Waste</span>
              <span className="font-medium">{waste.toFixed(2)} lb</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Yield</span>
              <span className="font-semibold">{yieldPct}%</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="cut-notes">Notes</Label>
            <Textarea
              id="cut-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Record Session'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
