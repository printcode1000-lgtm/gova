"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LayoutGrid,
  ListFilter,
  ScanSearch,
  Search,
  X,
} from "lucide-react";

import { Input } from "@/shared/ui/input";
import {
  CATEGORY_TABS_PAIR_CLASS,
  CategoryTabsStrip,
} from "@/shared/ui/category-tabs-strip";
import type { ProductRecord } from "@/features/product";
import {
  productSearchApiService,
  type ProductSearchField,
  type ProductSearchFilters,
  type ProductSearchMode,
  type ProductSearchSort,
  type SellerSearchRequest,
  type SellerSearchSort,
} from "@/features/product-search";
import type { ProfileDirectoryEntry } from "@/features/profile";
import { ProductSearchFieldSelector } from "./ProductSearchFieldSelector";
import { ProductSearchResults } from "./ProductSearchResults";
import { defaultFieldKeys } from "./product-search-fields";
import type { ProductSearchPanelProps } from "./product-search-panel.types";
import { runProductSearchPanelRequest } from "./product-search-panel-request";
import { buildProductSearchCategoryTabs } from "./product-search-category-tabs";

export function ProductSearchPanel({
  id,
  variant,
  mode = "products",
  ownerUid = "",
  fixedMainCategoryId = "",
  fixedSubcategoryId = "",
  includeDrafts = false,
  locale = "ar",
  initialQuery = "",
  initialSort = "relevance",
  onProductsChange,
  onLoadingChange,
}: ProductSearchPanelProps & { id?: string }) {
  const router = useRouter();
  const [activeMode, setActiveMode] = React.useState<ProductSearchMode>(mode);
  const [query, setQuery] = React.useState(initialQuery);
  const [mainCategoryId, setMainCategoryId] =
    React.useState(fixedMainCategoryId);
  const [subcategoryId, setSubcategoryId] = React.useState(fixedSubcategoryId);
  const [availableFields, setAvailableFields] = React.useState<
    ProductSearchField[]
  >([]);
  const [fieldKeys, setFieldKeys] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState<ProductSearchSort | SellerSearchSort>(
    initialSort,
  );
  const [filters, setFilters] = React.useState<ProductSearchFilters>({});
  const [sellerMinRating, setSellerMinRating] =
    React.useState<SellerSearchRequest["minRating"]>("");
  const [products, setProducts] = React.useState<ProductRecord[]>([]);
  const [sellers, setSellers] = React.useState<ProfileDirectoryEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [openSection, setOpenSection] = React.useState<
    "categories" | "scope" | "order" | null
  >(null);

  const isCompact = variant === "compact";
  const categoryTabs = React.useMemo(
    () => buildProductSearchCategoryTabs(locale === "ar" ? "ar" : "en"),
    [locale],
  );
  const mainCategory = categoryTabs.find((tab) => tab.id === mainCategoryId);
  const subOptions = mainCategory?.subTabs ?? [];
  const canSearch = Boolean(mainCategoryId && subcategoryId);
  const hasRatingFilter = availableFields.some(
    (field) => field.key === "ratingValue",
  );

  React.useEffect(() => {
    setMainCategoryId(fixedMainCategoryId);
    setSubcategoryId(fixedSubcategoryId);
  }, [fixedMainCategoryId, fixedSubcategoryId]);

  React.useEffect(() => {
    if (!mainCategoryId || !subcategoryId) {
      setAvailableFields([]);
      setFieldKeys([]);
      return;
    }

    let cancelled = false;
    productSearchApiService
      .getFields(mainCategoryId, subcategoryId)
      .then((result) => {
        if (cancelled) return;
        setAvailableFields(result.fields);
        setFieldKeys((current) => {
          const allowed = new Set(result.fields.map((field) => field.key));
          const next = current.filter((key) => allowed.has(key));
          return next.length > 0 ? next : defaultFieldKeys(result.fields);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableFields([]);
          setFieldKeys([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mainCategoryId, subcategoryId]);

  const runSearch = React.useCallback(async () => {
    if (!canSearch) return;
    setIsLoading(true);
    onLoadingChange?.(true);
    setHasSearched(true);
    try {
      const result = await runProductSearchPanelRequest({
        activeMode,
        query,
        ownerUid,
        mainCategoryId,
        subcategoryId,
        fieldKeys,
        sort,
        filters,
        includeDrafts,
        sellerMinRating,
        isCompact,
      });
      if (result.mode === "sellers") {
        setSellers(result.items);
        setTotal(result.total);
        return;
      }
      setProducts(result.items);
      setTotal(result.total);
      onProductsChange?.(result.items);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }, [
    activeMode,
    canSearch,
    fieldKeys,
    filters,
    includeDrafts,
    isCompact,
    mainCategoryId,
    onLoadingChange,
    onProductsChange,
    ownerUid,
    query,
    sellerMinRating,
    sort,
    subcategoryId,
  ]);

  React.useEffect(() => {
    if (isCompact && canSearch) void runSearch();
  }, [canSearch, isCompact, runSearch]);

  const categoryControls =
    fixedMainCategoryId && fixedSubcategoryId ? null : (
      <div
        id="product-search-presentation-panel-productsearchpanel-div-1-gwaoyg"
        className={CATEGORY_TABS_PAIR_CLASS}
      >
        <CategoryTabsStrip
          id="product-search-panel-product-search-panel-category-tabs-strip-c527b6"
          items={categoryTabs}
          level="main"
          selectedId={mainCategoryId}
          onSelect={(id) => {
            setMainCategoryId(id);
            setSubcategoryId("");
            setFieldKeys([]);
          }}
        />
        {subOptions.length > 0 ? (
          <CategoryTabsStrip
            id="product-search-panel-product-search-panel-category-tabs-strip-02bb31"
            items={subOptions}
            level="sub"
            selectedId={subcategoryId}
            onSelect={(id) => {
              setSubcategoryId(id);
              setFieldKeys([]);
            }}
          />
        ) : null}
      </div>
    );

  const toggleSection = (section: "categories" | "scope" | "order") => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const searchScopeControls = (
    <>
      <div
        id="product-search-presentation-panel-productsearchpanel-div-3-3vt1bi"
        className="flex gap-2"
      >
        <button
          id="product-search-presentation-panel-productsearchpanel-services-button-srv001"
          type="button"
          onClick={() => setActiveMode("products")}
          className={`h-10 rounded-lg border px-4 text-sm font-semibold ${
            activeMode === "products"
              ? "border-primary bg-primary text-on-primary"
              : "border-outline-variant bg-surface text-on-surface"
          }`}
        >
          {locale === "ar" ? "الخدمات" : "Services"}
        </button>
        <button
          id="product-search-presentation-panel-productsearchpanel-service-providers-button-prv002"
          type="button"
          onClick={() => setActiveMode("sellers")}
          className={`h-10 rounded-lg border px-4 text-sm font-semibold ${
            activeMode === "sellers"
              ? "border-primary bg-primary text-on-primary"
              : "border-outline-variant bg-surface text-on-surface"
          }`}
        >
          {locale === "ar" ? "مقدمي الخدمات" : "Service providers"}
        </button>
      </div>
      {activeMode === "products" ? (
        <ProductSearchFieldSelector
          fields={availableFields}
          selectedKeys={fieldKeys}
          locale={locale}
          onChange={setFieldKeys}
        />
      ) : null}
    </>
  );

  const resultsOrderControls =
    activeMode === "products" ? (
      <div
        id="product-search-presentation-panel-productsearchpanel-div-8-so8ca4"
        className="flex flex-col gap-[6px]"
      >
        <label
          id="product-search-presentation-panel-productsearchpanel-sort-label-srt001"
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[6px] text-xs font-medium text-on-surface"
        >
          {locale === "ar" ? "ترتيب النتائج" : "Sort results"}
          <select
            id="product-search-presentation-panel-productsearchpanel-select-9-m7j5v1"
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as ProductSearchSort)
            }
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
          >
            <option
              id="product-search-presentation-panel-productsearchpanel-option-10-oonbuk"
              value="relevance"
            >
              {locale === "ar" ? "افتراضي" : "Default"}
            </option>
            <option
              id="product-search-presentation-panel-productsearchpanel-option-11-csfcqx"
              value="newest"
            >
              {locale === "ar" ? "الأحدث" : "Newest"}
            </option>
            <option
              id="product-search-presentation-panel-productsearchpanel-option-12-ihxcyi"
              value="oldest"
            >
              {locale === "ar" ? "الأقدم" : "Oldest"}
            </option>
            <option
              id="product-search-presentation-panel-productsearchpanel-option-13-u2t8de"
              value="name"
            >
              {locale === "ar" ? "الاسم" : "Name"}
            </option>
            <option
              id="product-search-presentation-panel-productsearchpanel-option-14-fv0hep"
              value="price_asc"
            >
              {locale === "ar" ? "الأقل سعرًا" : "Lowest price"}
            </option>
            <option
              id="product-search-presentation-panel-productsearchpanel-option-15-fmzepw"
              value="price_desc"
            >
              {locale === "ar" ? "الأعلى سعرًا" : "Highest price"}
            </option>
          </select>
        </label>
        {hasRatingFilter ? (
          <label
            id="product-search-presentation-panel-productsearchpanel-rating-label-rat001"
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[6px] text-xs font-medium text-on-surface"
          >
            {locale === "ar" ? "الحد الأدنى للتقييم" : "Minimum rating"}
            <select
              id="product-search-presentation-panel-productsearchpanel-select-16-0xybkk"
              value={filters.minRating ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  minRating: event.target
                    .value as ProductSearchFilters["minRating"],
                }))
              }
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
            >
              <option
                id="product-search-presentation-panel-productsearchpanel-option-17-pnarlj"
                value=""
              >
                {locale === "ar" ? "أي تقييم" : "Any rating"}
              </option>
              <option
                id="product-search-presentation-panel-productsearchpanel-option-18-cqmy9e"
                value="4"
              >
                {locale === "ar" ? "4 فأعلى" : "4 and up"}
              </option>
              <option
                id="product-search-presentation-panel-productsearchpanel-option-19-azp0f2"
                value="3"
              >
                {locale === "ar" ? "3 فأعلى" : "3 and up"}
              </option>
              <option
                id="product-search-presentation-panel-productsearchpanel-option-20-hx1ysj"
                value="2"
              >
                {locale === "ar" ? "2 فأعلى" : "2 and up"}
              </option>
              <option
                id="product-search-presentation-panel-productsearchpanel-option-21-xrjc8o"
                value="1"
              >
                {locale === "ar" ? "1 فأعلى" : "1 and up"}
              </option>
            </select>
          </label>
        ) : null}
      </div>
    ) : (
      <div
        id="product-search-presentation-panel-productsearchpanel-div-24-o5mpun"
        className="flex flex-col gap-[6px]"
      >
        <label
          id="product-search-presentation-panel-productsearchpanel-seller-rating-label-slr001"
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[6px] text-xs font-medium text-on-surface"
        >
          {locale === "ar"
            ? "الحد الأدنى لتقييم مقدم الخدمة"
            : "Minimum provider rating"}
          <select
            id="product-search-presentation-panel-productsearchpanel-select-28-ut5apt"
            value={sellerMinRating ?? ""}
            onChange={(event) =>
              setSellerMinRating(
                event.target.value as SellerSearchRequest["minRating"],
              )
            }
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
          >
            <option
              id="product-search-presentation-panel-productsearchpanel-option-29-7h1io5"
              value=""
            >
              {locale === "ar" ? "أي تقييم" : "Any rating"}
            </option>
            <option
              id="product-search-presentation-panel-productsearchpanel-option-30-aohmas"
              value="4"
            >
              {locale === "ar" ? "4 فأعلى" : "4 and up"}
            </option>
            <option
              id="product-search-presentation-panel-productsearchpanel-option-31-rohsur"
              value="3"
            >
              {locale === "ar" ? "3 فأعلى" : "3 and up"}
            </option>
            <option
              id="product-search-presentation-panel-productsearchpanel-option-32-iiqtup"
              value="2"
            >
              {locale === "ar" ? "2 فأعلى" : "2 and up"}
            </option>
            <option
              id="product-search-presentation-panel-productsearchpanel-option-33-kak4lj"
              value="1"
            >
              {locale === "ar" ? "1 فأعلى" : "1 and up"}
            </option>
          </select>
        </label>
      </div>
    );

  const queryControls = (
    <div
      id="product-search-presentation-panel-productsearchpanel-div-4-cgyfzm"
      className="grid gap-2 sm:grid-cols-[1fr_auto]"
    >
      <div
        id="product-search-presentation-panel-productsearchpanel-div-5-4zdjvh"
        className="relative"
      >
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          id="product-search-panel-product-search-panel-input-adf566"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void runSearch();
          }}
          placeholder={
            locale === "ar"
              ? "ابحث بعد اختيار الفئة"
              : "Search after selecting category"
          }
          className="asol-input-decorated-start"
        />
        {query ? (
          <button
            id="product-search-presentation-panel-productsearchpanel-button-6-xekvwl"
            type="button"
            onClick={() => setQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <button
        id="product-search-presentation-panel-productsearchpanel-button-7-cqgpqc"
        type="button"
        disabled={!canSearch || isLoading}
        onClick={() => void runSearch()}
        className="h-10 rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary active:opacity-80 disabled:opacity-60"
      >
        {isLoading
          ? locale === "ar"
            ? "جار البحث"
            : "Searching"
          : locale === "ar"
            ? "بحث"
            : "Search"}
      </button>
    </div>
  );

  return (
    <section id={id} className={isCompact ? "space-y-3" : "space-y-[6px]"}>
      {!isCompact ? (
        <>
          <div
            id="features-product-search-presentation-productsearchpagecontent-categories-block-srch00"
            className="flex flex-col gap-[6px]"
          >
            <section
              id="product-search-presentation-panel-productsearchpanel-categories-section-acc001"
              className="overflow-hidden rounded-lg border border-primary/30 bg-primary/10"
            >
              <div
                id="features-product-search-presentation-productsearchpagecontent-categories-title-row-srch01"
                className="flex items-center"
              >
                <h2
                  id="features-product-search-presentation-productsearchpagecontent-categories-title-heading-srch02"
                  className="w-full"
                >
                  <button
                    id="product-search-presentation-panel-productsearchpanel-categories-toggle-acc002"
                    type="button"
                    aria-expanded={openSection === "categories"}
                    aria-controls="product-search-presentation-panel-productsearchpanel-categories-content-acc003"
                    onClick={() => toggleSection("categories")}
                    className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-start text-[12px] font-semibold text-primary active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <LayoutGrid
                      className="h-5 w-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span id="product-search-presentation-panel-productsearchpanel-categories-toggle-text-acc010">
                      {locale === "ar" ? "اختر التصنيف" : "Choose category"}
                    </span>
                    <span
                      id="features-product-search-presentation-productsearchpagecontent-categories-title-line-srch03"
                      className="title-line-contact min-w-0 flex-1 text-primary"
                      style={{
                        background:
                          "linear-gradient(90deg, currentColor 0, color-mix(in srgb, currentColor 40%, transparent) 50%, transparent 100%)",
                        opacity: 0.6,
                      }}
                      aria-hidden="true"
                    />
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        openSection === "categories" ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                </h2>
              </div>
              <div
                id="product-search-presentation-panel-productsearchpanel-categories-content-acc003"
                hidden={openSection !== "categories"}
                className="border-t border-primary/30 p-[6px]"
              >
                {categoryControls}
              </div>
            </section>

            <section
              id="product-search-presentation-panel-productsearchpanel-scope-section-acc004"
              className="overflow-hidden rounded-lg border border-secondary/30 bg-secondary/10"
            >
              <div
                id="product-search-presentation-panel-productsearchpanel-search-scope-title-row-d4e5f6"
                className="flex items-center"
              >
                <h2
                  id="product-search-presentation-panel-productsearchpanel-search-scope-heading-g7h8i9"
                  className="w-full"
                >
                  <button
                    id="product-search-presentation-panel-productsearchpanel-scope-toggle-acc005"
                    type="button"
                    aria-expanded={openSection === "scope"}
                    aria-controls="product-search-presentation-panel-productsearchpanel-scope-content-acc006"
                    onClick={() => toggleSection("scope")}
                    className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-start text-[12px] font-semibold text-primary active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ScanSearch
                      className="h-5 w-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span id="product-search-presentation-panel-productsearchpanel-scope-toggle-text-acc011">
                      {locale === "ar"
                        ? "اختر مجال البحث"
                        : "Choose search scope"}
                    </span>
                    <span
                      id="product-search-presentation-panel-productsearchpanel-search-scope-line-j0k1l2"
                      className="title-line-contact min-w-0 flex-1 text-primary"
                      style={{
                        background:
                          "linear-gradient(90deg, currentColor 0, color-mix(in srgb, currentColor 40%, transparent) 50%, transparent 100%)",
                        opacity: 0.6,
                      }}
                      aria-hidden="true"
                    />
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        openSection === "scope" ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                </h2>
              </div>
              <div
                id="product-search-presentation-panel-productsearchpanel-scope-content-acc006"
                hidden={openSection !== "scope"}
                className="flex flex-col gap-[6px] border-t border-secondary/30 p-[6px]"
              >
                {searchScopeControls}
              </div>
            </section>

            <section
              id="product-search-presentation-panel-productsearchpanel-order-section-acc007"
              className="overflow-hidden rounded-lg border border-tertiary/30 bg-tertiary/10"
            >
              <div
                id="product-search-presentation-panel-productsearchpanel-results-order-title-row-rso002"
                className="flex items-center"
              >
                <h2
                  id="product-search-presentation-panel-productsearchpanel-results-order-heading-rso003"
                  className="w-full"
                >
                  <button
                    id="product-search-presentation-panel-productsearchpanel-order-toggle-acc008"
                    type="button"
                    aria-expanded={openSection === "order"}
                    aria-controls="product-search-presentation-panel-productsearchpanel-order-content-acc009"
                    onClick={() => toggleSection("order")}
                    className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-start text-[12px] font-semibold text-primary active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ListFilter
                      className="h-5 w-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span id="product-search-presentation-panel-productsearchpanel-order-toggle-text-acc012">
                      {locale === "ar"
                        ? "ترتيب نتائج البحث"
                        : "Order search results"}
                    </span>
                    <span
                      id="product-search-presentation-panel-productsearchpanel-results-order-line-rso004"
                      className="title-line-contact min-w-0 flex-1 text-primary"
                      style={{
                        background:
                          "linear-gradient(90deg, currentColor 0, color-mix(in srgb, currentColor 40%, transparent) 50%, transparent 100%)",
                        opacity: 0.6,
                      }}
                      aria-hidden="true"
                    />
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        openSection === "order" ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                </h2>
              </div>
              <div
                id="product-search-presentation-panel-productsearchpanel-order-content-acc009"
                hidden={openSection !== "order"}
                className="flex flex-col gap-[6px] border-t border-tertiary/30 p-[6px]"
              >
                {resultsOrderControls}
              </div>
            </section>
          </div>
          {queryControls}
        </>
      ) : (
        <div
          id="product-search-presentation-panel-productsearchpanel-pre-search-group-rsg001"
          className="flex flex-col gap-[6px]"
        >
          {categoryControls}
          {resultsOrderControls}
          {queryControls}
        </div>
      )}

      <ProductSearchResults
        activeMode={activeMode}
        isCompact={isCompact}
        products={products}
        sellers={sellers}
        onOpen={(href) => router.push(href)}
      />
    </section>
  );
}
