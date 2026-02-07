'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createRoute, updateRoute } from '@/app/actions/delivery-routes';
import { useRouter } from 'next/navigation';

interface StaffMember {
  id: string;
  full_name: string;
}

interface RouteData {
  id: string;
  name: string;
  route_date: string;
  driver_id: string | null;
}

interface RouteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route?: RouteData | null;
  staff: StaffMember[];
}

export function RouteForm({ open, onOpenChange, route, staff }: RouteFormProps) {
  const router = useRouter();
  const isEdit = !!route;

  const [name, setName] = useState(route?.name ?? '');
  const [routeDate, setRouteDate] = useState(route?.route_date ?? new Date().toISOString().split('T')[0]);
  const [driverId, setDriverId] = useState(route?.driver_id ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error('Route name is required');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const result = await updateRoute(route.id, {
          name: name.trim(),
          route_date: routeDate,
          driver_id: driverId || null,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Route updated');
      } else {
        const result = await createRoute({
          name: name.trim(),
          route_date: routeDate,
          driver_id: driverId || null,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Route created');
      }
      onOpenChange(false);
      setName('');
      setRouteDate(new Date().toISOString().split('T')[0]);
      setDriverId('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Route' : 'New Delivery Route'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="r-name">Route Name</Label>
            <Input
              id="r-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Downtown AM Run"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-date">Date</Label>
            <Input
              id="r-date"
              type="date"
              value={routeDate}
              onChange={(e) => setRouteDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Driver (optional)</Label>
            <Select value={driverId} onValueChange={setDriverId}>
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

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? 'Saving...' : isEdit ? 'Update Route' : 'Create Route'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
