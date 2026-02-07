'use client';

import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { updatePOStatus, receivePO } from '@/app/actions/purchase-orders';
import { POForm } from './po-form';

interface PurchaseOrder {
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
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  variants: { id: string; name: string }[];
}

interface PurchaseOrdersTabProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
}

const PO_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-purple-100 text-purple-800',
  received: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PO_NEXT_STATUS: Record<string, { label: string; status: string }[]> = {
  draft: [{ label: 'Submit', status: 'submitted' }],
  submitted: [{ label: 'Confirm', status: 'confirmed' }],
  confirmed: [{ label: 'Receive', status: 'received' }],
  received: [],
  cancelled: [],
};

export function PurchaseOrdersTab({ purchaseOrders, suppliers, products }: PurchaseOrdersTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(poId: string, newStatus: string) {
    startTransition(async () => {
      if (newStatus === 'received') {
        const result = await receivePO(poId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`PO received — ${result.lots_created} lot(s) created`);
      } else {
        const result = await updatePOStatus(poId, newStatus);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`PO status updated to ${newStatus}`);
      }
    });
  }

  function handleCancel(poId: string) {
    startTransition(async () => {
      const result = await updatePOStatus(poId, 'cancelled');
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('PO cancelled');
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {purchaseOrders.length} order{purchaseOrders.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New PO
        </Button>
      </div>

      {purchaseOrders.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">PO #</th>
                <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Supplier</th>
                <th className="text-left px-3 py-2 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Total</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Delivery</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider">Items</th>
                <th className="text-right px-3 py-2 font-medium text-xs uppercase tracking-wider w-[160px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => {
                const nextActions = PO_NEXT_STATUS[po.status] ?? [];
                const canCancel = ['draft', 'submitted', 'confirmed'].includes(po.status);

                return (
                  <tr key={po.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{po.po_number}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{po.supplier.name}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-xs ${PO_STATUS_COLORS[po.status] ?? ''}`}>
                        {po.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {po.total_cost ? `$${Number(po.total_cost).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground text-xs">
                      {po.expected_delivery
                        ? new Date(po.expected_delivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      {po.items.length}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {nextActions.map((action) => (
                          <Button
                            key={action.status}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={isPending}
                            onClick={() => handleStatusChange(po.id, action.status)}
                          >
                            {action.label}
                          </Button>
                        ))}
                        {canCancel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive hover:bg-destructive hover:text-white"
                            disabled={isPending}
                            onClick={() => handleCancel(po.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No purchase orders yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Create a PO to order from your suppliers.
          </p>
        </div>
      )}

      <POForm
        open={formOpen}
        onOpenChange={setFormOpen}
        suppliers={suppliers}
        products={products}
      />
    </div>
  );
}
