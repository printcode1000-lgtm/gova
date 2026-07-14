"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Store, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ui/product-card";
import { categoryService } from "@/features/categories";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { createProductCardViewModel } from "@/features/product-card";
import {
  productSearchApiService,
  type ProductSearchField,
  type ProductSearchFilters,
  type ProductSearchMode,
  type ProductSearchSort,
  type SellerSearchRequest,
  type SellerSearchSort,
} from "@/features/product-search";
import type { UserProfileRow } from "@/features/profile/services/profile-service.interface";
import { ProductSearchFieldSelector } from "./ProductSearchFieldSelector";

type Locale = "ar" | "en";

interface ProductSearchPanelProps {
  variant: "compact" | "full";
  mode?: ProductSearchMode;
  ownerUid?: string;
  fixedMainCategoryId?: string;
  fixedSubcategoryId?: string;
  includeDrafts?: boolean;
  locale?: Locale;
  initialQuery?: string;
  initialSort?: ProductSearchSort;
  onProductsChange?: (products: ProductRecord[]) => void;
  onLoadingChange?: (loading: boolean) => void;
}

function parseStoreName(user: UserProfileRow) {
  try {
    const details = JSON.parse(user.storeDetailsJson || "{}") as {
      storeName?: string;
    };
    return details.storeName || user.uid;
  } catch {
    return user.uid;
  }
}

function profileUrl(uid: string) {
  return `/profile?mode=preview&uid=${encodeURIComponent(uid)}`;
}

function defaultFieldKeys(fields: ProductSearchField[]) {
  const basic = fields
    .filter((field) => field.group === "basic")
    .map((field) => field.key);
  return basic.length > 0 ? basic : fields.map((field) => field.key);
}

