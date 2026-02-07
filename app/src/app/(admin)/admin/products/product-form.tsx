'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { createProduct, updateProduct, createVariant, updateVariant, deleteVariant } from '@/app/actions/products';

interface Category {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  sku: string | null;
  weight_type: string;
  default_price_per_unit: number;
  unit: string;
  estimated_weight_lb: number | null;
  min_weight_lb: number | null;
  max_weight_lb: number | null;
  is_active: boolean;
}

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  is_active: boolean;
  variants: Variant[];
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductData | null;
  categories: Category[];
}

const EMPTY_VARIANT = {
  name: '',
  sku: '',
  weight_type: 'catch_weight' as const,
  default_price_per_unit: '',
  unit: 'lb' as const,
  estimated_weight_lb: '',
  min_weight_lb: '',
  max_weight_lb: '',
};

export function ProductForm({ open, onOpenChange, product, categories }: ProductFormProps) {
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  // Variant being added/edited
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT);
  const [variantSaving, setVariantSaving] = useState(false);

  function resetForm() {
    setName('');
    setDescription('');
    setCategoryId('');
    setIsActive(true);
    setShowVariantForm(false);
    setEditingVariantId(null);
    setVariantForm(EMPTY_VARIANT);
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetForm();
    onOpenChange(open);
  }

  async function handleSaveProduct() {
    if (!name.trim()) {
      toast.error('Product name is required');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const result = await updateProduct(product.id, {
          name: name.trim(),
          description: description.trim(),
          category_id: categoryId || null,
          is_active: isActive,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Product updated');
      } else {
        const result = await createProduct({
          name: name.trim(),
          description: description.trim(),
          category_id: categoryId || null,
          is_active: isActive,
        });
        if (result.error) {
          toast.error(typeof result.error === 'string' ? result.error : 'Validation failed');
          return;
        }
        toast.success('Product created');
      }
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  function startEditVariant(v: Variant) {
    setEditingVariantId(v.id);
    setVariantForm({
      name: v.name,
      sku: v.sku ?? '',
      weight_type: v.weight_type as typeof EMPTY_VARIANT.weight_type,
      default_price_per_unit: String(v.default_price_per_unit),
      unit: v.unit as typeof EMPTY_VARIANT.unit,
      estimated_weight_lb: v.estimated_weight_lb ? String(v.estimated_weight_lb) : '',
      min_weight_lb: v.min_weight_lb ? String(v.min_weight_lb) : '',
      max_weight_lb: v.max_weight_lb ? String(v.max_weight_lb) : '',
    });
    setShowVariantForm(true);
  }

  function cancelVariantForm() {
    setShowVariantForm(false);
    setEditingVariantId(null);
    setVariantForm(EMPTY_VARIANT);
  }

  async function handleSaveVariant() {
    if (!variantForm.name.trim()) {
      toast.error('Variant name is required');
      return;
    }
    if (!variantForm.default_price_per_unit || Number(variantForm.default_price_per_unit) <= 0) {
      toast.error('Price must be positive');
      return;
    }

    setVariantSaving(true);
    try {
      const data = {
        name: variantForm.name.trim(),
        sku: variantForm.sku.trim() || null,
        weight_type: variantForm.weight_type,
        default_price_per_unit: Number(variantForm.default_price_per_unit),
        unit: variantForm.unit,
        estimated_weight_lb: variantForm.estimated_weight_lb ? Number(variantForm.estimated_weight_lb) : null,
        min_weight_lb: variantForm.min_weight_lb ? Number(variantForm.min_weight_lb) : null,
        max_weight_lb: variantForm.max_weight_lb ? Number(variantForm.max_weight_lb) : null,
      };

      if (editingVariantId) {
        const result = await updateVariant(editingVariantId, data);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Variant updated');
      } else {
        if (!product?.id) {
          toast.error('Save the product first, then add variants');
          return;
        }
        const result = await createVariant(product.id, data);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Variant added');
      }
      cancelVariantForm();
    } finally {
      setVariantSaving(false);
    }
  }

  async function handleDeleteVariant(variantId: string) {
    const result = await deleteVariant(variantId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.deactivated) {
      toast.info('Variant deactivated (referenced by existing orders)');
    } else {
      toast.success('Variant deleted');
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Product' : 'New Product'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Product fields */}
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wagyu Ribeye"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-desc">Description</Label>
            <Textarea
              id="product-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional product description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="product-active">Active</Label>
            <Switch id="product-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <Button onClick={handleSaveProduct} disabled={saving} className="w-full">
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </Button>

          {/* Variants section — only show for existing products */}
          {isEdit && (
            <>
              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Variants</h3>
                  {!showVariantForm && (
                    <Button size="sm" variant="outline" onClick={() => setShowVariantForm(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Variant
                    </Button>
                  )}
                </div>

                {/* Existing variants list */}
                {product.variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{v.name}</span>
                        {!v.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${Number(v.default_price_per_unit).toFixed(2)}/{v.unit} · {v.weight_type.replace('_', ' ')}
                        {v.sku && ` · ${v.sku}`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditVariant(v)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteVariant(v.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Variant add/edit form */}
                {showVariantForm && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        {editingVariantId ? 'Edit Variant' : 'New Variant'}
                      </h4>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelVariantForm}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={variantForm.name}
                          onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                          placeholder="e.g. King Cut"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">SKU</Label>
                        <Input
                          value={variantForm.sku}
                          onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Weight Type</Label>
                        <Select
                          value={variantForm.weight_type}
                          onValueChange={(v) => setVariantForm({ ...variantForm, weight_type: v as typeof EMPTY_VARIANT.weight_type })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="catch_weight">Catch Weight</SelectItem>
                            <SelectItem value="fixed_weight">Fixed Weight</SelectItem>
                            <SelectItem value="each">Each</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unit</Label>
                        <Select
                          value={variantForm.unit}
                          onValueChange={(v) => setVariantForm({ ...variantForm, unit: v as typeof EMPTY_VARIANT.unit })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lb">lb</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="each">each</SelectItem>
                            <SelectItem value="case">case</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Default Price per Unit ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={variantForm.default_price_per_unit}
                        onChange={(e) => setVariantForm({ ...variantForm, default_price_per_unit: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Est. Weight (lb)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={variantForm.estimated_weight_lb}
                          onChange={(e) => setVariantForm({ ...variantForm, estimated_weight_lb: e.target.value })}
                          placeholder="—"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Min (lb)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={variantForm.min_weight_lb}
                          onChange={(e) => setVariantForm({ ...variantForm, min_weight_lb: e.target.value })}
                          placeholder="—"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max (lb)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={variantForm.max_weight_lb}
                          onChange={(e) => setVariantForm({ ...variantForm, max_weight_lb: e.target.value })}
                          placeholder="—"
                        />
                      </div>
                    </div>

                    <Button onClick={handleSaveVariant} disabled={variantSaving} className="w-full" size="sm">
                      {variantSaving ? 'Saving...' : editingVariantId ? 'Update Variant' : 'Add Variant'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {!isEdit && (
            <p className="text-xs text-muted-foreground text-center">
              After creating the product, you can add variants.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
