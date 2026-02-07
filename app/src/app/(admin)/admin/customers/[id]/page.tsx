import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import { PricingGrid } from './pricing-grid';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  // Fetch customer
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!customer) notFound();

  // Fetch existing pricing for this customer
  const { data: pricing } = await supabase
    .from('customer_pricing')
    .select('id, variant_id, price_per_unit')
    .eq('customer_id', id)
    .eq('tenant_id', profile.tenant_id);

  // Fetch all active variants (grouped by product)
  const { data: products } = await supabase
    .from('products')
    .select(`
      id, name,
      variants:product_variants(id, name, sku, default_price_per_unit, unit, weight_type, is_active)
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .order('sort_order');

  // Fetch other customers for "copy pricing" feature
  const { data: otherCustomers } = await supabase
    .from('customers')
    .select('id, business_name')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .neq('id', id)
    .order('business_name');

  // Build pricing lookup: variant_id → price_per_unit
  const pricingMap: Record<string, number> = {};
  for (const p of pricing ?? []) {
    pricingMap[p.variant_id] = Number(p.price_per_unit);
  }

  type ProductWithVariants = {
    id: string;
    name: string;
    variants: Array<{
      id: string;
      name: string;
      sku: string | null;
      default_price_per_unit: number;
      unit: string;
      weight_type: string;
      is_active: boolean;
    }>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/customers">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{customer.business_name}</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            {customer.contact_name && <span>{customer.contact_name}</span>}
            <Badge variant="outline" className="font-normal">
              {customer.payment_terms?.replace('_', ' ')}
            </Badge>
            <Badge variant={customer.is_active ? 'default' : 'secondary'}>
              {customer.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <Card className="shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {customer.phone && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {customer.email}
              </span>
            )}
            {customer.address_line1 && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {customer.address_line1}, {customer.city}, {customer.state} {customer.zip}
              </span>
            )}
          </div>
          {customer.delivery_instructions && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Delivery: {customer.delivery_instructions}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pricing Grid */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Product Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingGrid
            customerId={id}
            products={(products ?? []) as unknown as ProductWithVariants[]}
            pricingMap={pricingMap}
            otherCustomers={otherCustomers ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
