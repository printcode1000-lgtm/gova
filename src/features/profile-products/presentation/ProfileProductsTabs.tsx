"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronDown, Plus, Search, Star } from "lucide-react";
import { ProductSearchPanel } from "@/features/product-search/ui";
import type { ProductRecord } from "@asol/product-core";
import {
  isPharmacyProfileBucket,
  PharmacyNestedTabs,
} from "@/features/pharmacy-profile-catalog/ui";
import type {
  ProfileProductsFilters,
  ProfileProductsMainTab,
  ProfileProductsSubTab,
  ProfileProductsTabsMode,
} from "@/features/profile-products";
import { ProfileProductsGrid } from "./ProfileProductsGrid";
import {
  ProfileProductsTabsEmpty,
  ProfileProductsTabsLoading,
} from "./ProfileProductsTabsStates";

export interface ProfileProductsTabsLabels {
  title: string;
  hint?: string;
  searchTitle: string;
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
  featuredOnly: string;
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
  featuredProducts?: ProductRecord[];
  isLoadingFeaturedProducts?: boolean;
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
  ownerUid = "",
  tabs,
  selectedMainId,
  selectedSubId,
  products,
  activeSubTab,
  filters,
  featuredProductIds = [],
  featuredProducts = [],
  isLoadingFeaturedProducts = false,
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
  const showManagement = mode === "edit";
  const isPharmacyBucket = isPharmacyProfileBucket(activeSubTab);
  const [pharmacyFilteredProducts, setPharmacyFilteredProducts] =
    React.useState<ProductRecord[]>(products);
  const [searchFilteredProducts, setSearchFilteredProducts] =
    React.useState<ProductRecord[]>(products);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = React.useState(false);

  React.useEffect(() => {
    if (!isPharmacyBucket) {
      setPharmacyFilteredProducts(products);
    }
  }, [isPharmacyBucket, products]);

  React.useEffect(() => {
    setSearchFilteredProducts(products);
  }, [products, activeSubTab?.id]);

  React.useEffect(() => {
    setIsSearchOpen(false);
  }, [activeSubTab?.id]);

  const sourceProducts = showFeaturedOnly
    ? featuredProducts
    : searchFilteredProducts;
  const visibleProducts =
    isPharmacyBucket && !showFeaturedOnly
      ? pharmacyFilteredProducts
      : sourceProducts;
  const productsLoading =
    isLoadingProducts || (showFeaturedOnly && isLoadingFeaturedProducts);

  if (isLoadingTabs) {
    return <ProfileProductsTabsLoading size="lg" />;
  }

  if (tabs.length === 0) {
    return (
      <section className="space-y-3">
        <ProfileProductsTabsEmpty label={labels.emptySpecialties} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div
        data-snapshot-scroll
        data-snapshot-id={`profile-products-main-${mode}-${ownerUid}`}
        className="flex snap-x snap-mandatory scroll-smooth gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectMain(tab.id)}
            className={`flex h-12 min-w-fit shrink-0 snap-center snap-always items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
              tab.id === selectedMainId
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface text-on-surface"
            }`}
          >
            <span className="relative h-7 w-7 overflow-hidden rounded-md bg-surface-bright">
              {tab.imageUrl ? (
                <Image
                  src={tab.imageUrl}
                  alt={tab.label}
                  fill
                  className="object-cover"
                />
              ) : null}
            </span>
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeMain?.subTabs.length ? (
        <div
          data-snapshot-scroll
          data-snapshot-id={`profile-products-sub-${mode}-${ownerUid}`}
          className="flex snap-x snap-mandatory scroll-smooth gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {activeMain.subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectSub(tab.id)}
              className={`flex h-10 min-w-fit shrink-0 snap-center snap-always items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition ${
                tab.id === selectedSubId
                  ? "border-tertiary bg-tertiary text-on-tertiary"
                  : "border-outline-variant bg-surface-container-low text-on-surface"
              }`}
            >
              <span className="relative h-6 w-6 overflow-hidden rounded bg-surface-bright">
                {tab.imageUrl ? (
                  <Image
                    src={tab.imageUrl}
                    alt={tab.label}
                    fill
                    className="object-cover"
                  />
                ) : null}
              </span>
              <span className="whitespace-nowrap">{tab.label}</span>
              {typeof tab.productCount === "number" ? (
                <span className="rounded-full bg-black/10 px-1.5 text-[10px]">
                  {tab.productCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {activeSubTab ? (
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low/30">
          <button
            type="button"
            aria-expanded={isSearchOpen}
            onClick={() => setIsSearchOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-on-surface"
          >
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              {labels.searchTitle}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isSearchOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isSearchOpen ? (
            <div className="border-t border-outline-variant p-3">
              <ProductSearchPanel
                variant="compact"
                ownerUid={ownerUid}
                fixedMainCategoryId={activeSubTab.categoryId}
                fixedSubcategoryId={activeSubTab.productSubcategoryId}
                includeDrafts={mode === "edit"}
                locale={labels.searchPlaceholder.includes("Search") ? "en" : "ar"}
                onProductsChange={setSearchFilteredProducts}
              />
            </div>
          ) : null}
          {showManagement ? (
            <div className="border-t border-outline-variant px-3 py-2">
              <button
                type="button"
                aria-pressed={showFeaturedOnly}
                onClick={() => setShowFeaturedOnly((current) => !current)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
                  showFeaturedOnly
                    ? "border-tertiary bg-tertiary text-on-tertiary"
                    : "border-outline-variant bg-surface text-on-surface"
                }`}
              >
                <Star className={`h-4 w-4 ${showFeaturedOnly ? "fill-current" : ""}`} />
                {labels.featuredOnly}
                <span className="rounded-full bg-black/10 px-1.5 text-[10px]">
                  {featuredProductIds.length}
                </span>
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isPharmacyBucket && ownerUid ? (
        <PharmacyNestedTabs
          uid={ownerUid}
          mode={mode === "edit" ? "edit" : "preview"}
          products={sourceProducts}
          onFilteredProductsChange={setPharmacyFilteredProducts}
          onRefreshProducts={onRefreshProducts}
        />
      ) : null}

      <div className="min-h-[160px]">
        {productsLoading ? (
          <ProfileProductsTabsLoading size="sm" />
        ) : visibleProducts.length === 0 ? (
          <ProfileProductsTabsEmpty
            label={labels.emptyProducts}
            iconSize="h-7 w-7"
            textSize="text-xs"
          />
        ) : (
          <ProfileProductsGrid
            featuredProductIds={featuredProductIds}
            labels={labels}
            products={visibleProducts}
            showManagement={showManagement}
            onDeleteProduct={onDeleteProduct}
            onEditProduct={onEditProduct}
            onToggleFeatured={onToggleFeatured}
            onViewProduct={onViewProduct}
          />
        )}
      </div>

      {showManagement && activeSubTab && onAddProduct ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              onAddProduct(
                activeSubTab.categoryId,
                activeSubTab.productSubcategoryId,
              )
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary transition"
          >
            <Plus className="h-4 w-4" />
            {labels.addProduct}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default ProfileProductsTabs;
