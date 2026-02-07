'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Check, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markStopDelivered, removeStop, reorderStops, completeRoute } from '@/app/actions/delivery-routes';
import { AddStopForm } from './add-stop-form';

interface StopRow {
  id: string;
  stop_order: number;
  delivered: boolean;
  delivered_at: string | null;
  notes: string | null;
  order: { id: string; order_number: string };
  customer: { business_name: string };
}

interface EligibleOrder {
  id: string;
  order_number: string;
  status: string;
  customer_id: string;
  customer: { business_name: string };
}

interface RouteDetailProps {
  route: {
    id: string;
    name: string;
    route_date: string;
    is_complete: boolean;
    completed_at: string | null;
    driver_id: string | null;
    driver: { full_name: string } | null;
  };
  stops: StopRow[];
  eligibleOrders: EligibleOrder[];
}

function StopCard({ stop, index, totalStops, routeId, isComplete }: {
  stop: StopRow;
  index: number;
  totalStops: number;
  routeId: string;
  isComplete: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleDeliver() {
    startTransition(async () => {
      const result = await markStopDelivered(stop.id, notes || undefined);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Delivered to ${stop.customer.business_name}`);
        router.refresh();
      }
    });
  }

  function handleRemove() {
    if (!confirm('Remove this stop?')) return;
    startTransition(async () => {
      const result = await removeStop(stop.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Stop removed');
        router.refresh();
      }
    });
  }

  return (
    <Card className={stop.delivered ? 'border-emerald-200 bg-emerald-50/50' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              stop.delivered ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {stop.delivered ? <Check className="h-4 w-4" /> : index + 1}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium">{stop.customer.business_name}</p>
              {stop.delivered && (
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">Delivered</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Order: {stop.order.order_number}
            </p>
            {stop.delivered && stop.delivered_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Delivered at {new Date(stop.delivered_at).toLocaleTimeString()}
              </p>
            )}
            {stop.notes && (
              <p className="text-xs text-muted-foreground mt-1">Note: {stop.notes}</p>
            )}
          </div>

          {!isComplete && (
            <div className="flex items-center gap-1">
              {!stop.delivered && (
                <>
                  <Input
                    placeholder="Notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-32 h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handleDeliver}
                    disabled={isPending}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Deliver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={handleRemove}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RouteDetail({ route, stops, eligibleOrders }: RouteDetailProps) {
  const router = useRouter();
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalStops = stops.length;
  const deliveredStops = stops.filter((s) => s.delivered).length;
  const progress = totalStops > 0 ? Math.round((deliveredStops / totalStops) * 100) : 0;

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const ordered = stops.map((s) => s.id);
    [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]];
    startTransition(async () => {
      const result = await reorderStops(route.id, ordered);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleMoveDown(index: number) {
    if (index >= stops.length - 1) return;
    const ordered = stops.map((s) => s.id);
    [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
    startTransition(async () => {
      const result = await reorderStops(route.id, ordered);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeRoute(route.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Route completed');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/delivery-routes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{route.name}</h2>
          <p className="text-muted-foreground text-sm">
            {new Date(route.route_date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            {route.driver && ` — Driver: ${route.driver.full_name}`}
          </p>
        </div>
        <Badge className={route.is_complete ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}>
          {route.is_complete ? 'Complete' : 'Active'}
        </Badge>
      </div>

      {/* Progress */}
      <Card className="shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Deliveries</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="font-medium">{deliveredStops}/{totalStops}</span>
                </div>
              </div>

              {route.completed_at && (
                <div>
                  <span className="text-muted-foreground">Completed</span>
                  <p className="font-medium mt-1">
                    {new Date(route.completed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!route.is_complete && (
                <Button variant="outline" onClick={() => setAddStopOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Stop
                </Button>
              )}
              {!route.is_complete && deliveredStops === totalStops && totalStops > 0 && (
                <Button onClick={handleComplete} disabled={isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Route
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stops */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Stops ({totalStops})</h3>
        {stops.length > 0 ? (
          <div className="space-y-3">
            {stops.map((stop, index) => (
              <div key={stop.id} className="flex items-start gap-2">
                {!route.is_complete && (
                  <div className="flex flex-col gap-0.5 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || isPending}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === stops.length - 1 || isPending}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex-1">
                  <StopCard
                    stop={stop}
                    index={index}
                    totalStops={totalStops}
                    routeId={route.id}
                    isComplete={route.is_complete}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">
            No stops added yet. Add orders to this route.
          </p>
        )}
      </div>

      <AddStopForm
        open={addStopOpen}
        onOpenChange={setAddStopOpen}
        routeId={route.id}
        eligibleOrders={eligibleOrders}
      />
    </div>
  );
}
