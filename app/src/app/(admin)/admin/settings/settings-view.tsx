'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { updateTenantSettings } from '@/app/actions/settings';

interface TenantData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  settings: {
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    tagline?: string;
    order_notification_email?: string;
  };
}

interface SettingsViewProps {
  tenant: TenantData;
  profileName: string;
  profileEmail: string;
}

export function SettingsView({ tenant, profileName, profileEmail }: SettingsViewProps) {
  const [name, setName] = useState(tenant.name);
  const [domain, setDomain] = useState(tenant.domain ?? '');
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url ?? '');
  const [contactEmail, setContactEmail] = useState(tenant.settings?.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState(tenant.settings?.contact_phone ?? '');
  const [address, setAddress] = useState(tenant.settings?.address ?? '');
  const [tagline, setTagline] = useState(tenant.settings?.tagline ?? '');
  const [orderNotificationEmail, setOrderNotificationEmail] = useState(tenant.settings?.order_notification_email ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Business name is required');
      return;
    }

    setSaving(true);
    try {
      const result = await updateTenantSettings({
        name: name.trim(),
        domain: domain.trim() || null,
        logo_url: logoUrl.trim() || null,
        settings: {
          contact_email: contactEmail.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          address: address.trim() || undefined,
          tagline: tagline.trim() || undefined,
          order_notification_email: orderNotificationEmail.trim() || undefined,
        },
      });

      if (result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Validation failed');
        return;
      }
      toast.success('Settings saved');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your business configuration</p>
      </div>

      {/* Business Information */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">Business Name</Label>
              <Input
                id="s-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-domain">Domain</Label>
              <Input
                id="s-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. leboeuf shoppe.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-tagline">Tagline</Label>
            <Input
              id="s-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Never Frozen. Always Fresh. Always Wagyu."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-logo">Logo URL</Label>
            <Input
              id="s-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-email">Contact Email</Label>
              <Input
                id="s-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="info@leboeuf shoppe.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-phone">Contact Phone</Label>
              <Input
                id="s-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(716) 555-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-address">Address</Label>
            <Input
              id="s-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Buffalo, NY 14201"
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-notify-email">Order Notification Email</Label>
            <Input
              id="s-notify-email"
              type="email"
              value={orderNotificationEmail}
              onChange={(e) => setOrderNotificationEmail(e.target.value)}
              placeholder="joe@leboeuf shoppe.com"
            />
            <p className="text-xs text-muted-foreground">
              Receive an email every time a customer places an order. Leave blank to disable.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Current User */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="font-medium">{profileName}</p>
              <p className="text-muted-foreground">{profileEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
