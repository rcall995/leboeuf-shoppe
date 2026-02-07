export type UserRole = 'owner' | 'admin' | 'sales_rep' | 'customer';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'weighed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type LotStatus = 'receiving' | 'aging' | 'available' | 'allocated' | 'depleted' | 'expired' | 'waste';
export type POStatus = 'draft' | 'submitted' | 'confirmed' | 'received' | 'cancelled';
export type UnitType = 'lb' | 'kg' | 'each' | 'case';
export type WeightType = 'catch_weight' | 'fixed_weight' | 'each';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  sku: string | null;
  weight_type: WeightType;
  default_price_per_unit: number;
  unit: UnitType;
  estimated_weight_lb: number | null;
  min_weight_lb: number | null;
  max_weight_lb: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  profile_id: string | null;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  delivery_instructions: string | null;
  payment_terms: string;
  tax_exempt: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerPricing {
  id: string;
  tenant_id: string;
  customer_id: string;
  variant_id: string;
  price_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  customer_id: string;
  order_number: string;
  status: OrderStatus;
  placed_by: string | null;
  assigned_to: string | null;
  estimated_total: number | null;
  actual_total: number | null;
  notes: string | null;
  delivery_date: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  tenant_id: string;
  order_id: string;
  variant_id: string;
  lot_id: string | null;
  quantity: number;
  unit: UnitType;
  price_per_unit: number;
  estimated_weight_lb: number | null;
  actual_weight_lb: number | null;
  estimated_line_total: number | null;
  actual_line_total: number | null;
  created_at: string;
}

export interface InventoryLot {
  id: string;
  tenant_id: string;
  product_id: string;
  variant_id: string | null;
  supplier_id: string | null;
  lot_number: string;
  status: LotStatus;
  initial_weight_lb: number;
  current_weight_lb: number;
  cost_per_lb: number | null;
  kill_date: string | null;
  received_date: string;
  aging_start_date: string | null;
  best_by_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CuttingSession {
  id: string;
  tenant_id: string;
  source_lot_id: string;
  performed_by: string | null;
  session_date: string;
  input_weight_lb: number;
  total_output_weight_lb: number | null;
  waste_weight_lb: number | null;
  yield_percentage: number | null;
  notes: string | null;
  created_at: string;
}

export interface CuttingSessionItem {
  id: string;
  tenant_id: string;
  session_id: string;
  variant_id: string;
  output_lot_id: string | null;
  quantity: number;
  weight_lb: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  supplier_id: string;
  po_number: string;
  status: POStatus;
  ordered_by: string | null;
  expected_delivery: string | null;
  total_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  created_by: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Joined/computed types used in the app
export interface ProductWithVariants extends Product {
  category: Category | null;
  variants: ProductVariant[];
}

export interface OrderWithItems extends Order {
  customer: Customer;
  items: (OrderItem & { variant: ProductVariant & { product: Product } })[];
}

export interface CustomerWithPricing extends Customer {
  pricing: (CustomerPricing & { variant: ProductVariant & { product: Product } })[];
}
