'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { sendOrderConfirmation, sendNewOrderAlert } from '@/lib/email';

interface OrderItemInput {
  variant_id: string;
  quantity_lbs: number;
  price_per_unit: number;
  unit: string;
  weight_type: string;
  estimated_weight_per_piece?: number | null;
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
    .select('id, email, contact_name, business_name')
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

  // Calculate estimated total
  const estimated_total = input.items.reduce((sum, item) => {
    if (item.unit === 'case') {
      // Cases: quantity × case_weight × price_per_lb
      return sum + item.quantity_lbs * (item.estimated_weight_per_piece ?? 0) * item.price_per_unit;
    }
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
    const isCase = item.unit === 'case';
    const caseWeight = item.estimated_weight_per_piece ?? 0;
    const estLineTotal = isCase
      ? item.quantity_lbs * caseWeight * item.price_per_unit
      : item.quantity_lbs * item.price_per_unit;

    return {
      tenant_id: profile.tenant_id,
      order_id: order.id,
      variant_id: item.variant_id,
      quantity: isCase ? item.quantity_lbs : 1,
      unit: item.unit as 'lb' | 'kg' | 'each' | 'case',
      price_per_unit: item.price_per_unit,
      estimated_weight_lb: isCase ? item.quantity_lbs * caseWeight : item.quantity_lbs,
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

  // Fetch variant names for emails
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, name, product:products(name)')
    .in('id', input.items.map((i) => i.variant_id));

  type VariantLookup = { id: string; name: string; product: { name: string } };
  const variantMap = new Map(
    ((variants ?? []) as unknown as VariantLookup[]).map((v) => [v.id, `${v.product.name} - ${v.name}`])
  );

  const emailItems = input.items.map((item) => ({
    productName: variantMap.get(item.variant_id) ?? 'Product',
    quantity: item.quantity_lbs,
    unit: item.unit,
    pricePerUnit: item.price_per_unit,
  }));

  const roundedTotal = Math.round(estimated_total * 100) / 100;

  // Send customer confirmation email (fire-and-forget)
  if (customer.email) {
    sendOrderConfirmation({
      to: customer.email,
      customerName: customer.contact_name ?? customer.business_name,
      orderNumber: order.order_number,
      estimatedTotal: roundedTotal,
      items: emailItems,
    });
  }

  // Send admin notification email (fire-and-forget)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', profile.tenant_id)
    .single();

  const notifyEmail = (tenant?.settings as Record<string, string> | null)?.order_notification_email;
  if (notifyEmail) {
    sendNewOrderAlert({
      to: notifyEmail,
      customerName: customer.contact_name ?? customer.business_name,
      businessName: customer.business_name,
      orderNumber: order.order_number,
      estimatedTotal: roundedTotal,
      items: emailItems,
    });
  }

  return { order_number: order.order_number };
}
