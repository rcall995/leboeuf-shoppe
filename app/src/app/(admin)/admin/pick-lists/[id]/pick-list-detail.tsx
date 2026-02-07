'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Check, Undo2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { pickItem, unpickItem, completePickList, assignPickList } from '@/app/actions/pick-lists';
import { useRouter } from 'next/navigation';

interface PickListItemRow {
  id: string;
  order_item_id: string;
  lot_id: string | null;
  picked: boolean;
  picked_weight_lb: number | null;
  picked_at: string | null;
  order_item: {
    quantity: number;
    estimated_weight_lb: number | null;
    price_per_unit: number;
    variant: {
      name: string;
      unit: string;
      weight_type: string;
      product: { name: string };
    };
  };
}

interface AvailableLot {
  id: string;
  lot_number: string;
  current_weight_lb: number;
  product: { name: string };
}

interface StaffMember {
  id: string;
  full_name: string;
}

interface PickListDetailProps {
  pickList: {
    id: string;
    is_complete: boolean;
    completed_at: string | null;
    created_at: string;
    assigned_to: string | null;
    order: { id: string; order_number: string; customer: { business_name: string } };
    assignee: { full_name: string } | null;
  };
  items: PickListItemRow[];
  availableLots: AvailableLot[];
  staff: StaffMember[];
}

function PickItemRow({ item, availableLots, isComplete }: {
  item: PickListItemRow;
  availableLots: AvailableLot[];
  isComplete: boolean;
}) {
  const [lotId, setLotId] = useState(item.lot_id ?? '');
  const [weight, setWeight] = useState(item.picked_weight_lb ? String(item.picked_weight_lb) : '');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handlePick() {
    if (!lotId) {
      toast.error('Select an inventory lot');
      return;
    }
    if (!weight || Number(weight) <= 0) {
      toast.error('Enter a valid weight');
      return;
    }

    startTransition(async () => {
      const result = await pickItem(item.id, {
        lot_id: lotId,
        picked_weight_lb: Number(weight),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Item picked');
        router.refresh();
      }
    });
  }

  function handleUnpick() {
    startTransition(async () => {
      const result = await unpickItem(item.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Item unpicked');
        setLotId('');
        setWeight('');
        router.refresh();
      }
    });
  }

  const oi = item.order_item;

  return (
    <Card className={item.picked ? 'border-emerald-200 bg-emerald-50/50' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{oi.variant.product.name}</p>
            <p className="text-sm text-muted-foreground">{oi.variant.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Qty: {oi.quantity}
              {oi.estimated_weight_lb && ` | Est: ${oi.estimated_weight_lb} lb`}
              {' | '}${Number(oi.price_per_unit).toFixed(2)}/{oi.variant.unit}
            </p>

            {item.picked && (
              <div className="mt-2 text-sm text-emerald-700">
                Picked: {item.picked_weight_lb} lb
                {item.picked_at && (
                  <span className="text-xs text-muted-foreground ml-2">
                    at {new Date(item.picked_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {!isComplete && (
            <div className="flex items-end gap-2">
              {item.picked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnpick}
                  disabled={isPending}
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1" /> Unpick
                </Button>
              ) : (
                <>
                  <div className="w-40">
                    <Select value={lotId} onValueChange={setLotId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select lot" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLots.map((lot) => (
                          <SelectItem key={lot.id} value={lot.id}>
                            {lot.lot_number} ({lot.current_weight_lb} lb)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-24 h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handlePick}
                    disabled={isPending || !lotId || !weight}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Pick
                  </Button>
                </>
              )}
            </div>
          )}

          {isComplete && item.picked && (
            <Badge className="bg-emerald-100 text-emerald-800">
              <Check className="h-3 w-3 mr-1" /> Picked
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PickListDetail({ pickList, items, availableLots, staff }: PickListDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const totalItems = items.length;
  const pickedItems = items.filter((i) => i.picked).length;
  const progress = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0;

  function handleComplete() {
    startTransition(async () => {
      const result = await completePickList(pickList.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Pick list completed');
        router.refresh();
      }
    });
  }

  function handleAssign(profileId: string) {
    startTransition(async () => {
      const result = await assignPickList(pickList.id, profileId || null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Assignment updated');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/pick-lists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">
            Pick List — {pickList.order.order_number}
          </h2>
          <p className="text-muted-foreground text-sm">{pickList.order.customer.business_name}</p>
        </div>
        <Badge className={pickList.is_complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
          {pickList.is_complete ? 'Complete' : 'In Progress'}
        </Badge>
      </div>

      {/* Summary card */}
      <Card className="shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Progress</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="font-medium">{pickedItems}/{totalItems}</span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Assigned To</span>
                {pickList.is_complete ? (
                  <p className="font-medium mt-1">{pickList.assignee?.full_name ?? 'Unassigned'}</p>
                ) : (
                  <Select
                    value={pickList.assigned_to ?? ''}
                    onValueChange={handleAssign}
                  >
                    <SelectTrigger className="h-8 w-40 mt-1">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium mt-1">
                  {new Date(pickList.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {pickList.completed_at && (
                <div>
                  <span className="text-muted-foreground">Completed</span>
                  <p className="font-medium mt-1">
                    {new Date(pickList.completed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>

            {!pickList.is_complete && pickedItems === totalItems && totalItems > 0 && (
              <Button onClick={handleComplete} disabled={isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Pick List
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Items ({totalItems})</h3>
        <div className="space-y-3">
          {items.map((item) => (
            <PickItemRow
              key={item.id}
              item={item}
              availableLots={availableLots}
              isComplete={pickList.is_complete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
