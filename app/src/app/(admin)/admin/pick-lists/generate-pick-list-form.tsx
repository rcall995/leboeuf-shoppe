'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generatePickList } from '@/app/actions/pick-lists';
import { useRouter } from 'next/navigation';

interface EligibleOrder {
  id: string;
  order_number: string;
  status: string;
  customer: { business_name: string };
}

interface StaffMember {
  id: string;
  full_name: string;
}

interface GeneratePickListFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibleOrders: EligibleOrder[];
  staff: StaffMember[];
}

export function GeneratePickListForm({ open, onOpenChange, eligibleOrders, staff }: GeneratePickListFormProps) {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!orderId) {
      toast.error('Select an order');
      return;
    }

    setSaving(true);
    try {
      const result = await generatePickList(orderId, assignedTo || null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Pick list generated');
      onOpenChange(false);
      setOrderId('');
      setAssignedTo('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Generate Pick List</SheetTitle>
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
                    {o.order_number} — {o.customer.business_name} ({o.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eligibleOrders.length === 0 && (
              <p className="text-xs text-muted-foreground">No confirmed or processing orders available</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Assign To (optional)</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={saving || !orderId} className="w-full">
            {saving ? 'Generating...' : 'Generate Pick List'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
