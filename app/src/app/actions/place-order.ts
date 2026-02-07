'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';

interface OrderItemInput {
  variant_id: string;
  quantity_lbs: number;
  price_per_unit: number;
  unit: string;
  weight_type: string;
}

interface PlaceOrderInput {
  items: OrderItemInput[];
  notes?: string;
}

export async function placeOrder(input: PlaceOrderInput) {
  const profile = await getProfile();
  if (!profile) {
    return { error: 'Not authenticated' };
  }

  const supabase = await createClient();

  // Get customer record
  const { data: customer, error: custError } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', profile.id)
    .single();

  if (!customer || custError) {
    return { error: 'Customer account not found' };
  }

  if (input.items.length === 0) {
    return { error: 'Cart is empty' };
  }

  // Generate order number
  const { data: orderNum } = await supabase
    .rpc('generate_order_number', { p_tenant_id: profile.tenant_id });

  const order_number = orderNum ?? `ORD-${Date.now()}`;

  // Calculate estimated total (lbs × price per unit)
  const estimated_total = input.items.reduce((sum, item) => {
    return sum + item.quantity_lbs * item.price_per_unit;
  }, 0);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      tenant_id: profile.tenant_id,
      customer_id: customer.id,
      order_number,
      status: 'pending',
      placed_by: profile.id,
      estimated_total: Math.round(estimated_total * 100) / 100,
      notes: input.notes ?? null,
    })
    .select('id, order_number')
    .single();

  if (orderError || !order) {
    console.error('Order creation error:', orderError?.message);
    return { error: 'Failed to create order. Please try again.' };
  }

  // Create order items
  const orderItems = input.items.map((item) => {
    const estLineTotal = item.quantity_lbs * item.price_per_unit;

    return {
      tenant_id: profile.tenant_id,
      order_id: order.id,
      variant_id: item.variant_id,
      quantity: 1, // single line per variant
      unit: item.unit as 'lb' | 'kg' | 'each' | 'case',
      price_per_unit: item.price_per_unit,
      estimated_weight_lb: item.quantity_lbs,
      estimated_line_total: Math.round(estLineTotal * 100) / 100,
    };
  });

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('Order items error:', itemsError.message);
    // Order was created but items failed — return the order number so the cart still clears
    return { order_number: order.order_number, warning: 'Order placed but some items may not have saved. Please check your order history.' };
  }

  return { order_number: order.order_number };
}
