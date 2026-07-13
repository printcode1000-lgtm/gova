'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Eye,
  Package,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { ProductRecord } from '@/features/product/entities/product.entity';
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
}

function productTitle(product: ProductRecord): string {
  return product.data.fields['mainData.name'] || 'Product';
}

function productPrice(product: ProductRecord): string {
  const current = product.data.fields['price.current'];
  return current ? current : product.data.fields['price.label'] || '';
}

function pharmacyCategoryId(product: ProductRecord): string {
  return product.data.fields['pharmacyCatalog.categoryId'] || '';
}

function pharmacySubcategoryId(product: ProductRecord): string {
  return product.data.fields['pharmacyCatalog.subcategoryId'] || '';
}

function pharmacyCategoryName(product: ProductRecord): string {
  return product.data.fields['pharmacyCatalog.categoryNameAr'] || 'الصيدلية';
}

function pharmacySubcategoryName(product: ProductRecord): string {
  return product.data.fields['pharmacyCatalog.subcategoryNameAr'] || 'منتجات';
}

export function ProfileProductsTabs({
  mode,
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
}: ProfileProductsTabsProps) {
  const activeMain = tabs.find((tab) => tab.id === selectedMainId) ?? tabs[0];
  const showManagement = mode === 'edit';
  const isPharmacyBucket =
    activeSubTab?.categoryId === '20' && activeSubTab.productSubcategoryId === '204';
  const pharmacyCategories = React.useMemo(() => {
    if (!isPharmacyBucket) return [];
    const map = new Map<string, { id: string; label: string; count: number }>();
    for (const product of products) {
      const id = pharmacyCategoryId(product);
      if (!id) continue;
      const current = map.get(id);
      map.set(id, {
        id,
        label: current?.label || pharmacyCategoryName(product),
        count: (current?.count ?? 0) + 1,
      });
    }
    return [...map.values()];
  }, [isPharmacyBucket, products]);
  const [selectedPharmacyCategoryId, setSelectedPharmacyCategoryId] = React.useState('');
  const [selectedPharmacySubcategoryId, setSelectedPharmacySubcategoryId] = React.useState('');

  React.useEffect(() => {
    if (!pharmacyCategories.length) {
      setSelectedPharmacyCategoryId('');
      setSelectedPharmacySubcategoryId('');
      return;
    }
    if (!pharmacyCategories.some((item) => item.id === selectedPharmacyCategoryId)) {
      setSelectedPharmacyCategoryId(pharmacyCategories[0]!.id);
    }
  }, [pharmacyCategories, selectedPharmacyCategoryId]);

  const pharmacySubcategories = React.useMemo(() => {
    if (!selectedPharmacyCategoryId) return [];
    const map = new Map<string, { id: string; label: string; count: number }>();
    for (const product of products) {
      if (pharmacyCategoryId(product) !== selectedPharmacyCategoryId) continue;
      const id = pharmacySubcategoryId(product);
      if (!id) continue;
      const current = map.get(id);
      map.set(id, {
        id,
        label: current?.label || pharmacySubcategoryName(product),
        count: (current?.count ?? 0) + 1,
      });
    }
    return [...map.values()];
  }, [products, selectedPharmacyCategoryId]);

  React.useEffect(() => {
    if (!pharmacySubcategories.length) {
      setSelectedPharmacySubcategoryId('');
      return;
    }
    if (!pharmacySubcategories.some((item) => item.id === selectedPharmacySubcategoryId)) {
      setSelectedPharmacySubcategoryId(pharmacySubcategories[0]!.id);
    }
  }, [pharmacySubcategories, selectedPharmacySubcategoryId]);

  const visibleProducts = React.useMemo(() => {
    if (!isPharmacyBucket || !selectedPharmacySubcategoryId) return products;
    return products.filter(
      (product) => pharmacySubcategoryId(product) === selectedPharmacySubcategoryId,
    );
  }, [isPharmacyBucket, products, selectedPharmacySubcategoryId]);

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

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            value={filters.searchText}
            onChange={(event) => onFiltersChange({ searchText: event.target.value })}
            placeholder={labels.searchPlaceholder}
            className="ps-9"
          />
          {filters.searchText ? (
            <button
              type="button"
              onClick={() => onFiltersChange({ searchText: '' })}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <select
          value={filters.sortBy}
          onChange={(event) =>
            onFiltersChange({ sortBy: event.target.value as ProfileProductsFilters['sortBy'] })
          }
          className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
        >
          <option value="newest">{labels.sortNewest}</option>
          <option value="oldest">{labels.sortOldest}</option>
          <option value="name">{labels.sortName}</option>
        </select>
      </div>

      {isPharmacyBucket && pharmacyCategories.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-low p-2">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {pharmacyCategories.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPharmacyCategoryId(tab.id)}
                className={`h-9 min-w-fit rounded-md border px-3 text-[11px] font-semibold transition ${
                  tab.id === selectedPharmacyCategoryId
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant bg-surface text-on-surface hover:border-primary/50'
                }`}
              >
                {tab.label}
                <span className="ms-2 rounded-full bg-black/10 px-1.5 text-[10px]">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {pharmacySubcategories.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPharmacySubcategoryId(tab.id)}
                className={`h-8 min-w-fit rounded-md border px-3 text-[11px] font-semibold transition ${
                  tab.id === selectedPharmacySubcategoryId
                    ? 'border-tertiary bg-tertiary text-on-tertiary'
                    : 'border-outline-variant bg-surface text-on-surface hover:border-tertiary/50'
                }`}
              >
                {tab.label}
                <span className="ms-2 rounded-full bg-black/10 px-1.5 text-[10px]">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
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
              const title = productTitle(product);
              const imageUrl = product.data.images[0]?.url;
              const featured = featuredProductIds.includes(product.id);
              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-lg border border-outline-variant bg-surface transition hover:border-primary/70 hover:shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => onViewProduct(product)}
                    className="block w-full text-start"
                  >
                    <div className="relative aspect-square bg-surface-bright">
                      {imageUrl ? (
                        <Image src={imageUrl} alt={title} fill className="object-cover" />
                      ) : (
                        <Package className="absolute inset-0 m-auto h-8 w-8 text-on-surface-variant" />
                      )}
                    </div>
                    <div className="space-y-1 p-2">
                      <p className="line-clamp-2 min-h-[32px] text-xs font-semibold text-on-surface">
                        {title}
                      </p>
                      {productPrice(product) ? (
                        <p className="text-[11px] text-primary">{productPrice(product)}</p>
                      ) : null}
                    </div>
                  </button>
                  <div
                    className={`grid gap-1 border-t border-outline-variant/50 p-1 ${
                      showManagement ? 'grid-cols-4' : 'grid-cols-1'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onViewProduct(product)}
                      className="flex h-8 items-center justify-center rounded-md bg-surface-container-low text-on-surface transition hover:bg-primary hover:text-on-primary"
                      title={labels.view}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {showManagement && onToggleFeatured ? (
                      <button
                        type="button"
                        onClick={() => onToggleFeatured(product)}
                        className={`flex h-8 items-center justify-center rounded-md transition ${
                          featured
                            ? 'bg-tertiary text-on-tertiary'
                            : 'bg-surface-container-low text-on-surface hover:bg-tertiary hover:text-on-tertiary'
                        }`}
                        title={featured ? labels.removeFeatured : labels.addFeatured}
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    ) : null}
                    {showManagement && onEditProduct ? (
                      <button
                        type="button"
                        onClick={() => onEditProduct(product)}
                        className="flex h-8 items-center justify-center rounded-md bg-surface-container-low text-on-surface transition hover:bg-primary hover:text-on-primary"
                        title={labels.edit}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : null}
                    {showManagement && onDeleteProduct ? (
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(product)}
                        className="flex h-8 items-center justify-center rounded-md bg-surface-container-low text-destructive transition hover:bg-destructive hover:text-on-destructive"
                        title={labels.delete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProfileProductsTabs;
