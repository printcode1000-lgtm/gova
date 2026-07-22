'use client';

import * as React from 'react';
import { Package, Plus, X, DollarSign } from 'lucide-react';
import { useOnboardingStore } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormInput, FormTextarea, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { StorageImageManager } from '@/features/storage/components/StorageImageManager';
import { StorageProfiles } from '@/core/storage/constants/storage-profiles';
import type { Product, ProductVariant } from '@/lib/onboarding/types';
import { nextSellerId } from '@/lib/seller/next-id';

function generateId() {
  return nextSellerId('prod');
}

interface ProductFormProps {
  product: Product;
  onChange: (product: Partial<Product>) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ProductForm({ product, onChange, onSave, onCancel }: ProductFormProps) {
  const { t } = useTranslation();
  const { data: storeData } = useOnboardingStore();
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const categories = storeData.categories.selectedCategories.filter((c) => c.isSelected);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!product.title.trim()) newErrors.title = t('onboarding.products.errors.titleRequired');
    if (!product.description.trim()) newErrors.description = t('onboarding.products.errors.descriptionRequired');
    if (!product.category) newErrors.category = t('onboarding.products.errors.categoryRequired');
    if (product.basePrice <= 0) newErrors.basePrice = t('onboarding.products.errors.priceRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave();
  };

  const addVariant = () => {
    const variant: ProductVariant = {
      id: nextSellerId('var'),
      sku: '',
      size: '',
      color: '',
      material: '',
      price: product.basePrice,
      discountPrice: null,
      inventory: 0,
      images: [],
    };
    onChange({ variants: [...product.variants, variant] });
  };

  const updateVariant = (id: string, updates: Partial<ProductVariant>) => {
    onChange({
      variants: product.variants.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    });
  };

