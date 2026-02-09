'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getPendingOrders } from '@/app/actions/orders';

const POLL_INTERVAL = 15_000;

export function OrderNotifications() {
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const orders = await getPendingOrders();
        const currentIds = new Set(orders.map((o) => o.id));

        // First run — seed known IDs, don't notify
        if (knownIds.current === null) {
          knownIds.current = currentIds;
          return;
        }

        // Show toast for any new orders
        for (const order of orders) {
          if (!knownIds.current.has(order.id)) {
            const total = order.estimated_total
              ? ` — $${order.estimated_total.toFixed(2)}`
              : '';

            toast.info(`New Order: ${order.order_number}`, {
              description: `${order.business_name}${total}`,
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

        knownIds.current = currentIds;
      } catch {
        // Silently ignore polling errors
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return null;
}
