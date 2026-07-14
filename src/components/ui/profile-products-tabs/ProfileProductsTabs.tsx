'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Package,
  Plus,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProductCard } from '@/components/ui/product-card';
import { ProductSearchPanel } from '@/components/ui/product-search';
import type { ProductRecord } from '@/features/product/entities/product.entity';
import {
  createProductCardViewModel,
  type ProductCardAction,
} from '@/features/product-card';
import {
  isPharmacyProfileBucket,
  PharmacyNestedTabs,
} from '@/features/pharmacy-profile-catalog/components/PharmacyNestedTabs';
import type {
  ProfileProductsFilters,
  ProfileProductsMainTab,
  ProfileProductsSubTab,
  ProfileProductsTabsMode,
} from '@/features/profile-products';

export interface ProfileProductsTabsLabels {
  title: string;
  hint?: string;
  searchPlaceholder: string;
  emptySpecialties: string;
  emptyProducts: string;
  view: string;
  edit: string;
  delete: string;
  addProduct: string;
  addFeatured: string;
  removeFeatured: string;
  sortNewest: string;
  sortOldest: string;
  sortName: string;
}

interface ProfileProductsTabsProps {
  ownerUid?: string;
  mode: ProfileProductsTabsMode;
  tabs: ProfileProductsMainTab[];
  selectedMainId: string;
  selectedSubId: string;
  products: ProductRecord[];
  activeSubTab: ProfileProductsSubTab | null;
  filters: ProfileProductsFilters;
  featuredProductIds?: string[];
  isLoadingTabs?: boolean;
  isLoadingProducts?: boolean;
  labels: ProfileProductsTabsLabels;
  onSelectMain: (id: string) => void;
  onSelectSub: (id: string) => void;
  onFiltersChange: (filters: Partial<ProfileProductsFilters>) => void;
  onViewProduct: (product: ProductRecord) => void;
  onEditProduct?: (product: ProductRecord) => void;
  onDeleteProduct?: (product: ProductRecord) => void;
  onAddProduct?: (categoryId: string, subcategoryId: string) => void;
  onToggleFeatured?: (product: ProductRecord) => void;
  onRefreshProducts?: () => void | Promise<void>;
}

