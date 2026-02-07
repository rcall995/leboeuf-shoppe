import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Users, MapPin } from 'lucide-react';

export default async function CustomersPage() {
  await requireAdmin();
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
    .order('business_name');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground text-sm">{customers?.length ?? 0} restaurant accounts</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {customers && customers.length > 0 ? (
        <div className="space-y-4">
          {customers.map((customer) => {
            const pricing = customer.pricing as Array<{
              id: string;
              price_per_unit: number;
              variant: {
                name: string;
                sku: string | null;
                product: { name: string };
              };
            }> | null;

            return (
              <Card key={customer.id} className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{customer.business_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {customer.contact_name} &middot; {customer.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="font-normal">{customer.payment_terms?.replace('_', ' ')}</Badge>
                      <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground pl-12">
                    <MapPin className="h-3.5 w-3.5" />
                    {customer.address_line1}, {customer.city}, {customer.state} {customer.zip}
                  </div>
                </CardHeader>
                <CardContent>
                  {pricing && pricing.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Assigned Products ({pricing.length})
                      </p>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 text-muted-foreground">
                              <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Product</th>
                              <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Variant</th>
                              <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">SKU</th>
                              <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Price/lb</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricing.map((p) => (
                              <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                                <td className="px-3 py-2.5 font-medium">{p.variant?.product?.name}</td>
                                <td className="px-3 py-2.5">{p.variant?.name}</td>
                                <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{p.variant?.sku ?? '—'}</td>
                                <td className="px-3 py-2.5 text-right font-medium">${Number(p.price_per_unit).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No products assigned yet.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No customers yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Add your first restaurant account to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
