import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';

export default async function ProductsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(name),
      variants:product_variants(*)
    `)
    .order('sort_order');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground text-sm">{products?.length ?? 0} products, {products?.reduce((acc, p) => acc + ((p.variants as unknown[])?.length ?? 0), 0)} variants</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {products && products.length > 0 ? (
        <div className="space-y-4">
          {products.map((product) => {
            const variants = product.variants as Array<{
              id: string;
              name: string;
              sku: string | null;
              weight_type: string;
              default_price_per_unit: number;
              unit: string;
              estimated_weight_lb: number | null;
              is_active: boolean;
            }>;

            return (
              <Card key={product.id} className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand/10 text-brand">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {product.category && (
                            <Badge variant="secondary" className="text-xs">
                              {(product.category as { name: string }).name}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{variants?.length ?? 0} variant{variants?.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-2 pl-12">{product.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {variants && variants.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 text-muted-foreground">
                            <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Variant</th>
                            <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">SKU</th>
                            <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Type</th>
                            <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Price</th>
                            <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Est. Wt.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((variant) => (
                            <tr key={variant.id} className="border-t hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2.5 font-medium">{variant.name}</td>
                              <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{variant.sku ?? '—'}</td>
                              <td className="px-3 py-2.5">
                                <Badge variant="outline" className="text-xs font-normal">
                                  {variant.weight_type.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium">${Number(variant.default_price_per_unit).toFixed(2)}<span className="text-muted-foreground font-normal">/{variant.unit}</span></td>
                              <td className="px-3 py-2.5 text-right text-muted-foreground">
                                {variant.estimated_weight_lb ? `${variant.estimated_weight_lb} lb` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No variants configured.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No products yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Add your first product to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
