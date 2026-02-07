import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { OrderDetail } from './order-detail';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, business_name, contact_name, phone, email, address_line1, city, state, zip),
      items:order_items(
        id,
        variant_id,
        quantity,
        unit,
        price_per_unit,
        estimated_weight_lb,
        actual_weight_lb,
        estimated_line_total,
        actual_line_total,
        variant:product_variants(
          id,
          name,
          sku,
          weight_type,
          product:products(name)
        )
      )
    `)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!order) notFound();

  type OrderData = {
    id: string;
    order_number: string;
    status: string;
    estimated_total: number | null;
    actual_total: number | null;
    notes: string | null;
    delivery_date: string | null;
    delivered_at: string | null;
    created_at: string;
    customer: {
      id: string;
      business_name: string;
      contact_name: string | null;
      phone: string | null;
      email: string | null;
      address_line1: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
    };
    items: Array<{
      id: string;
      variant_id: string;
      quantity: number;
      unit: string;
      price_per_unit: number;
      estimated_weight_lb: number | null;
      actual_weight_lb: number | null;
      estimated_line_total: number | null;
      actual_line_total: number | null;
      variant: {
        id: string;
        name: string;
        sku: string | null;
        weight_type: string;
        product: { name: string };
      };
    }>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{order.order_number}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      <OrderDetail order={order as unknown as OrderData} />
    </div>
  );
}
