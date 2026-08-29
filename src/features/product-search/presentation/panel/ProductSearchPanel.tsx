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
import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";

const SEARCH_MAIN_CATEGORY_UI: UiDescriptor = { uid: "search-main-category-76NCg1", id: "search-main-category", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "search-main-category" } };
const SEARCH_SUBCATEGORY_UI: UiDescriptor = { uid: "search-subcategory-HX5YZy", id: "search-subcategory", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "search-subcategory" } };

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
      <div {...uiAttributes({ uid: "product-search.panel.product-search-panel.div.8-1wc1iR", id: "product-search.panel.product-search-panel.div.8" })}
        id="product-search.panel.product-search-panel.div"
        className="space-y-2"
      >
        <CategoryTabsStrip
          items={categoryTabs}
          level="main"
          selectedId={mainCategoryId}
          itemUi={SEARCH_MAIN_CATEGORY_UI}
          onSelect={(id) => {
            setMainCategoryId(id);
            setSubcategoryId("");
            setFieldKeys([]);
          }}
        />
        {subOptions.length > 0 ? (
          <CategoryTabsStrip
            items={subOptions}
            level="sub"
            selectedId={subcategoryId}
            itemUi={SEARCH_SUBCATEGORY_UI}
            onSelect={(id) => {
              setSubcategoryId(id);
              setFieldKeys([]);
            }}
          />
        ) : null}
      </div>
    );

  return (
    <section {...uiAttributes({ uid: "product-search.panel.product-search-panel.section-GxYzs2", id: "product-search.panel.product-search-panel.section" })} id={id} className={isCompact ? "space-y-3" : "space-y-5"}>
      {!isCompact ? (
        <div {...uiAttributes({ uid: "product-search.panel.product-search-panel.div.9-kNIW8L", id: "product-search.panel.product-search-panel.div.9" })} id="product-search.panel.product-search-panel.div.2" className="flex gap-2">
          {(["products", "sellers"] as ProductSearchMode[]).map((item) => (
            <button key={item}
              {...uiAttributes({ uid: "search-sellers-mode-GBOEa3", id: "search-sellers-mode", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "search-sellers-mode" } })}
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

      <div {...uiAttributes({ uid: "product-search.panel.product-search-panel.div.10-ICHDV8", id: "product-search.panel.product-search-panel.div.10" })} id="product-search.panel.product-search-panel.div.3" className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div {...uiAttributes({ uid: "product-search.panel.product-search-panel.div.11-xa7bSu", id: "product-search.panel.product-search-panel.div.11" })} id="product-search.panel.product-search-panel.div.4" className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input ui={{ uid: "product-search.query-hAl4PO", id: "product-search.query", kind: "field", part: "search", interaction: { type: "type", valueContract: "search-term" }, simulation: { kind: "field", id: "search-query" }}}
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
            <button {...uiAttributes({ uid: "product-search.panel.product-search-panel.button.3-SCCi0i", id: "product-search.panel.product-search-panel.button.3" })} id="product-search.panel.product-search-panel.button"
              type="button"
              onClick={() => setQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <button {...uiAttributes({ uid: "product-search.panel.product-search-panel.button.4-VTTmL2", id: "product-search.panel.product-search-panel.button.4" })} id="product-search.panel.product-search-panel.button.2"
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
          <div {...uiAttributes({ uid: "product-search.panel.product-search-panel.div.12-Dkf4QK", id: "product-search.panel.product-search-panel.div.12" })} id="product-search.panel.product-search-panel.div.5" className="grid gap-2 sm:grid-cols-[220px_180px_auto]">
            <select {...uiAttributes({ uid: "product-search.panel.product-search-panel.select.5-Ddjk05", id: "product-search.panel.product-search-panel.select.5" })} id="product-search.panel.product-search-panel.select"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as ProductSearchSort)
              }
              className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
            >
              <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option-64c6XA", id: "product-search.panel.product-search-panel.option" })} value="relevance">
                {locale === "ar" ? "افتراضي" : "Default"}
              </option>
              <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.2-88TT4i", id: "product-search.panel.product-search-panel.option.2" })} value="newest">
                {locale === "ar" ? "الأحدث" : "Newest"}
              </option>
              <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.3-5PE1WL", id: "product-search.panel.product-search-panel.option.3" })} value="oldest">
                {locale === "ar" ? "الأقدم" : "Oldest"}
              </option>
              <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.4-Ul5FVG", id: "product-search.panel.product-search-panel.option.4" })} value="name">
                {locale === "ar" ? "الاسم" : "Name"}
              </option>
              <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.5-Pq4I3u", id: "product-search.panel.product-search-panel.option.5" })} value="price_asc">
                {locale === "ar" ? "الأقل سعرًا" : "Lowest price"}
              </option>
              <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.6-RG5U4A", id: "product-search.panel.product-search-panel.option.6" })} value="price_desc">
                {locale === "ar" ? "الأعلى سعرًا" : "Highest price"}
              </option>
            </select>
            {hasRatingFilter ? (
              <select {...uiAttributes({ uid: "product-search.panel.product-search-panel.select.6-9AR6ny", id: "product-search.panel.product-search-panel.select.6" })} id="product-search.panel.product-search-panel.select.2"
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
                <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.7-8Bt3Sv", id: "product-search.panel.product-search-panel.option.7" })} value="">
                  {locale === "ar" ? "أي تقييم" : "Any rating"}
                </option>
                <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.8-wO4XZq", id: "product-search.panel.product-search-panel.option.8" })} value="4">
                  {locale === "ar" ? "4 فأعلى" : "4 and up"}
                </option>
                <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.9-n0EJuk", id: "product-search.panel.product-search-panel.option.9" })} value="3">
                  {locale === "ar" ? "3 فأعلى" : "3 and up"}
                </option>
                <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.10-U7DWSF", id: "product-search.panel.product-search-panel.option.10" })} value="2">
                  {locale === "ar" ? "2 فأعلى" : "2 and up"}
                </option>
                <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.11-5mIf4Q", id: "product-search.panel.product-search-panel.option.11" })} value="1">
                  {locale === "ar" ? "1 فأعلى" : "1 and up"}
                </option>
              </select>
            ) : null}
            {!isCompact ? (
              <label {...uiAttributes({ uid: "product-search.panel.product-search-panel.label.2-PIYm1P", id: "product-search.panel.product-search-panel.label.2" })} id="product-search.panel.product-search-panel.label" className="inline-flex items-center gap-2 text-xs text-on-surface">
                <input {...uiAttributes({ uid: "product-search.panel.product-search-panel.input.2-WL7TdJ", id: "product-search.panel.product-search-panel.input.2" })} id="product-search.panel.product-search-panel.input"
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
        <div {...uiAttributes({ uid: "product-search.panel.product-search-panel.div.13-ZUE5f7", id: "product-search.panel.product-search-panel.div.13" })} id="product-search.panel.product-search-panel.div.6" className="grid gap-2 sm:grid-cols-[220px_180px]">
          <select {...uiAttributes({ uid: "product-search.panel.product-search-panel.select.7-L5h1L9", id: "product-search.panel.product-search-panel.select.7" })} id="product-search.panel.product-search-panel.select.3"
            value={sort}
            onChange={(event) => setSort(event.target.value as SellerSearchSort)}
            className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
          >
            <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.12-H9czWt", id: "product-search.panel.product-search-panel.option.12" })} value="relevance">
              {locale === "ar" ? "الأكثر صلة" : "Relevance"}
            </option>
            <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.13-w0Ip52", id: "product-search.panel.product-search-panel.option.13" })} value="name">{locale === "ar" ? "الاسم" : "Name"}</option>
          </select>
          <select {...uiAttributes({ uid: "product-search.panel.product-search-panel.select.8-Awa4X9", id: "product-search.panel.product-search-panel.select.8" })} id="product-search.panel.product-search-panel.select.4"
            value={sellerMinRating ?? ""}
            onChange={(event) =>
              setSellerMinRating(
                event.target.value as SellerSearchRequest["minRating"],
              )
            }
            className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
          >
            <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.14-3RzfN6", id: "product-search.panel.product-search-panel.option.14" })} value="">
              {locale === "ar" ? "أي تقييم" : "Any rating"}
            </option>
            <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.15-BNbA1Y", id: "product-search.panel.product-search-panel.option.15" })} value="4">{locale === "ar" ? "4 فأعلى" : "4 and up"}</option>
            <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.16-Cbi0yY", id: "product-search.panel.product-search-panel.option.16" })} value="3">{locale === "ar" ? "3 فأعلى" : "3 and up"}</option>
            <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.17-YA45BQ", id: "product-search.panel.product-search-panel.option.17" })} value="2">{locale === "ar" ? "2 فأعلى" : "2 and up"}</option>
            <option {...uiAttributes({ uid: "product-search.panel.product-search-panel.option.18-lI9OeL", id: "product-search.panel.product-search-panel.option.18" })} value="1">{locale === "ar" ? "1 فأعلى" : "1 and up"}</option>
          </select>
        </div>
      )}

      {!isCompact ? (
        <div {...uiAttributes({ uid: "product-search.panel.product-search-panel.div.14-qK35aT", id: "product-search.panel.product-search-panel.div.14" })} id="product-search.panel.product-search-panel.div.7" className="text-xs text-on-surface-variant">
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
