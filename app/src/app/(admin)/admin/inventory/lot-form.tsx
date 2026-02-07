'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createLot, updateLot } from '@/app/actions/inventory';

interface Product {
  id: string;
  name: string;
  variants: { id: string; name: string }[];
}

interface Supplier {
  id: string;
  name: string;
}

interface LotData {
  id: string;
  lot_number: string;
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
  status: string;
}

interface LotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot?: LotData | null;
  products: Product[];
  suppliers: Supplier[];
}

export function LotForm({ open, onOpenChange, lot, products, suppliers }: LotFormProps) {
  const isEdit = !!lot;

  const [lotNumber, setLotNumber] = useState(lot?.lot_number ?? '');
  const [productId, setProductId] = useState(lot?.product_id ?? '');
  const [variantId, setVariantId] = useState(lot?.variant_id ?? '');
  const [supplierId, setSupplierId] = useState(lot?.supplier_id ?? '');
  const [initialWeight, setInitialWeight] = useState(lot ? String(lot.initial_weight_lb) : '');
  const [costPerLb, setCostPerLb] = useState(lot?.cost_per_lb ? String(lot.cost_per_lb) : '');
  const [killDate, setKillDate] = useState(lot?.kill_date ?? '');
  const [receivedDate, setReceivedDate] = useState(lot?.received_date ?? new Date().toISOString().split('T')[0]);
  const [agingStartDate, setAgingStartDate] = useState(lot?.aging_start_date ?? '');
  const [bestByDate, setBestByDate] = useState(lot?.best_by_date ?? '');
  const [notes, setNotes] = useState(lot?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);
  const variants = selectedProduct?.variants ?? [];

  function resetForm() {
    setLotNumber('');
    setProductId('');
    setVariantId('');
    setSupplierId('');
    setInitialWeight('');
    setCostPerLb('');
    setKillDate('');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setAgingStartDate('');
    setBestByDate('');
    setNotes('');
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    onOpenChange(val);
  }

  function generateLotNumber() {
    const ts = Date.now().toString(36).toUpperCase();
    setLotNumber(`LOT-${ts}`);
  }

  async function handleSave() {
    if (!lotNumber.trim()) {
      toast.error('Lot number is required');
      return;
    }
    if (!productId) {
      toast.error('Select a product');
      return;
    }
    if (!initialWeight || Number(initialWeight) <= 0) {
      toast.error('Weight must be positive');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const result = await updateLot(lot.id, {
          lot_number: lotNumber.trim(),
          product_id: productId,
          variant_id: variantId || null,
          supplier_id: supplierId || null,
          initial_weight_lb: Number(initialWeight),
          cost_per_lb: costPerLb ? Number(costPerLb) : null,
          kill_date: killDate || null,
          received_date: receivedDate,
          aging_start_date: agingStartDate || null,
          best_by_date: bestByDate || null,
          notes: notes.trim() || null,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Lot updated');
      } else {
        const result = await createLot({
          lot_number: lotNumber.trim(),
          product_id: productId,
          variant_id: variantId || null,
          supplier_id: supplierId || null,
          initial_weight_lb: Number(initialWeight),
          cost_per_lb: costPerLb ? Number(costPerLb) : null,
          kill_date: killDate || null,
          received_date: receivedDate,
          aging_start_date: agingStartDate || null,
          best_by_date: bestByDate || null,
          notes: notes.trim() || null,
        });
        if (result.error) {
          toast.error(typeof result.error === 'string' ? result.error : 'Validation failed');
          return;
        }
        toast.success('Lot created');
      }
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Lot' : 'Receive New Lot'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Lot Number */}
          <div className="space-y-2">
            <Label htmlFor="lot-number">Lot Number</Label>
            <div className="flex gap-2">
              <Input
                id="lot-number"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="LOT-XXXXX"
              />
              {!isEdit && (
                <Button type="button" variant="outline" size="sm" onClick={generateLotNumber}>
                  Auto
                </Button>
              )}
            </div>
          </div>

          {/* Product & Variant */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={(v) => { setProductId(v); setVariantId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Variant</Label>
              <Select value={variantId} onValueChange={setVariantId} disabled={!productId || variants.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={variants.length === 0 ? 'No variants' : 'Optional'} />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weights & Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lot-weight">Weight (lb)</Label>
              <Input
                id="lot-weight"
                type="number"
                step="0.01"
                min="0"
                value={initialWeight}
                onChange={(e) => setInitialWeight(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-cost">Cost per lb ($)</Label>
              <Input
                id="lot-cost"
                type="number"
                step="0.01"
                min="0"
                value={costPerLb}
                onChange={(e) => setCostPerLb(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lot-kill-date">Kill Date</Label>
              <Input
                id="lot-kill-date"
                type="date"
                value={killDate}
                onChange={(e) => setKillDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-received">Received Date</Label>
              <Input
                id="lot-received"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lot-aging">Aging Start</Label>
              <Input
                id="lot-aging"
                type="date"
                value={agingStartDate}
                onChange={(e) => setAgingStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-bestby">Best By</Label>
              <Input
                id="lot-bestby"
                type="date"
                value={bestByDate}
                onChange={(e) => setBestByDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="lot-notes">Notes</Label>
            <Textarea
              id="lot-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : isEdit ? 'Update Lot' : 'Receive Lot'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