export function ProductSearchPanel({
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
}: ProductSearchPanelProps) {
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
  const mainOptions = React.useMemo(
    () => categoryService.getProfileMainOptions(),
    [],
  );
  const mainCategory = mainOptions.find(
    (item) => String(item.id) === mainCategoryId,
  );
  const subOptions = React.useMemo(
    () =>
      mainCategory
        ? categoryService.getProfileSubOptions(
            mainCategory.id,
            mainCategory.isCollection,
          )
        : [],
    [mainCategory],
  );
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
      if (activeMode === "sellers") {
        const result = await productSearchApiService.searchSellers({
          q: query,
          mainCategoryId,
          subcategoryId,
          sort: sort === "name" ? "name" : "relevance",
          minRating: sellerMinRating,
          limit: isCompact ? 12 : 24,
        });
        setSellers(result.items);
        setTotal(result.total);
        return;
      }

      const result = await productSearchApiService.searchProducts({
        q: query,
        ownerUid,
        mainCategoryId,
        subcategoryId,
        fields: fieldKeys,
        sort: sort as ProductSearchSort,
        filters,
        includeDrafts,
        limit: isCompact ? 48 : 24,
      });
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
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={mainCategoryId}
          onChange={(event) => {
            setMainCategoryId(event.target.value);
            setSubcategoryId("");
            setFieldKeys([]);
          }}
          className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
        >
          <option value="">
            {locale === "ar" ? "اختر الفئة الرئيسية" : "Select main category"}
          </option>
          {mainOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {locale === "ar" ? item.nameAr : item.nameEn}
            </option>
          ))}
        </select>
        <select
          value={subcategoryId}
          disabled={!mainCategory}
          onChange={(event) => {
            setSubcategoryId(event.target.value);
            setFieldKeys([]);
          }}
          className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface disabled:opacity-60"
        >
          <option value="">
            {locale === "ar" ? "اختر الفئة الفرعية" : "Select subcategory"}
          </option>
          {subOptions.map((item) => (
            <option key={item.id} value={item.originalId ?? item.id}>
              {locale === "ar" ? item.nameAr : item.nameEn}
            </option>
          ))}
        </select>
      </div>
    );

  return (
    <section className={isCompact ? "space-y-3" : "space-y-5"}>
      {!isCompact ? (
        <div className="flex gap-2">
          {(["products", "sellers"] as ProductSearchMode[]).map((item) => (
            <button
              key={item}
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

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
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
            className="ps-9"
          />
          {query ? (
            <button
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
          <div className="grid gap-2 sm:grid-cols-[220px_180px_auto]">
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as ProductSearchSort)
              }
              className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
            >
              <option value="relevance">
                {locale === "ar" ? "افتراضي" : "Default"}
              </option>
              <option value="newest">
                {locale === "ar" ? "الأحدث" : "Newest"}
              </option>
              <option value="oldest">
                {locale === "ar" ? "الأقدم" : "Oldest"}
              </option>
              <option value="name">
                {locale === "ar" ? "الاسم" : "Name"}
              </option>
              <option value="price_asc">
                {locale === "ar" ? "الأقل سعرًا" : "Lowest price"}
              </option>
              <option value="price_desc">
                {locale === "ar" ? "الأعلى سعرًا" : "Highest price"}
              </option>
            </select>
            {hasRatingFilter ? (
              <select
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
                <option value="">
                  {locale === "ar" ? "أي تقييم" : "Any rating"}
                </option>
                <option value="4">
                  {locale === "ar" ? "4 فأعلى" : "4 and up"}
                </option>
                <option value="3">
                  {locale === "ar" ? "3 فأعلى" : "3 and up"}
                </option>
                <option value="2">
                  {locale === "ar" ? "2 فأعلى" : "2 and up"}
                </option>
                <option value="1">
                  {locale === "ar" ? "1 فأعلى" : "1 and up"}
                </option>
              </select>
            ) : null}
            {!isCompact ? (
              <label className="inline-flex items-center gap-2 text-xs text-on-surface">
                <input
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
        <div className="grid gap-2 sm:grid-cols-[220px_180px]">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SellerSearchSort)}
            className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
          >
            <option value="relevance">
              {locale === "ar" ? "الأكثر صلة" : "Relevance"}
            </option>
            <option value="name">{locale === "ar" ? "الاسم" : "Name"}</option>
          </select>
          <select
            value={sellerMinRating ?? ""}
            onChange={(event) =>
              setSellerMinRating(
                event.target.value as SellerSearchRequest["minRating"],
              )
            }
            className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface"
          >
            <option value="">
              {locale === "ar" ? "أي تقييم" : "Any rating"}
            </option>
            <option value="4">{locale === "ar" ? "4 فأعلى" : "4 and up"}</option>
            <option value="3">{locale === "ar" ? "3 فأعلى" : "3 and up"}</option>
            <option value="2">{locale === "ar" ? "2 فأعلى" : "2 and up"}</option>
            <option value="1">{locale === "ar" ? "1 فأعلى" : "1 and up"}</option>
          </select>
        </div>
      )}

      {!isCompact ? (
        <div className="text-xs text-on-surface-variant">
          {hasSearched
            ? locale === "ar"
              ? `عدد النتائج: ${total}`
              : `Results: ${total}`
            : locale === "ar"
              ? "اختر الفئة الرئيسية والفرعية ثم ابدأ البحث."
              : "Select category and subcategory, then search."}
        </div>
      ) : null}

      {!isCompact && activeMode === "products" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => {
            const card = createProductCardViewModel(product);
            return (
              <ProductCard
                key={product.id}
                card={card}
                variant="search"
                onOpen={() => router.push(card.href)}
              />
            );
          })}
        </div>
      ) : null}

      {!isCompact && activeMode === "sellers" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sellers.map((seller) => {
            const name = parseStoreName(seller);
            return (
              <button
                key={seller.uid}
                type="button"
                onClick={() => router.push(profileUrl(seller.uid))}
                className="rounded-lg border border-outline-variant bg-surface p-4 text-center"
              >
                <Store className="mx-auto mb-2 h-7 w-7 text-primary" />
                <p className="line-clamp-2 text-sm font-semibold text-on-surface">
                  {name}
                </p>
                <p className="mt-1 truncate text-[11px] text-on-surface-variant">
                  {seller.uid}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
