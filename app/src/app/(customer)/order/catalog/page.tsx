import { requireCustomer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CatalogView } from './catalog-view';
import { AnnouncementsBanner } from '@/components/announcements/announcements-banner';

export default async function CatalogPage() {
  const profile = await requireCustomer();
  const supabase = await createClient();

  // Get the customer record for this user
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', profile.id)
    .single();

  if (!customer) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Catalog</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your account is not linked to a customer profile yet. Please contact Le Boeuf Shoppe to get set up.
          </p>
        </div>
      </div>
    );
  }

  // Fetch assigned products with pricing for this customer
  const { data: pricing } = await supabase
    .from('customer_pricing')
    .select(`
      id,
      price_per_unit,
      variant:product_variants(
        id,
        name,
        sku,
        weight_type,
        default_price_per_unit,
        unit,
        estimated_weight_lb,
        min_weight_lb,
        max_weight_lb,
        product:products(
          id,
          name,
          description,
          image_url,
          category:categories(id, name)
        )
      )
    `)
    .eq('customer_id', customer.id)
    .order('price_per_unit');

  // Group by category
  type PricingRow = {
    id: string;
    price_per_unit: number;
    variant: {
      id: string;
      name: string;
      sku: string | null;
      weight_type: string;
      default_price_per_unit: number;
      unit: string;
      estimated_weight_lb: number | null;
      min_weight_lb: number | null;
      max_weight_lb: number | null;
      product: {
        id: string;
        name: string;
        description: string | null;
        image_url: string | null;
        category: { id: string; name: string } | null;
      };
    };
  };

  const rows = (pricing ?? []) as unknown as PricingRow[];

  const categories = new Map<string, { name: string; items: PricingRow[] }>();
  for (const row of rows) {
    const catId = row.variant.product.category?.id ?? 'uncategorized';
    const catName = row.variant.product.category?.name ?? 'Other';
    if (!categories.has(catId)) {
      categories.set(catId, { name: catName, items: [] });
    }
    categories.get(catId)!.items.push(row);
  }

  const grouped = Array.from(categories.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    items: data.items,
  }));

  // Fetch active announcements
  const now = new Date().toISOString();
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, body, published_at')
    .eq('tenant_id', profile.tenant_id)
    .not('published_at', 'is', null)
    .lte('published_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  // Fetch which ones the user has read
  const { data: reads } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('profile_id', profile.id);

  const readIds = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id));

  type AnnouncementRow = {
    id: string;
    title: string;
    body: string;
    published_at: string | null;
  };

  return (
    <>
      <AnnouncementsBanner
        announcements={(announcements ?? []) as unknown as AnnouncementRow[]}
        readIds={readIds}
      />
      <CatalogView categories={grouped} />
    </>
  );
}
