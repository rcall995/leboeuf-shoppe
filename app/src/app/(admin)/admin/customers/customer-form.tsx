'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createCustomer, updateCustomer } from '@/app/actions/customers';

interface CustomerData {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  delivery_instructions: string | null;
  payment_terms: string;
  tax_exempt: boolean;
  is_active: boolean;
}

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerData | null;
}

export function CustomerForm({ open, onOpenChange, customer }: CustomerFormProps) {
  const isEdit = !!customer;

  const [form, setForm] = useState({
    business_name: customer?.business_name ?? '',
    contact_name: customer?.contact_name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    address_line1: customer?.address_line1 ?? '',
    address_line2: customer?.address_line2 ?? '',
    city: customer?.city ?? '',
    state: customer?.state ?? '',
    zip: customer?.zip ?? '',
    delivery_instructions: customer?.delivery_instructions ?? '',
    payment_terms: customer?.payment_terms ?? 'net_30',
    tax_exempt: customer?.tax_exempt ?? false,
    is_active: customer?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({
      business_name: '',
      contact_name: '',
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: '',
      delivery_instructions: '',
      payment_terms: 'net_30',
      tax_exempt: false,
      is_active: true,
    });
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetForm();
    onOpenChange(open);
  }

  async function handleSave() {
    if (!form.business_name.trim()) {
      toast.error('Business name is required');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const result = await updateCustomer(customer.id, form);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Customer updated');
      } else {
        const result = await createCustomer(form);
        if (result.error) {
          toast.error(typeof result.error === 'string' ? result.error : 'Validation failed');
          return;
        }
        toast.success('Customer created');
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
          <SheetTitle>{isEdit ? 'Edit Customer' : 'New Customer'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name *</Label>
            <Input
              id="business-name"
              value={form.business_name}
              onChange={(e) => updateField('business_name', e.target.value)}
              placeholder="e.g. The Black Angus Steakhouse"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Contact Name</Label>
              <Input
                id="contact-name"
                value={form.contact_name}
                onChange={(e) => updateField('contact_name', e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(716) 555-1234"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="orders@restaurant.com"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="address1">Address Line 1</Label>
            <Input
              id="address1"
              value={form.address_line1}
              onChange={(e) => updateField('address_line1', e.target.value)}
              placeholder="123 Main St"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Address Line 2</Label>
            <Input
              id="address2"
              value={form.address_line2}
              onChange={(e) => updateField('address_line2', e.target.value)}
              placeholder="Suite 100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Buffalo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                placeholder="NY"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                value={form.zip}
                onChange={(e) => updateField('zip', e.target.value)}
                placeholder="14201"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-instructions">Delivery Instructions</Label>
            <Textarea
              id="delivery-instructions"
              value={form.delivery_instructions}
              onChange={(e) => updateField('delivery_instructions', e.target.value)}
              placeholder="Use back entrance, ask for manager..."
              rows={2}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Select value={form.payment_terms} onValueChange={(v) => updateField('payment_terms', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="net_30">Net 30</SelectItem>
                <SelectItem value="net_15">Net 15</SelectItem>
                <SelectItem value="net_7">Net 7</SelectItem>
                <SelectItem value="cod">COD</SelectItem>
                <SelectItem value="prepaid">Prepaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="tax-exempt">Tax Exempt</Label>
            <Switch
              id="tax-exempt"
              checked={form.tax_exempt}
              onCheckedChange={(v) => updateField('tax_exempt', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="customer-active">Active</Label>
            <Switch
              id="customer-active"
              checked={form.is_active}
              onCheckedChange={(v) => updateField('is_active', v)}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
