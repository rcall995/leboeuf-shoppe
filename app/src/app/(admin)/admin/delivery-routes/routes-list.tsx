'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteRoute } from '@/app/actions/delivery-routes';
import { RouteForm } from './route-form';

interface RouteRow {
  id: string;
  name: string;
  route_date: string;
  is_complete: boolean;
  completed_at: string | null;
  created_at: string;
  driver_id: string | null;
  driver: { full_name: string } | null;
  stops_total: number;
  stops_delivered: number;
}

interface StaffMember {
  id: string;
  full_name: string;
}

interface RoutesListProps {
  routes: RouteRow[];
  staff: StaffMember[];
  currentFilter: string;
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

export function RoutesList({ routes, staff, currentFilter }: RoutesListProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split('T')[0];

  const counts = {
    all: routes.length,
    upcoming: routes.filter((r) => !r.is_complete && r.route_date > today).length,
    active: routes.filter((r) => !r.is_complete && r.route_date <= today).length,
    completed: routes.filter((r) => r.is_complete).length,
  };

  const filtered = (() => {
    switch (currentFilter) {
      case 'upcoming':
        return routes.filter((r) => !r.is_complete && r.route_date > today);
      case 'active':
        return routes.filter((r) => !r.is_complete && r.route_date <= today);
      case 'completed':
        return routes.filter((r) => r.is_complete);
      default:
        return routes;
    }
  })();

  function handleFilter(key: string) {
    if (key === 'all') {
      router.push('/admin/delivery-routes');
    } else {
      router.push(`/admin/delivery-routes?filter=${key}`);
    }
  }

  function handleDelete(routeId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this route?')) return;

    startTransition(async () => {
      const result = await deleteRoute(routeId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Route deleted');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delivery Routes</h2>
          <p className="text-muted-foreground text-sm">Plan and track deliveries</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Route
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {FILTER_TABS.map((tab) => {
          const count = counts[tab.key as keyof typeof counts] ?? 0;
          const isActive = currentFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleFilter(tab.key)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((route) => {
            const progress = route.stops_total > 0
              ? Math.round((route.stops_delivered / route.stops_total) * 100)
              : 0;

            return (
              <Link key={route.id} href={`/admin/delivery-routes/${route.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{route.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(route.route_date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {route.driver && ` — ${route.driver.full_name}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge className={route.is_complete ? 'bg-emerald-100 text-emerald-800' : route.route_date <= today ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}>
                            {route.is_complete ? 'Complete' : route.route_date <= today ? 'Active' : 'Upcoming'}
                          </Badge>
                          {route.stops_total > 0 && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {route.stops_delivered}/{route.stops_total}
                              </span>
                            </div>
                          )}
                        </div>
                        {!route.is_complete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(route.id, e)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Truck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {currentFilter === 'all' ? 'No delivery routes yet' : `No ${currentFilter} routes`}
          </p>
        </div>
      )}

      <RouteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        staff={staff}
      />
    </div>
  );
}
