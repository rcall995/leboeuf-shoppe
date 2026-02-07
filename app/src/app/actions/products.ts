'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

const variantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().nullable().optional(),
  weight_type: z.enum(['catch_weight', 'fixed_weight', 'each']),
  default_price_per_unit: z.coerce.number().positive('Price must be positive'),
  unit: z.enum(['lb', 'kg', 'each', 'case']),
  estimated_weight_lb: z.coerce.number().positive().nullable().optional(),
  min_weight_lb: z.coerce.number().positive().nullable().optional(),
  max_weight_lb: z.coerce.number().positive().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function createProduct(formData: {
  name: string;
  description?: string;
  category_id?: string | null;
  is_active?: boolean;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const parsed = productSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .insert({
      tenant_id: profile.tenant_id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category_id: parsed.data.category_id ?? null,
      is_active: parsed.data.is_active ?? true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('createProduct error:', error.message);
    return { error: 'Failed to create product' };
  }

  revalidatePath('/admin/products');
  return { id: data.id };
}

export async function updateProduct(
  productId: string,
  formData: {
    name?: string;
    description?: string;
    category_id?: string | null;
    is_active?: boolean;
  }
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('products')
    .update({
      ...(formData.name !== undefined && { name: formData.name }),
      ...(formData.description !== undefined && { description: formData.description || null }),
      ...(formData.category_id !== undefined && { category_id: formData.category_id || null }),
      ...(formData.is_active !== undefined && { is_active: formData.is_active }),
    })
    .eq('id', productId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updateProduct error:', error.message);
    return { error: 'Failed to update product' };
  }

  revalidatePath('/admin/products');
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Check if any orders reference this product's variants
  const { count } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .in(
      'variant_id',
      (await supabase.from('product_variants').select('id').eq('product_id', productId)).data?.map(v => v.id) ?? []
    );

  if (count && count > 0) {
    // Soft delete instead
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId)
      .eq('tenant_id', profile.tenant_id);

    if (error) return { error: 'Failed to deactivate product' };
    revalidatePath('/admin/products');
    return { success: true, deactivated: true };
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('deleteProduct error:', error.message);
    return { error: 'Failed to delete product' };
  }

  revalidatePath('/admin/products');
  return { success: true };
}

export async function createVariant(
  productId: string,
  formData: {
    name: string;
    sku?: string | null;
    weight_type: string;
    default_price_per_unit: number;
    unit: string;
    estimated_weight_lb?: number | null;
    min_weight_lb?: number | null;
    max_weight_lb?: number | null;
    is_active?: boolean;
  }
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const parsed = variantSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_variants')
    .insert({
      tenant_id: profile.tenant_id,
      product_id: productId,
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      weight_type: parsed.data.weight_type,
      default_price_per_unit: parsed.data.default_price_per_unit,
      unit: parsed.data.unit,
      estimated_weight_lb: parsed.data.estimated_weight_lb ?? null,
      min_weight_lb: parsed.data.min_weight_lb ?? null,
      max_weight_lb: parsed.data.max_weight_lb ?? null,
      is_active: parsed.data.is_active ?? true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('createVariant error:', error.message);
    if (error.code === '23505') return { error: 'SKU already exists' };
    return { error: 'Failed to create variant' };
  }

  revalidatePath('/admin/products');
  return { id: data.id };
}

export async function updateVariant(
  variantId: string,
  formData: {
    name?: string;
    sku?: string | null;
    weight_type?: string;
    default_price_per_unit?: number;
    unit?: string;
    estimated_weight_lb?: number | null;
    min_weight_lb?: number | null;
    max_weight_lb?: number | null;
    is_active?: boolean;
  }
) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const updateData: Record<string, unknown> = {};
  if (formData.name !== undefined) updateData.name = formData.name;
  if (formData.sku !== undefined) updateData.sku = formData.sku || null;
  if (formData.weight_type !== undefined) updateData.weight_type = formData.weight_type;
  if (formData.default_price_per_unit !== undefined) updateData.default_price_per_unit = formData.default_price_per_unit;
  if (formData.unit !== undefined) updateData.unit = formData.unit;
  if (formData.estimated_weight_lb !== undefined) updateData.estimated_weight_lb = formData.estimated_weight_lb;
  if (formData.min_weight_lb !== undefined) updateData.min_weight_lb = formData.min_weight_lb;
  if (formData.max_weight_lb !== undefined) updateData.max_weight_lb = formData.max_weight_lb;
  if (formData.is_active !== undefined) updateData.is_active = formData.is_active;

  const { error } = await supabase
    .from('product_variants')
    .update(updateData)
    .eq('id', variantId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('updateVariant error:', error.message);
    if (error.code === '23505') return { error: 'SKU already exists' };
    return { error: 'Failed to update variant' };
  }

  revalidatePath('/admin/products');
  return { success: true };
}

export async function deleteVariant(variantId: string) {
  const profile = await getProfile();
  if (!profile || profile.role === 'customer') {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Check for order references
  const { count } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('variant_id', variantId);

  if (count && count > 0) {
    const { error } = await supabase
      .from('product_variants')
      .update({ is_active: false })
      .eq('id', variantId)
      .eq('tenant_id', profile.tenant_id);

    if (error) return { error: 'Failed to deactivate variant' };
    revalidatePath('/admin/products');
    return { success: true, deactivated: true };
  }

  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', variantId)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error('deleteVariant error:', error.message);
    return { error: 'Failed to delete variant' };
  }

  revalidatePath('/admin/products');
  return { success: true };
}
