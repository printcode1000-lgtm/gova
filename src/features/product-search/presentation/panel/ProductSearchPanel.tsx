"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/shared/ui/input";
import { CategoryTabsStrip } from "@/shared/ui/category-tabs-strip";
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
import type { UserProfileRow } from "@/features/profile";
import { ProductSearchFieldSelector } from "./ProductSearchFieldSelector";
import { ProductSearchResults } from "./ProductSearchResults";
import { defaultFieldKeys } from "./product-search-fields";
import type { ProductSearchPanelProps } from "./product-search-panel.types";
import { runProductSearchPanelRequest } from "./product-search-panel-request";
import { buildProductSearchCategoryTabs } from "./product-search-category-tabs";


export function ProductSearchPanel({ id,
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
  const [subcategoryId, setSubcategoryId] =
    React.useState(fixedSubcategoryId);
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
  const [sellers, setSellers] = React.useState<UserProfileRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);

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
        id='product-search-presentation-panel-productsearchpanel-div-1-gwaoyg'
        className="space-y-2"
      >
        <CategoryTabsStrip id="product-search-panel-product-search-panel-category-tabs-strip-c527b6"
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
          <CategoryTabsStrip id="product-search-panel-product-search-panel-category-tabs-strip-02bb31"
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

  return (
    <section id={id} className={isCompact ? "space-y-3" : "space-y-5"}>
      {!isCompact ? (
        <div id='product-search-presentation-panel-productsearchpanel-div-3-3vt1bi' className="flex gap-2">
          {(["products", "sellers"] as ProductSearchMode[]).map((item) => (
            <button key={item}
              type="button"
              onClick={() => setActiveMode(item)}
              className={`h-10 rounded-lg border px-4 text-sm font-semibold ${
                activeMode === item
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface text-on-surface"
              }`}
            >
              {item === "products"
                ? locale === "ar"
                  ? "المنتجات"
                  : "Products"
                : locale === "ar"
                  ? "البائعون"
                  : "Sellers"}
            </button>
          ))}
        </div>
      ) : null}

      {categoryControls}

      <div id='product-search-presentation-panel-productsearchpanel-div-4-cgyfzm' className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div id='product-search-presentation-panel-productsearchpanel-div-5-4zdjvh' className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input id="product-search-panel-product-search-panel-input-adf566"
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
            <button id='product-search-presentation-panel-productsearchpanel-button-6-xekvwl'
              type="button"
              onClick={() => setQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <button id='product-search-presentation-panel-productsearchpanel-button-7-cqgpqc'
          type="button"
          disabled={!canSearch || isLoading}
          onClick={() => void runSearch()}
          className="h-10 rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary disabled:opacity-60"
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

      {activeMode === "products" ? (
        <>
          <ProductSearchFieldSelector
            fields={availableFields}
            selectedKeys={fieldKeys}
            locale={locale}
            onChange={setFieldKeys}
          />
          <div id='product-search-presentation-panel-productsearchpanel-div-8-so8ca4' className="grid gap-2 sm:grid-cols-[220px_180px_auto]">
            <select id='product-search-presentation-panel-productsearchpanel-select-9-m7j5v1'
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as ProductSearchSort)
              }
              className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
            >
              <option id="product-search-presentation-panel-productsearchpanel-option-10-oonbuk" value="relevance">
                {locale === "ar" ? "افتراضي" : "Default"}
              </option>
              <option id="product-search-presentation-panel-productsearchpanel-option-11-csfcqx" value="newest">
                {locale === "ar" ? "الأحدث" : "Newest"}
              </option>
              <option id="product-search-presentation-panel-productsearchpanel-option-12-ihxcyi" value="oldest">
                {locale === "ar" ? "الأقدم" : "Oldest"}
              </option>
              <option id="product-search-presentation-panel-productsearchpanel-option-13-u2t8de" value="name">
                {locale === "ar" ? "الاسم" : "Name"}
              </option>
              <option id="product-search-presentation-panel-productsearchpanel-option-14-fv0hep" value="price_asc">
                {locale === "ar" ? "الأقل سعرًا" : "Lowest price"}
              </option>
              <option id="product-search-presentation-panel-productsearchpanel-option-15-fmzepw" value="price_desc">
                {locale === "ar" ? "الأعلى سعرًا" : "Highest price"}
              </option>
            </select>
            {hasRatingFilter ? (
              <select id='product-search-presentation-panel-productsearchpanel-select-16-0xybkk'
                value={filters.minRating ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    minRating: event.target
                      .value as ProductSearchFilters["minRating"],
                  }))
                }
                className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
              >
                <option id="product-search-presentation-panel-productsearchpanel-option-17-pnarlj" value="">
                  {locale === "ar" ? "أي تقييم" : "Any rating"}
                </option>
                <option id="product-search-presentation-panel-productsearchpanel-option-18-cqmy9e" value="4">
                  {locale === "ar" ? "4 فأعلى" : "4 and up"}
                </option>
                <option id="product-search-presentation-panel-productsearchpanel-option-19-azp0f2" value="3">
                  {locale === "ar" ? "3 فأعلى" : "3 and up"}
                </option>
                <option id="product-search-presentation-panel-productsearchpanel-option-20-hx1ysj" value="2">
                  {locale === "ar" ? "2 فأعلى" : "2 and up"}
                </option>
                <option id="product-search-presentation-panel-productsearchpanel-option-21-xrjc8o" value="1">
                  {locale === "ar" ? "1 فأعلى" : "1 and up"}
                </option>
              </select>
            ) : null}
            {!isCompact ? (
              <label id='product-search-presentation-panel-productsearchpanel-label-22-xrxlql' className="inline-flex items-center gap-2 text-xs text-on-surface">
                <input id='product-search-presentation-panel-productsearchpanel-input-23-jtt8qv'
                  type="checkbox"
                  checked={Boolean(filters.availableOnly)}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      availableOnly: event.target.checked,
                    }))
                  }
                />
                {locale === "ar" ? "المتاح فقط" : "Available only"}
              </label>
            ) : null}
          </div>
        </>
      ) : (
        <div id='product-search-presentation-panel-productsearchpanel-div-24-o5mpun' className="grid gap-2 sm:grid-cols-[220px_180px]">
          <select id='product-search-presentation-panel-productsearchpanel-select-25-r9zhv3'
            value={sort}
            onChange={(event) => setSort(event.target.value as SellerSearchSort)}
            className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
          >
            <option id="product-search-presentation-panel-productsearchpanel-option-26-znk2sz" value="relevance">
              {locale === "ar" ? "الأكثر صلة" : "Relevance"}
            </option>
            <option id="product-search-presentation-panel-productsearchpanel-option-27-wtfryf" value="name">{locale === "ar" ? "الاسم" : "Name"}</option>
          </select>
          <select id='product-search-presentation-panel-productsearchpanel-select-28-ut5apt'
            value={sellerMinRating ?? ""}
            onChange={(event) =>
              setSellerMinRating(
                event.target.value as SellerSearchRequest["minRating"],
              )
            }
            className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
          >
            <option id="product-search-presentation-panel-productsearchpanel-option-29-7h1io5" value="">
              {locale === "ar" ? "أي تقييم" : "Any rating"}
            </option>
            <option id="product-search-presentation-panel-productsearchpanel-option-30-aohmas" value="4">{locale === "ar" ? "4 فأعلى" : "4 and up"}</option>
            <option id="product-search-presentation-panel-productsearchpanel-option-31-rohsur" value="3">{locale === "ar" ? "3 فأعلى" : "3 and up"}</option>
            <option id="product-search-presentation-panel-productsearchpanel-option-32-iiqtup" value="2">{locale === "ar" ? "2 فأعلى" : "2 and up"}</option>
            <option id="product-search-presentation-panel-productsearchpanel-option-33-kak4lj" value="1">{locale === "ar" ? "1 فأعلى" : "1 and up"}</option>
          </select>
        </div>
      )}

      {!isCompact ? (
        <div id='product-search-presentation-panel-productsearchpanel-div-34-2zqrum' className="text-xs text-on-surface-variant">
          {hasSearched
            ? locale === "ar"
              ? `عدد النتائج: ${total}`
              : `Results: ${total}`
            : locale === "ar"
              ? "اختر الفئة الرئيسية والفرعية ثم ابدأ البحث."
              : "Select category and subcategory, then search."}
        </div>
      ) : null}

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
