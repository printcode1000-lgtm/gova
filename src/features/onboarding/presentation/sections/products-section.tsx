'use client';

import * as React from 'react';
import { Package, Plus, X } from 'lucide-react';
import { useOnboardingStore } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { usePageSaveRegistration } from "@/features/page-save/ui";
import { buildPageSaveOperationDescription } from "@/features/page-save";
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import type { Product } from '@/features/onboarding/domain/types';
import { nextSellerId } from '@/features/onboarding/domain/next-id';
import { ProductForm } from './ProductForm';

function generateId() {
  return nextSellerId('prod');
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
      return true;
    }
    return false;
  };

  usePageSaveRegistration({
    id: "onboarding-product-form",
    label: "منتج جديد",
    returnPath: "/onboarding",
    enabled: showForm && Boolean(editingProduct),
    items: [
      {
        id: "onboarding-product-draft",
        label: "حفظ المنتج في القائمة",
        isDirty: true,
        canSave: Boolean(editingProduct),
        description: buildPageSaveOperationDescription(t, ["save"]),
      },
    ],
    isSaving: false,
    canSave: Boolean(editingProduct),
    save: async (selectedItemIds) => {
      if (!selectedItemIds.includes("onboarding-product-draft")) return true;
      return handleSaveProduct();
    },
  });

  return (
    <div id="onboarding.sections.products-section.div" className="space-y-6 animate-in fade-in duration-300">
      <Card id="onboarding.sections.products-section.card">
        <CardHeader id="onboarding.sections.products-section.card-header">
          <CardTitle id="onboarding.sections.products-section.card-title" className="flex items-center gap-2">
            <Package id="onboarding.sections.products-section.package" className="h-5 w-5" />
            {t('onboarding.products.title')}
          </CardTitle>
          <CardDescription id="onboarding.sections.products-section.card-description">{t('onboarding.products.description')}</CardDescription>
        </CardHeader>
        <CardContent id="onboarding.sections.products-section.card-content">
          {showForm && editingProduct ? (
            <ProductForm
              product={editingProduct}
              onChange={(updates) => setEditingProduct({ ...editingProduct, ...updates })}
              onCancel={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
            />
          ) : data.products.products.length === 0 ? (
            <div id="onboarding.sections.products-section.div.2" className="flex flex-col items-center justify-center py-12 text-center">
              <div id="onboarding.sections.products-section.div.3" className="rounded-full bg-muted p-4 mb-4">
                <Package id="onboarding.sections.products-section.package.2" className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 id="onboarding.sections.products-section.h3" className="font-medium mb-2">{t('onboarding.products.emptyTitle')}</h3>
              <p id="onboarding.sections.products-section.p" className="text-sm text-muted-foreground mb-4 max-w-sm">
                {t('onboarding.products.emptyDesc')}
              </p>
              <Button id="onboarding.sections.products-section.button" onClick={handleCreateProduct} className="gap-2">
                <Plus id="onboarding.sections.products-section.plus" className="h-4 w-4" />
                {t('onboarding.products.addFirst')}
              </Button>
            </div>
          ) : (
            <div id="onboarding.sections.products-section.div.4" className="space-y-4">
              {data.products.products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 rounded-lg border transition-colors"
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

              <Button id="onboarding.sections.products-section.button.2" variant="outline" onClick={handleCreateProduct} className="w-full gap-2">
                <Plus id="onboarding.sections.products-section.plus.2" className="h-4 w-4" />
                {t('onboarding.products.addAnother')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <StepNavigation id="onboarding.sections.products-section.step-navigation" onNext={handleNext} showSkip />
    </div>
  );
}

export default ProductsSection;
