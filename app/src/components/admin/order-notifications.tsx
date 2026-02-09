'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';
import { getPendingOrders } from '@/app/actions/orders';

const POLL_INTERVAL = 15_000;
const SOUND_URL = 'https://cdn.freesound.org/previews/536/536420_4921277-lq.mp3';

function playNotificationSound() {
  try {
    const audio = new Audio(SOUND_URL);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}

export function OrderNotifications() {
  const knownIds = useRef<Set<string> | null>(null);

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

            playNotificationSound();

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
              { duration: 30000, position: 'top-center' }
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

  return null;
}