  const removeVariant = (id: string) => {
    onChange({ variants: product.variants.filter((v) => v.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <FormField label={t('onboarding.products.productTitle')} htmlFor="title" required error={errors.title}>
          <FormInput
            id="title"
            value={product.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t('onboarding.products.titlePlaceholder')}
            error={errors.title}
          />
        </FormField>

        <FormField label={t('onboarding.products.category')} htmlFor="category" required error={errors.category}>
          <FormSelect
            value={product.category}
            onValueChange={(v) => onChange({ category: v })}
            options={categories.map((c) => ({
              value: c.name,
              label: t(`onboarding.constants.fashionCategories.${c.id}`),
            }))}
            placeholder={t('onboarding.products.selectCategory')}
            error={errors.category}
          />
        </FormField>
      </div>

      <FormField
        label={t('onboarding.products.descriptionLabel')}
        htmlFor="description"
        required
        error={errors.description}
      >
        <FormTextarea
          id="description"
          value={product.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t('onboarding.products.descriptionPlaceholder')}
          rows={4}
          error={errors.description}
        />
      </FormField>

      <StorageImageManager
        config={{
          id: 'onboarding-product-image',
          storageProfileId: StorageProfiles.ProductDefault,
          storageScope: categories.find((category) => category.name === product.category)?.id,
          maxItems: 1,
          aspectRatio: 'square',
          allowReplace: true,
          confirmUpload: true,
          confirmRemove: true,
        }}
        value={
          product.image?.url
            ? [{
                imageKey: product.image.imageKey ?? '',
                url: product.image.url,
                isUploading: product.image.isUploading,
                error: product.image.error,
              }]
            : []
        }
        onChange={(images) => onChange({ image: images[0] ?? null })}
        label={t('onboarding.products.productImage')}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label={t('onboarding.products.price')} htmlFor="basePrice" required error={errors.basePrice}>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <FormInput
              id="basePrice"
              type="number"
              value={product.basePrice || ''}
              onChange={(e) => onChange({ basePrice: parseFloat(e.target.value) || 0 })}
              className="pl-9"
              min={0}
              step={0.01}
              error={errors.basePrice}
            />
          </div>
        </FormField>

        <FormField label={t('onboarding.products.discountPrice')} htmlFor="discountPrice" hint={t('onboarding.common.optional')}>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <FormInput
              id="discountPrice"
              type="number"
              value={product.discountPrice || ''}
              onChange={(e) => onChange({ discountPrice: parseFloat(e.target.value) || null })}
              className="pl-9"
              placeholder={t('onboarding.products.salePrice')}
              min={0}
              step={0.01}
            />
          </div>
        </FormField>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>{t('onboarding.products.featured')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('onboarding.products.featuredDesc')}
          </p>
        </div>
        <Switch
          checked={product.isFeatured}
          onCheckedChange={(checked) => onChange({ isFeatured: checked })}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">{t('onboarding.products.variants')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('onboarding.products.variantsDesc')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addVariant} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('onboarding.products.addVariant')}
          </Button>
        </div>

        {product.variants.length > 0 && (
          <div className="space-y-3">
            {product.variants.map((variant, idx) => (
              <div key={variant.id} className="p-4 rounded-lg border space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {t('onboarding.products.variant', { index: idx + 1 })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeVariant(variant.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <FormField label={t('onboarding.products.size')} htmlFor={`size-${variant.id}`}>
                    <FormInput
                      value={variant.size}
                      onChange={(e) => updateVariant(variant.id, { size: e.target.value })}
                      placeholder={t('onboarding.products.sizePlaceholder')}
                    />
                  </FormField>

                  <FormField label={t('onboarding.products.color')} htmlFor={`color-${variant.id}`}>
                    <FormInput
                      value={variant.color}
                      onChange={(e) => updateVariant(variant.id, { color: e.target.value })}
                      placeholder={t('onboarding.products.colorPlaceholder')}
                    />
                  </FormField>

                  <FormField label={t('onboarding.products.material')} htmlFor={`material-${variant.id}`}>
                    <FormInput
                      value={variant.material}
                      onChange={(e) => updateVariant(variant.id, { material: e.target.value })}
                      placeholder={t('onboarding.products.materialPlaceholder')}
                    />
                  </FormField>

                  <FormField label={t('onboarding.products.inventory')} htmlFor={`inv-${variant.id}`}>
                    <FormInput
                      type="number"
                      value={variant.inventory}
                      onChange={(e) => updateVariant(variant.id, { inventory: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          {t('onboarding.common.cancel')}
        </Button>
        <Button onClick={handleSave}>
          {t('onboarding.products.saveProduct')}
        </Button>
      </div>
    </div>
  );
}

export function ProductsSection() {
  const { t } = useTranslation();
  const { data, addProduct, removeProduct, markStepComplete } = useOnboardingStore();
  const [showForm, setShowForm] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

  const handleNext = () => {
    markStepComplete('products');
    return true;
  };

  const handleCreateProduct = () => {
    const newProduct: Product = {
      id: generateId(),
      title: '',
      description: '',
      category: '',
      subcategory: '',
      tags: [],
      basePrice: 0,
      discountPrice: null,
      image: null,
      variants: [],
      isActive: true,
      isFeatured: false,
    };
    setEditingProduct(newProduct);
    setShowForm(true);
  };

  const handleSaveProduct = () => {
    if (editingProduct) {
      addProduct(editingProduct);
      setEditingProduct(null);
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('onboarding.products.title')}
          </CardTitle>
          <CardDescription>{t('onboarding.products.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {showForm && editingProduct ? (
            <ProductForm
              product={editingProduct}
              onChange={(updates) => setEditingProduct({ ...editingProduct, ...updates })}
              onSave={handleSaveProduct}
              onCancel={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
            />
          ) : data.products.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">{t('onboarding.products.emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {t('onboarding.products.emptyDesc')}
              </p>
              <Button onClick={handleCreateProduct} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('onboarding.products.addFirst')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.products.products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{product.title}</h4>
                      {product.isFeatured && (
                        <Badge variant="secondary">{t('onboarding.products.featuredBadge')}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{product.category}</span>
                      <span>${product.basePrice.toFixed(2)}</span>
                      <span>{t('onboarding.common.variants', { count: product.variants.length })}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeProduct(product.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" onClick={handleCreateProduct} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                {t('onboarding.products.addAnother')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default ProductsSection;
