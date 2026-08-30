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
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "onboarding.sections.products-section.div.5-M9VKT7", id: "onboarding.sections.products-section.div.5" })} id="onboarding.sections.products-section.div" className="space-y-6 animate-in fade-in duration-300">
      <Card ui={{ uid: "onboarding.sections.products-section.card.2-ck08dV", id: "onboarding.sections.products-section.card.2" }} id="onboarding.sections.products-section.card">
        <CardHeader ui={{ uid: "onboarding.sections.products-section.card-header.2-St1kBO", id: "onboarding.sections.products-section.card-header.2" }} id="onboarding.sections.products-section.card-header">
          <CardTitle ui={{ uid: "onboarding.sections.products-section.card-title.2-5v2Lmh", id: "onboarding.sections.products-section.card-title.2" }} id="onboarding.sections.products-section.card-title" className="flex items-center gap-2">
            <Package id="onboarding.sections.products-section.package" className="h-5 w-5" />
            {t('onboarding.products.title')}
          </CardTitle>
          <CardDescription ui={{ uid: "onboarding.sections.products-section.card-description.2-9DC3bL", id: "onboarding.sections.products-section.card-description.2" }} id="onboarding.sections.products-section.card-description">{t('onboarding.products.description')}</CardDescription>
        </CardHeader>
        <CardContent ui={{ uid: "onboarding.sections.products-section.card-content.2-zCRZ9J", id: "onboarding.sections.products-section.card-content.2" }} id="onboarding.sections.products-section.card-content">
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
            <div {...uiAttributes({ uid: "onboarding.sections.products-section.div.6-24w3WX", id: "onboarding.sections.products-section.div.6" })} id="onboarding.sections.products-section.div.2" className="flex flex-col items-center justify-center py-12 text-center">
              <div {...uiAttributes({ uid: "onboarding.sections.products-section.div.7-53QK0f", id: "onboarding.sections.products-section.div.7" })} id="onboarding.sections.products-section.div.3" className="rounded-full bg-muted p-4 mb-4">
                <Package id="onboarding.sections.products-section.package.2" className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 {...uiAttributes({ uid: "onboarding.sections.products-section.h3.2-Bmab6X", id: "onboarding.sections.products-section.h3.2" })} id="onboarding.sections.products-section.h3" className="font-medium mb-2">{t('onboarding.products.emptyTitle')}</h3>
              <p {...uiAttributes({ uid: "onboarding.sections.products-section.p.2-kZM9JC", id: "onboarding.sections.products-section.p.2" })} id="onboarding.sections.products-section.p" className="text-sm text-muted-foreground mb-4 max-w-sm">
                {t('onboarding.products.emptyDesc')}
              </p>
              <Button id="onboarding.sections.products-section.button" ui={{ uid: 'onboarding.products.add-first-q56BSN', id: 'onboarding.products.add-first', kind: 'action', action: 'create-product', part: 'empty-state' }} onClick={handleCreateProduct} className="gap-2">
                <Plus id="onboarding.sections.products-section.plus" className="h-4 w-4" />
                {t('onboarding.products.addFirst')}
              </Button>
            </div>
          ) : (
            <div {...uiAttributes({ uid: "onboarding.sections.products-section.div.8-Dmg0fS", id: "onboarding.sections.products-section.div.8" })} id="onboarding.sections.products-section.div.4" className="space-y-4">
              {data.products.products.map((product) => (
                <div
                  key={product.id} {...uiAttributes({ uid: "onboarding.sections.products-section.div.9-TC9lW2", id: "onboarding.sections.products-section.div.9" , instance: createOpaqueUiInstanceId("iter-f9b9f3d423", String(product.id))})}
                  className="flex items-center gap-4 p-4 rounded-lg border transition-colors"
                >
                  <div {...uiAttributes({ uid: "onboarding.sections.products-section.div.10-oV3OnQ", id: "onboarding.sections.products-section.div.10" , instance: createOpaqueUiInstanceId("iter-320d284b2f", String(product.id))})} className="flex-1 min-w-0">
                    <div {...uiAttributes({ uid: "onboarding.sections.products-section.div.11-fZd9jT", id: "onboarding.sections.products-section.div.11" , instance: createOpaqueUiInstanceId("iter-91156a3a2f", String(product.id))})} className="flex items-center gap-2">
                      <h4 {...uiAttributes({ uid: "onboarding.sections.products-section.h4-1TR4gv", id: "onboarding.sections.products-section.h4" , instance: createOpaqueUiInstanceId("iter-4424bf0cb6", String(product.id))})} className="font-medium truncate">{product.title}</h4>
                      {product.isFeatured && (
                        <Badge ui={{ uid: "onboarding.sections.products-section.badge-z7MtjP", id: "onboarding.sections.products-section.badge" , instance: createOpaqueUiInstanceId("iter-a3454b5573", String(product.id))}} variant="secondary">{t('onboarding.products.featuredBadge')}</Badge>
                      )}
                    </div>
                    <div {...uiAttributes({ uid: "onboarding.sections.products-section.div.12-RJWZG2", id: "onboarding.sections.products-section.div.12" , instance: createOpaqueUiInstanceId("iter-3a843f2f73", String(product.id))})} className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span {...uiAttributes({ uid: "onboarding.sections.products-section.span-b32guY", id: "onboarding.sections.products-section.span" , instance: createOpaqueUiInstanceId("iter-7f5e5cceb6", String(product.id))})}>{product.category}</span>
                      <span {...uiAttributes({ uid: "onboarding.sections.products-section.span.2-8RMZd6", id: "onboarding.sections.products-section.span.2" , instance: createOpaqueUiInstanceId("iter-e6f44e672d", String(product.id))})}>${product.basePrice.toFixed(2)}</span>
                      <span {...uiAttributes({ uid: "onboarding.sections.products-section.span.3-5g86JR", id: "onboarding.sections.products-section.span.3" , instance: createOpaqueUiInstanceId("iter-148fe19c05", String(product.id))})}>{t('onboarding.common.variants', { count: product.variants.length })}</span>
                    </div>
                  </div>
                  <Button ui={{ uid: "onboarding.sections.products-section.button.3-bPy26k", id: "onboarding.sections.products-section.button.3" , instance: createOpaqueUiInstanceId("iter-81af3d768f", String(product.id))}} variant="ghost" size="sm" onClick={() => removeProduct(product.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button id="onboarding.sections.products-section.button.2" ui={{ uid: 'onboarding.products.add-another-Y6W1yC', id: 'onboarding.products.add-another', kind: 'action', action: 'create-product', part: 'list-footer' }} variant="outline" onClick={handleCreateProduct} className="w-full gap-2">
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
