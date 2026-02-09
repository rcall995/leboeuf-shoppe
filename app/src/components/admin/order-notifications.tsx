'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function OrderNotifications() {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          const order = payload.new as {
            id: string;
            order_number: string;
            customer_id: string;
            estimated_total: number | null;
          };

          // Fetch customer name for the toast
          const { data: customer } = await supabase
            .from('customers')
            .select('business_name')
            .eq('id', order.customer_id)
            .single();

          const name = customer?.business_name ?? 'A customer';
          const total = order.estimated_total
            ? ` — $${order.estimated_total.toFixed(2)}`
            : '';

          toast.info(`New Order: ${order.order_number}`, {
            description: `${name}${total}`,
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = `/admin/orders/${order.id}`;
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
