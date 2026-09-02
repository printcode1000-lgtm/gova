"use client";

import * as React from "react";
import { ChevronDown, Plus, Search, Star } from "lucide-react";
import { CategoryTabsStrip } from "@/shared/ui/category-tabs-strip";
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

export function ProfileProductsTabs({ id,
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
}: ProfileProductsTabsProps & { id?: string }) {
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
    return <ProfileProductsTabsLoading id={id} size="lg" />;
  }

  if (tabs.length === 0) {
    return (
      <section id={id} className="space-y-3">
        <ProfileProductsTabsEmpty id="profile-products-tabs-profile-products-tabs-profile-products-tabs-empty-eda110" label={labels.emptySpecialties} />
      </section>
    );
  }

  return (
    <section id={id} className="space-y-4">
      <CategoryTabsStrip id="profile-products-tabs-profile-products-tabs-category-tabs-strip-67783d"
        items={tabs}
        level="main"
        selectedId={selectedMainId}
        snapshotId={`profile-products-main-${mode}-${ownerUid}`}
        onSelect={onSelectMain}
      />

      {activeMain?.subTabs.length ? (
        <CategoryTabsStrip id="profile-products-tabs-profile-products-tabs-category-tabs-strip-c49da8"
          items={activeMain.subTabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            imageUrl: tab.imageUrl,
            count: tab.productCount,
          }))}
          level="sub"
          selectedId={selectedSubId}
          snapshotId={`profile-products-sub-${mode}-${ownerUid}`}
          onSelect={onSelectSub}
        />
      ) : null}

      {activeSubTab ? (
        <section id="features-profile-products-presentation-profileproductstabs-section-4-cucold" className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low/30">
          <button id="features-profile-products-presentation-profileproductstabs-button-5-9hq1of"
            type="button"
            aria-expanded={isSearchOpen}
            onClick={() => setIsSearchOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-on-surface"
          >
            <span id="features-profile-products-presentation-profileproductstabs-text-6-n9fe03" className="inline-flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              {labels.searchTitle}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isSearchOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isSearchOpen ? (
            <div id="features-profile-products-presentation-profileproductstabs-div-7-ggokra" className="border-t border-outline-variant p-3">
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
            <div id="features-profile-products-presentation-profileproductstabs-div-8-wbfjxa" className="border-t border-outline-variant px-3 py-2">
              <button id="features-profile-products-presentation-profileproductstabs-button-9-q06bmx"
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
                <span id="features-profile-products-presentation-profileproductstabs-text-10-q5wi8f" className="rounded-full bg-black/10 px-1.5 text-[10px]">
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

      <div id="features-profile-products-presentation-profileproductstabs-div-11-n2561e" className="min-h-[160px]">
        {productsLoading ? (
          <ProfileProductsTabsLoading id="profile-products-tabs-profile-products-tabs-profile-products-tabs-loading-bbff5d" size="sm" />
        ) : visibleProducts.length === 0 ? (
          <ProfileProductsTabsEmpty id="profile-products-tabs-profile-products-tabs-profile-products-tabs-empty-5d1a5a"
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
        <div id="features-profile-products-presentation-profileproductstabs-div-12-mijnqv" className="flex justify-end">
          <button id="features-profile-products-presentation-profileproductstabs-button-13-rlai7m"
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
