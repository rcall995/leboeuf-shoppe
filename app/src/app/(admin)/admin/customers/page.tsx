import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CustomersList } from './customers-list';

export default async function CustomersPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      *,
      pricing:customer_pricing(
        id,
        price_per_unit,
        variant:product_variants(
          name,
          sku,
          product:products(name)
        )
      )
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('business_name');

  type CustomerRow = {
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
    pricing: Array<{
      id: string;
      price_per_unit: number;
      variant: {
        name: string;
        sku: string | null;
        product: { name: string };
      };
    }>;
  };

  return (
    <CustomersList
      customers={(customers ?? []) as unknown as CustomerRow[]}
    />
  );
}