export function ProfileProductsTabs({
  mode,
  ownerUid = '',
  tabs,
  selectedMainId,
  selectedSubId,
  products,
  activeSubTab,
  filters,
  featuredProductIds = [],
  isLoadingTabs = false,
  isLoadingProducts = false,
  labels,
  onSelectMain,
  onSelectSub,
  onFiltersChange,
  onViewProduct,
  onEditProduct,
  onDeleteProduct,
  onAddProduct,
  onToggleFeatured,
  onRefreshProducts,
}: ProfileProductsTabsProps) {
  const activeMain = tabs.find((tab) => tab.id === selectedMainId) ?? tabs[0];
  const showManagement = mode === 'edit';
  const isPharmacyBucket = isPharmacyProfileBucket(activeSubTab);
  const [pharmacyFilteredProducts, setPharmacyFilteredProducts] =
    React.useState<ProductRecord[]>(products);
  const [searchFilteredProducts, setSearchFilteredProducts] =
    React.useState<ProductRecord[]>(products);

  React.useEffect(() => {
    if (!isPharmacyBucket) {
      setPharmacyFilteredProducts(products);
    }
  }, [isPharmacyBucket, products]);

  React.useEffect(() => {
    setSearchFilteredProducts(products);
  }, [products, activeSubTab?.id]);

  const sourceProducts = searchFilteredProducts;
  const visibleProducts = isPharmacyBucket ? pharmacyFilteredProducts : sourceProducts;

  if (isLoadingTabs) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <section className="space-y-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <Package className="h-4 w-4" />
            {labels.title}
          </h3>
          {labels.hint ? (
            <p className="mt-1 text-xs text-on-surface-variant">{labels.hint}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-dashed border-outline-variant py-8 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">{labels.emptySpecialties}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <Package className="h-4 w-4" />
            {labels.title}
          </h3>
          {labels.hint ? (
            <p className="mt-1 text-xs text-on-surface-variant">{labels.hint}</p>
          ) : null}
        </div>
        {showManagement && activeSubTab && onAddProduct ? (
          <button
            type="button"
            onClick={() => onAddProduct(activeSubTab.categoryId, activeSubTab.productSubcategoryId)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {labels.addProduct}
          </button>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectMain(tab.id)}
            className={`flex h-12 min-w-fit items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
              tab.id === selectedMainId
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant bg-surface text-on-surface hover:border-primary/50'
            }`}
          >
            <span className="relative h-7 w-7 overflow-hidden rounded-md bg-surface-bright">
              {tab.imageUrl ? (
                <Image src={tab.imageUrl} alt={tab.label} fill className="object-cover" />
              ) : null}
            </span>
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeMain?.subTabs.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeMain.subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectSub(tab.id)}
              className={`flex h-10 min-w-fit items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition ${
                tab.id === selectedSubId
                  ? 'border-tertiary bg-tertiary text-on-tertiary'
                  : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-tertiary/50'
              }`}
            >
              <span className="relative h-6 w-6 overflow-hidden rounded bg-surface-bright">
                {tab.imageUrl ? (
                  <Image src={tab.imageUrl} alt={tab.label} fill className="object-cover" />
                ) : null}
              </span>
              <span className="whitespace-nowrap">{tab.label}</span>
              {typeof tab.productCount === 'number' ? (
                <span className="rounded-full bg-black/10 px-1.5 text-[10px]">
                  {tab.productCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {activeSubTab ? (
        <ProductSearchPanel
          variant="compact"
          ownerUid={ownerUid}
          fixedMainCategoryId={activeSubTab.categoryId}
          fixedSubcategoryId={activeSubTab.productSubcategoryId}
          includeDrafts={mode === 'edit'}
          locale={labels.searchPlaceholder.includes('Search') ? 'en' : 'ar'}
          onProductsChange={setSearchFilteredProducts}
        />
      ) : null}

      {isPharmacyBucket && ownerUid ? (
        <PharmacyNestedTabs
          uid={ownerUid}
          mode={mode === 'edit' ? 'edit' : 'preview'}
          products={sourceProducts}
          onFilteredProductsChange={setPharmacyFilteredProducts}
          onRefreshProducts={onRefreshProducts}
        />
      ) : null}

      <div className="min-h-[160px]">
        {isLoadingProducts ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-outline-variant py-8 text-center">
            <Package className="mx-auto mb-2 h-7 w-7 text-on-surface-variant" />
            <p className="text-xs text-on-surface-variant">{labels.emptyProducts}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleProducts.map((product) => {
              const featured = featuredProductIds.includes(product.id);
              const card = createProductCardViewModel(product);
              const actions: ProductCardAction[] = [
                {
                  kind: 'view',
                  label: labels.view,
                  onClick: () => onViewProduct(product),
                },
              ];
              if (showManagement && onToggleFeatured) {
                actions.push({
                  kind: 'toggleFeatured',
                  label: featured ? labels.removeFeatured : labels.addFeatured,
                  active: featured,
                  tone: 'tertiary',
                  onClick: () => onToggleFeatured(product),
                });
              }
              if (showManagement && onEditProduct) {
                actions.push({
                  kind: 'edit',
                  label: labels.edit,
                  onClick: () => onEditProduct(product),
                });
              }
              if (showManagement && onDeleteProduct) {
                actions.push({
                  kind: 'delete',
                  label: labels.delete,
                  tone: 'danger',
                  onClick: () => onDeleteProduct(product),
                });
              }
              return (
                <ProductCard
                  key={product.id}
                  card={card}
                  variant={showManagement ? 'profile-edit' : 'profile-preview'}
                  actions={actions}
                  onOpen={() => onViewProduct(product)}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProfileProductsTabs;
