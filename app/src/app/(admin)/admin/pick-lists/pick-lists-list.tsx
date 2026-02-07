'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, ChevronRight, Plus } from 'lucide-react';
import { GeneratePickListForm } from './generate-pick-list-form';

interface PickListRow {
  id: string;
  order_id: string;
  is_complete: boolean;
  completed_at: string | null;
  created_at: string;
  assigned_to: string | null;
  order: { order_number: string; customer: { business_name: string } };
  assignee: { full_name: string } | null;
  items_total: number;
  items_picked: number;
}

interface EligibleOrder {
  id: string;
  order_number: string;
  status: string;
  customer: { business_name: string };
}

interface StaffMember {
  id: string;
  full_name: string;
}

interface PickListsListProps {
  pickLists: PickListRow[];
  eligibleOrders: EligibleOrder[];
  staff: StaffMember[];
  currentFilter: string;
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export function PickListsList({ pickLists, eligibleOrders, staff, currentFilter }: PickListsListProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  const counts = {
    all: pickLists.length,
    in_progress: pickLists.filter((pl) => !pl.is_complete).length,
    completed: pickLists.filter((pl) => pl.is_complete).length,
  };

  const filtered = currentFilter === 'all'
    ? pickLists
    : currentFilter === 'completed'
      ? pickLists.filter((pl) => pl.is_complete)
      : pickLists.filter((pl) => !pl.is_complete);

  function handleFilter(key: string) {
    if (key === 'all') {
      router.push('/admin/pick-lists');
    } else {
      router.push(`/admin/pick-lists?filter=${key}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pick Lists</h2>
          <p className="text-muted-foreground text-sm">Warehouse fulfillment for orders</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Generate
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
          {filtered.map((pl) => {
            const progress = pl.items_total > 0
              ? Math.round((pl.items_picked / pl.items_total) * 100)
              : 0;

            return (
              <Link key={pl.id} href={`/admin/pick-lists/${pl.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{pl.order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{pl.order.customer.business_name}</p>
                        {pl.assignee && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Assigned: {pl.assignee.full_name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(pl.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge className={pl.is_complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                            {pl.is_complete ? 'Complete' : 'In Progress'}
                          </Badge>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {pl.items_picked}/{pl.items_total}
                            </span>
                          </div>
                        </div>
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
          <ClipboardCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {currentFilter === 'all' ? 'No pick lists yet' : `No ${currentFilter.replace('_', ' ')} pick lists`}
          </p>
        </div>
      )}

      <GeneratePickListForm
        open={formOpen}
        onOpenChange={setFormOpen}
        eligibleOrders={eligibleOrders}
        staff={staff}
      />
    </div>
  );
}
