'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ShoppingCart, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPendingOrders } from '@/app/actions/orders';

const POLL_INTERVAL = 15_000;

export function OrderNotifications() {
  const knownIds = useRef<Set<string> | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      setNeedsPermission(true);
    }
  }, []);

  function handleEnableNotifications() {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        setNeedsPermission(false);
      }
    });
  }

  useEffect(() => {
    async function poll() {
      try {
        const orders = await getPendingOrders();
        const currentIds = new Set(orders.map((o) => o.id));

        if (knownIds.current === null) {
          knownIds.current = currentIds;
          return;
        }

        for (const order of orders) {
          if (!knownIds.current.has(order.id)) {
            const total = order.estimated_total
              ? `$${order.estimated_total.toFixed(2)}`
              : '';

            // Browser notification with sound
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              const n = new Notification(`New Order: ${order.order_number}`, {
                body: `${order.business_name}${total ? ` — ${total}` : ''}`,
                icon: '/icon-192.png',
                requireInteraction: true,
                tag: `order-${order.id}`,
              });
              n.onclick = () => {
                window.focus();
                window.location.href = `/admin/orders/${order.id}`;
                n.close();
              };
            }

            // In-app toast (stays until dismissed)
            toast.custom(
              (id) => (
                <div
                  className="w-[360px] rounded-lg border border-green-300 bg-green-50 p-4 shadow-2xl cursor-pointer"
                  onClick={() => {
                    toast.dismiss(id);
                    window.location.href = `/admin/orders/${order.id}`;
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white shrink-0 mt-0.5">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-green-900">
                        New Order!
                      </p>
                      <p className="text-sm font-semibold text-green-800 mt-0.5">
                        {order.order_number} {total && `\u2014 ${total}`}
                      </p>
                      <p className="text-sm text-green-700 mt-0.5">
                        {order.business_name}
                      </p>
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        Click to view order
                      </p>
                    </div>
                  </div>
                </div>
              ),
              { duration: Infinity, position: 'top-center' }
            );
          }
        }

        knownIds.current = currentIds;
      } catch {}
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Show a banner prompting to enable notifications
  if (needsPermission) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-lg">
          <Bell className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Enable order alerts?</p>
            <p className="text-blue-700 text-xs">Get sound notifications for new orders</p>
          </div>
          <Button size="sm" onClick={handleEnableNotifications}>
            Enable
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
