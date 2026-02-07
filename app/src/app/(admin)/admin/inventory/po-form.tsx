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
import { createPO } from '@/app/actions/purchase-orders';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  variants: { id: string; name: string }[];
}

interface LineItem {
  product_id: string;
  variant_id: string;
  quantity: string;
  unit: string;
  cost_per_unit: string;
}

interface POFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  products: Product[];
}

export function POForm({ open, onOpenChange, suppliers, products }: POFormProps) {
  const [supplierId, setSupplierId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { product_id: '', variant_id: '', quantity: '', unit: 'lb', cost_per_unit: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const totalCost = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.cost_per_unit) || 0;
    return sum + qty * cost;
  }, 0);

  function resetForm() {
    setSupplierId('');
    setExpectedDelivery('');
    setNotes('');
    setItems([{ product_id: '', variant_id: '', quantity: '', unit: 'lb', cost_per_unit: '' }]);
  }

  function handleOpenChange(val: boolean) {
    if (!val) resetForm();
    onOpenChange(val);
  }

  function addItem() {
    setItems([...items, { product_id: '', variant_id: '', quantity: '', unit: 'lb', cost_per_unit: '' }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'product_id') updated[idx].variant_id = '';
    setItems(updated);
  }

  async function handleSave() {
    if (!supplierId) {
      toast.error('Select a supplier');
      return;
    }
    const validItems = items.filter(
      (item) => item.product_id && parseFloat(item.quantity) > 0 && parseFloat(item.cost_per_unit) > 0
    );
    if (validItems.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const result = await createPO({
        supplier_id: supplierId,
        expected_delivery: expectedDelivery || null,
        notes: notes.trim() || null,
        items: validItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          cost_per_unit: parseFloat(item.cost_per_unit),
        })),
      });

      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Validation failed');
        return;
      }

      toast.success(`Purchase order ${result.po_number} created`);
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Purchase Order</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
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

          {/* Expected Delivery */}
          <div className="space-y-2">
            <Label htmlFor="po-delivery">Expected Delivery</Label>
            <Input
              id="po-delivery"
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
            />
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Line Items</Label>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {items.map((item, idx) => {
              const selectedProduct = products.find((p) => p.id === item.product_id);
              const variants = selectedProduct?.variants ?? [];

              return (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                    {items.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Select value={item.product_id} onValueChange={(v) => updateItem(idx, 'product_id', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={item.variant_id}
                      onValueChange={(v) => updateItem(idx, 'variant_id', v)}
                      disabled={variants.length === 0}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={variants.length === 0 ? 'No variants' : 'Variant'} />
                      </SelectTrigger>
                      <SelectContent>
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="h-8 text-xs"
                    />
                    <Select value={item.unit} onValueChange={(v) => updateItem(idx, 'unit', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="each">each</SelectItem>
                        <SelectItem value="case">case</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.cost_per_unit}
                      onChange={(e) => updateItem(idx, 'cost_per_unit', e.target.value)}
                      placeholder="$/unit"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated Total</span>
            <span className="font-bold">${totalCost.toFixed(2)}</span>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="po-notes">Notes</Label>
            <Textarea
              id="po-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Create PO (Draft)'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
