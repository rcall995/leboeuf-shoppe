'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { addStop } from '@/app/actions/delivery-routes';
import { useRouter } from 'next/navigation';

interface EligibleOrder {
  id: string;
  order_number: string;
  status: string;
  customer_id: string;
  customer: { business_name: string };
}

interface AddStopFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  eligibleOrders: EligibleOrder[];
}

export function AddStopForm({ open, onOpenChange, routeId, eligibleOrders }: AddStopFormProps) {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedOrder = eligibleOrders.find((o) => o.id === orderId);

  async function handleSubmit() {
    if (!orderId || !selectedOrder) {
      toast.error('Select an order');
      return;
    }

    setSaving(true);
    try {
      const result = await addStop(routeId, {
        order_id: orderId,
        customer_id: selectedOrder.customer_id,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Stop added');
      onOpenChange(false);
      setOrderId('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Delivery Stop</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Order</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an order" />
              </SelectTrigger>
              <SelectContent>
                {eligibleOrders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.order_number} — {o.customer.business_name} ({o.status.replace('_', ' ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eligibleOrders.length === 0 && (
              <p className="text-xs text-muted-foreground">No eligible orders (need packed or out for delivery status)</p>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={saving || !orderId} className="w-full">
            {saving ? 'Adding...' : 'Add Stop'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
