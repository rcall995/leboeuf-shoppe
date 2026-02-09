'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const POLL_INTERVAL = 15_000; // 15 seconds

export function OrderNotifications() {
  const knownOrderIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function checkForNewOrders() {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, estimated_total, customer_id, customers(business_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!orders) return;

      const currentIds = new Set(orders.map((o) => o.id));

      // First run — seed known IDs, don't notify
      if (knownOrderIds.current === null) {
        knownOrderIds.current = currentIds;
        return;
      }

      // Find new orders we haven't seen
      for (const order of orders) {
        if (!knownOrderIds.current.has(order.id)) {
          const customer = order.customers as unknown as { business_name: string } | null;
          const name = customer?.business_name ?? 'A customer';
          const total = order.estimated_total
            ? ` — $${order.estimated_total.toFixed(2)}`
            : '';

          toast.info(`New Order: ${order.order_number}`, {
            description: `${name}${total}`,
            duration: 15000,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = `/admin/orders/${order.id}`;
              },
            },
          });
        }
      }

      knownOrderIds.current = currentIds;
    }

    // Initial check
    checkForNewOrders();

    // Poll
    const interval = setInterval(checkForNewOrders, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return null;
}
