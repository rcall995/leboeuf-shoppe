import { requireAdmin } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function InventoryPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Inventory</h2>
        <p className="text-muted-foreground">Track lots, aging, and stock levels</p>
      </div>

      <Tabs defaultValue="lots">
        <TabsList>
          <TabsTrigger value="lots">Lots</TabsTrigger>
          <TabsTrigger value="receiving">Receiving</TabsTrigger>
          <TabsTrigger value="cutting">Cutting Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="lots">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Lots</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">No inventory lots yet. Receive your first shipment to create a lot.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receiving">
          <Card>
            <CardHeader>
              <CardTitle>Receiving</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Record incoming shipments here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cutting">
          <Card>
            <CardHeader>
              <CardTitle>Cutting Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Track primal-to-steak yield and waste.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
