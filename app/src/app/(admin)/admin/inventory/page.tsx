import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Scale, AlertTriangle } from 'lucide-react';
import { LotsTab } from './lots-tab';
import { CuttingTab } from './cutting-tab';
import { PurchaseOrdersTab } from './purchase-orders-tab';

export default async function InventoryPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  // Fetch all data in parallel
  const [
    lotsRes,
    productsRes,
    suppliersRes,
    variantsRes,
    sessionsRes,
    posRes,
  ] = await Promise.all([
    // Lots with product, variant, supplier joins
    supabase
      .from('inventory_lots')
      .select(`
        *,
        product:products(name),
        variant:product_variants(name),
        supplier:suppliers(name)
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false }),

    // Products with variants (for forms)
    supabase
      .from('products')
      .select('id, name, variants:product_variants(id, name)')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('name'),

    // Suppliers (for forms)
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('name'),

    // All active variants (for cutting form)
    supabase
      .from('product_variants')
      .select('id, name, product:products(name)')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('name'),

    // Cutting sessions with source lot, items
    supabase
      .from('cutting_sessions')
      .select(`
        *,
        source_lot:inventory_lots(lot_number, product:products(name)),
        performed_by_profile:profiles(full_name),
        items:cutting_session_items(
          id, quantity, weight_lb,
          variant:product_variants(name, product:products(name))
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('session_date', { ascending: false }),

    // Purchase orders with supplier, items
    supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(name),
        items:purchase_order_items(
          id, quantity, unit, cost_per_unit, received_quantity,
          product:products(name),
          variant:product_variants(name)
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false }),
  ]);

  type LotRow = {
    id: string;
    lot_number: string;
    status: string;
    product_id: string;
    variant_id: string | null;
    supplier_id: string | null;
    initial_weight_lb: number;
    current_weight_lb: number;
    cost_per_lb: number | null;
    kill_date: string | null;
    received_date: string;
    aging_start_date: string | null;
    best_by_date: string | null;
    notes: string | null;
    product: { name: string };
    variant: { name: string } | null;
    supplier: { name: string } | null;
  };

  type ProductRow = {
    id: string;
    name: string;
    variants: { id: string; name: string }[];
  };

  type VariantRow = {
    id: string;
    name: string;
    product: { name: string };
  };

  type SessionRow = {
    id: string;
    session_date: string;
    input_weight_lb: number;
    total_output_weight_lb: number | null;
    waste_weight_lb: number | null;
    yield_percentage: number | null;
    notes: string | null;
    source_lot: { lot_number: string; product: { name: string } };
    performed_by_profile: { full_name: string } | null;
    items: {
      id: string;
      quantity: number;
      weight_lb: number;
      variant: { name: string; product: { name: string } };
    }[];
  };

  type PORow = {
    id: string;
    po_number: string;
    status: string;
    expected_delivery: string | null;
    total_cost: number | null;
    notes: string | null;
    created_at: string;
    supplier: { name: string };
    items: {
      id: string;
      quantity: number;
      unit: string;
      cost_per_unit: number;
      received_quantity: number;
      product: { name: string };
      variant: { name: string } | null;
    }[];
  };

  const lots = (lotsRes.data ?? []) as unknown as LotRow[];
  const products = (productsRes.data ?? []) as unknown as ProductRow[];
  const suppliers = (suppliersRes.data ?? []) as unknown as { id: string; name: string }[];
  const variants = (variantsRes.data ?? []) as unknown as VariantRow[];
  const sessions = (sessionsRes.data ?? []) as unknown as SessionRow[];
  const purchaseOrders = (posRes.data ?? []) as unknown as PORow[];

  // Summary calculations
  const availableLots = lots.filter((l) => ['available', 'aging'].includes(l.status));
  const totalWeight = availableLots.reduce((sum, l) => sum + Number(l.current_weight_lb), 0);
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  const expiringSoon = lots.filter(
    (l) =>
      l.best_by_date &&
      !['depleted', 'expired', 'waste'].includes(l.status) &&
      new Date(l.best_by_date).getTime() - now < threeDays &&
      new Date(l.best_by_date).getTime() - now > -threeDays
  );

  // Lots available for cutting (aging or available, with weight > 0)
  const cuttableLots = lots
    .filter((l) => ['aging', 'available'].includes(l.status) && Number(l.current_weight_lb) > 0)
    .map((l) => ({
      id: l.id,
      lot_number: l.lot_number,
      current_weight_lb: l.current_weight_lb,
      product: l.product,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
        <p className="text-muted-foreground">Track lots, cutting sessions, and purchase orders</p>
      </div>

      {/* Summary bar */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableLots.length}</p>
              <p className="text-xs text-muted-foreground">Active lots</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalWeight.toFixed(0)} lb</p>
              <p className="text-xs text-muted-foreground">Total weight in stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="py-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${expiringSoon.length > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiringSoon.length}</p>
              <p className="text-xs text-muted-foreground">Expiring within 3 days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="lots">
        <TabsList>
          <TabsTrigger value="lots">Lots</TabsTrigger>
          <TabsTrigger value="cutting">Cutting Sessions</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="lots" className="mt-4">
          <LotsTab lots={lots} products={products} suppliers={suppliers} />
        </TabsContent>

        <TabsContent value="cutting" className="mt-4">
          <CuttingTab sessions={sessions} lots={cuttableLots} variants={variants} />
        </TabsContent>

        <TabsContent value="purchase-orders" className="mt-4">
          <PurchaseOrdersTab purchaseOrders={purchaseOrders} suppliers={suppliers} products={products} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
