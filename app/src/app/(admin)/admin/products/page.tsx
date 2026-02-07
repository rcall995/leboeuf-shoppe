import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProductsList } from './products-list';

export default async function ProductsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name),
      variants:product_variants(*)
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('sort_order');

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('tenant_id', profile.tenant_id)
    .order('sort_order');

  return (
    <ProductsList
      products={(products ?? []) as unknown as Array<{
        id: string;
        name: string;
        description: string | null;
        category_id: string | null;
        is_active: boolean;
        sort_order: number;
        category: { id: string; name: string } | null;
        variants: Array<{
          id: string;
          name: string;
          sku: string | null;
          weight_type: string;
          default_price_per_unit: number;
          unit: string;
          estimated_weight_lb: number | null;
          min_weight_lb: number | null;
          max_weight_lb: number | null;
          is_active: boolean;
        }>;
      }>}
      categories={categories ?? []}
    />
  );
}
