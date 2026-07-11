"use client";

import * as React from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GOVA_API_ROUTES, govaApi } from "@/core/api";
import {
  PRODUCT_DEMO_FIELDS,
  PRODUCT_DEMO_IMAGES,
  ProductComponentsRenderer,
} from "@/components/product/ProductComponentsRenderer";
import type { ProductMode } from "@/components/product/product-component.types";
import type { ProductFieldValues } from "@/features/product/entities/product.entity";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import {
  CATEGORY_CONSTANTS,
  categoryService,
  type DeveloperCatalogCategory,
  type DeveloperCatalogSubcategory,
  type MainCategoryOption,
  type SubcategoryOption,
} from "@/features/categories";
import { ProductImagesStyleEditor } from "@/components/ui/images/ProductImagesStyleEditor";
import { ProductRatingStyleEditor } from "@/components/ui/rating/ProductRatingStyleEditor";
import { ProductPriceStyleEditor } from "@/components/ui/price/ProductPriceStyleEditor";
import { ProductOrderStyleEditor } from "@/components/ui/order/ProductOrderStyleEditor";
import { ProductMainDataStyleEditor } from "@/components/ui/main-data/ProductMainDataStyleEditor";
import { ProductSpecificationsStyleEditor } from "@/components/ui/specifications/ProductSpecificationsStyleEditor";
import { ProductVehicleSpecsStyleEditor } from "@/components/ui/vehicle-specs/ProductVehicleSpecsStyleEditor";
import { ProductPropertySpecsStyleEditor } from "@/components/ui/property-specs/ProductPropertySpecsStyleEditor";
import { ProductPharmacySpecsStyleEditor } from "@/components/ui/pharmacy-specs/ProductPharmacySpecsStyleEditor";
import {
  createDefaultProductStyleComponents,
  normalizeProductStyleComponents,
  toProductStyleComponents,
  type ProductStyleSettings,
  type ProductStyleSettingsComponents,
} from "@/components/ui/product-style-settings";

const MEDICAL_SERVICES_CATEGORY_ID = CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID;
const DOCTOR_APPOINTMENT_VALUE = CATEGORY_CONSTANTS.DOCTOR_APPOINTMENT_VALUE;

type DetailRecord = Record<string, unknown>;

interface ProductStyleResponse {
  exists: boolean;
  settings: ProductStyleSettings | null;
}

function bilingualLabel(titleAr: string, titleEn: string) {
  return titleEn ? `${titleAr} - ${titleEn}` : titleAr;
}

function formatDetailValue(value: unknown) {
  if (value === null) return "null";
  if (value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function SelectedRecordDetails({
  title,
  record,
}: {
  title: string;
  record: DetailRecord | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background/70">
      <h3 className="border-b px-4 py-3 text-sm font-bold">{title}</h3>
      {record ? (
        <dl className="divide-y text-sm">
          {Object.entries(record).map(([key, value]) => (
            <div
              key={key}
              className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(130px,0.4fr)_1fr] sm:gap-4"
            >
              <dt className="font-mono text-xs font-semibold text-primary" dir="ltr">
                {key}
              </dt>
              <dd className="break-all whitespace-pre-wrap text-muted-foreground" dir="auto">
                {formatDetailValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          لم يتم الاختيار بعد.
        </p>
      )}
    </div>
  );
}

export function DeveloperCategorySelector() {
  const catalog = categoryService.getDeveloperCatalog();
  const categories: readonly DeveloperCatalogCategory[] = catalog.categories;
  const subcategories: readonly DeveloperCatalogSubcategory[] = catalog.subcategories;
  const [mainCategoryId, setMainCategoryId] = React.useState("");
  const [subcategoryId, setSubcategoryId] = React.useState("");
  const [components, setComponents] =
    React.useState<ProductStyleSettingsComponents>(
      createDefaultProductStyleComponents,
    );
  const [isStyleLoaded, setIsStyleLoaded] = React.useState(false);
  const [styleStatus, setStyleStatus] = React.useState<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("idle");
  const [previewMode, setPreviewMode] = React.useState<ProductMode>("view");
  const [previewFields, setPreviewFields] = React.useState<ProductFieldValues>({
    ...PRODUCT_DEMO_FIELDS,
  });
  const [previewImages, setPreviewImages] =
    React.useState<StoredImage[]>(PRODUCT_DEMO_IMAGES);

  const isLoading = false;
  const loadError = false;

  React.useEffect(() => {
    setPreviewFields(previewMode === "new" ? {} : { ...PRODUCT_DEMO_FIELDS });
    setPreviewImages(previewMode === "new" ? [] : [...PRODUCT_DEMO_IMAGES]);
  }, [previewMode, mainCategoryId, subcategoryId]);

  const mainCategoryOptions = React.useMemo<MainCategoryOption[]>(() => {
    const options = new Map<string, MainCategoryOption>();

    categories.forEach((category) => {
      if (category.collection === null) {
        options.set(`category-${category.id}`, {
          id: category.id,
          titleAr: category.titleAr,
          titleEn: category.titleEn,
          isCollection: false,
          order: category.order,
        });
        return;
      }

      const key = `collection-${category.collection}`;
      if (!options.has(key)) {
        options.set(key, {
          id: category.collection,
          titleAr: category.collectionAr ?? "",
          titleEn: category.collectionEn ?? "",
          isCollection: true,
          order: category.order,
        });
      }
    });

    return [...options.values()].sort(
      (left, right) => (left.order ?? Infinity) - (right.order ?? Infinity),
    );
  }, [categories]);

  const selectedMainCategory = mainCategoryOptions.find(
    (category) => category.id.toString() === mainCategoryId,
  );

  const subcategoryOptions = React.useMemo<SubcategoryOption[]>(() => {
    if (!selectedMainCategory) return [];

    if (selectedMainCategory.isCollection) {
      return categories
        .filter((category) => category.collection === selectedMainCategory.id)
        .sort(
          (left, right) => (left.order ?? Infinity) - (right.order ?? Infinity),
        )
        .map((category) => ({
          value: category.id.toString(),
          titleAr: category.titleAr,
          titleEn: category.titleEn,
        }));
    }

    const items = subcategories.filter(
      (subcategory) => subcategory.categoryId === selectedMainCategory.id,
    );

    if (selectedMainCategory.id === MEDICAL_SERVICES_CATEGORY_ID) {
      const visibleItems = items.filter(
        (subcategory) => subcategory.subCollection !== 0,
      );
      const hasDoctorAppointmentItems = items.some(
        (subcategory) => subcategory.subCollection === 0,
      );

      return [
        ...(hasDoctorAppointmentItems
          ? [
              {
                value: DOCTOR_APPOINTMENT_VALUE,
                titleAr: "كشف طبي",
                titleEn: "Doctor Appointment",
              },
            ]
          : []),
        ...visibleItems.map((subcategory) => ({
          value: subcategory.originalId.toString(),
          titleAr: subcategory.titleAr,
          titleEn: subcategory.titleEn,
        })),
      ];
    }

    return items.map((subcategory) => ({
      value: subcategory.originalId.toString(),
      titleAr: subcategory.titleAr,
      titleEn: subcategory.titleEn,
    }));
  }, [categories, selectedMainCategory, subcategories]);

  const selectedMainDetails = React.useMemo<DetailRecord | null>(() => {
    if (!selectedMainCategory) return null;

    if (!selectedMainCategory.isCollection) {
      const category = categories.find(
        (item) =>
          item.id === selectedMainCategory.id && item.collection === null,
      );
      return category ? (category as unknown as DetailRecord) : null;
    }

    const collectionItems = categories.filter(
      (item) => item.collection === selectedMainCategory.id,
    );
    const firstItem = collectionItems[0];

    return {
      id: selectedMainCategory.id,
      categoryId: null,
      originalId: null,
      titleAr: selectedMainCategory.titleAr,
      titleEn: selectedMainCategory.titleEn,
      collection: selectedMainCategory.id,
      collectionAr: firstItem?.collectionAr ?? selectedMainCategory.titleAr,
      collectionEn: firstItem?.collectionEn ?? selectedMainCategory.titleEn,
      collectionImage: firstItem?.collectionImage ?? null,
      order: selectedMainCategory.order,
      is_collection: true,
      collection_item_ids: collectionItems.map((item) => item.id),
      collection_items_count: collectionItems.length,
    };
  }, [categories, selectedMainCategory]);

  const selectedSubcategoryDetails = React.useMemo<DetailRecord | null>(() => {
    if (!selectedMainCategory || !subcategoryId) return null;

    if (selectedMainCategory.isCollection) {
      const category = categories.find(
        (item) => item.id.toString() === subcategoryId,
      );
      return category ? (category as unknown as DetailRecord) : null;
    }

    if (subcategoryId === DOCTOR_APPOINTMENT_VALUE) {
      const appointmentItems = subcategories.filter(
        (item) =>
          item.categoryId === MEDICAL_SERVICES_CATEGORY_ID &&
          item.subCollection === 0,
      );

      return {
        id: DOCTOR_APPOINTMENT_VALUE,
        categoryId: MEDICAL_SERVICES_CATEGORY_ID,
        originalId: null,
        subCollection: 0,
        titleAr: "كشف طبي",
        titleEn: "Doctor Appointment",
        image: "doctors_appointment.webp",
        is_virtual_group: true,
        groupedOriginalIds: appointmentItems.map((item) => item.originalId),
        grouped_items_count: appointmentItems.length,
      };
    }

    const subcategory = subcategories.find(
      (item) =>
        item.categoryId === selectedMainCategory.id &&
        item.originalId.toString() === subcategoryId,
    );
    return subcategory ? (subcategory as unknown as DetailRecord) : null;
  }, [categories, selectedMainCategory, subcategories, subcategoryId]);

  const updateComponent = <K extends keyof ProductStyleSettingsComponents>(
    key: K,
    value: ProductStyleSettingsComponents[K],
  ) => {
    setComponents((current) => ({ ...current, [key]: value }));
  };

  const handleMainCategoryChange = (value: string) => {
    setIsStyleLoaded(false);
    setStyleStatus("idle");
    setMainCategoryId(value);
    setSubcategoryId("");
    setComponents(createDefaultProductStyleComponents());
  };

  const handleSubcategoryChange = (value: string) => {
    setIsStyleLoaded(false);
    setStyleStatus("loading");
    setSubcategoryId(value);
  };

  React.useEffect(() => {
    if (!mainCategoryId || !subcategoryId) {
      setIsStyleLoaded(false);
      setStyleStatus("idle");
      return;
    }

    let cancelled = false;
    setIsStyleLoaded(false);
    setStyleStatus("loading");

    const query = new URLSearchParams({ mainCategoryId, subcategoryId });
    govaApi
      .get<ProductStyleResponse>(
        `${GOVA_API_ROUTES.dev.productStyle}?${query.toString()}`,
        { cache: "no-store" },
      )
      .then((response) => {
        if (cancelled) return;
        setComponents(normalizeProductStyleComponents(response.settings?.components));
        setIsStyleLoaded(true);
        setStyleStatus(response.exists ? "saved" : "idle");
      })
      .catch(() => {
        if (!cancelled) setStyleStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [mainCategoryId, subcategoryId]);

  React.useEffect(() => {
    if (!mainCategoryId || !subcategoryId || !isStyleLoaded) return;

    const timeout = window.setTimeout(() => {
      setStyleStatus("saving");
      const settings: ProductStyleSettings = {
        mainCategoryId,
        subcategoryId,
        components,
      };

      govaApi
        .put<{ saved: boolean }>(GOVA_API_ROUTES.dev.productStyle, settings)
        .then(() => setStyleStatus("saved"))
        .catch(() => setStyleStatus("error"));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [components, isStyleLoaded, mainCategoryId, subcategoryId]);

  const previewStyleComponents = toProductStyleComponents(components);
  const controlsDisabled = !isStyleLoaded;

  return (
    <main className="mx-auto w-full px-4 py-8 sm:px-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
        <p className="mb-2 w-full text-xs font-semibold uppercase tracking-wider text-primary">
          Developer only
        </p>
        <h1 className="text-2xl font-bold">محدد التصنيفات</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أداة لمراجعة العلاقة بين التصنيفات الرئيسية والفرعية وضبط مكونات عرض المنتج.
        </p>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : loadError ? (
          <p className="mt-8 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
            تعذر تحميل بيانات التصنيفات.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">التصنيف الرئيسي</label>
              <Select
                value={mainCategoryId}
                onValueChange={handleMainCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر تصنيفًا رئيسيًا" />
                </SelectTrigger>
                <SelectContent>
                  {mainCategoryOptions.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {bilingualLabel(category.titleAr, category.titleEn)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">التصنيف الفرعي</label>
              <Select
                value={subcategoryId}
                onValueChange={handleSubcategoryChange}
                disabled={!mainCategoryId || subcategoryOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      mainCategoryId && subcategoryOptions.length === 0
                        ? "لا توجد تصنيفات فرعية"
                        : "اختر تصنيفًا فرعيًا"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subcategoryOptions.map((subcategory) => (
                    <SelectItem
                      key={subcategory.value}
                      value={subcategory.value}
                    >
                      {bilingualLabel(subcategory.titleAr, subcategory.titleEn)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <details className="group sm:col-span-2">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border bg-muted/40 px-4 py-3 font-semibold transition-colors hover:bg-muted/70">
                <span>معلومات العناصر المختارة</span>
                <span className="text-lg text-muted-foreground transition-transform group-open:rotate-180">
                  ^
                </span>
              </summary>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <SelectedRecordDetails
                  title="بيانات التصنيف الرئيسي"
                  record={selectedMainDetails}
                />
                <SelectedRecordDetails
                  title="بيانات التصنيف الفرعي"
                  record={selectedSubcategoryDetails}
                />
              </div>
            </details>

            {mainCategoryId && subcategoryId ? (
              <div className="space-y-6 sm:col-span-2">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold">إعدادات المكونات</h2>
                    <span className="text-xs text-muted-foreground">
                      {styleStatus === "loading" && "جاري تحميل الإعدادات..."}
                      {styleStatus === "saving" && "جاري الحفظ..."}
                      {styleStatus === "saved" && "تم الحفظ"}
                      {styleStatus === "error" && "تعذر الحفظ أو التحميل"}
                      {styleStatus === "idle" && "سيتم الحفظ تلقائيًا"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <ProductImagesStyleEditor
                      value={components.images}
                      disabled={controlsDisabled}
                      onChange={(value) => updateComponent("images", value)}
                    />
                    <ProductRatingStyleEditor
                      value={components.rating}
                      disabled={controlsDisabled}
                      onChange={(value) => updateComponent("rating", value)}
                    />
                    <ProductPriceStyleEditor
                      value={components.price}
                      disabled={controlsDisabled}
                      onChange={(value) => updateComponent("price", value)}
                    />
                    <ProductOrderStyleEditor
                      value={components.order}
                      disabled={controlsDisabled}
                      onChange={(value) => updateComponent("order", value)}
                    />
                    <ProductMainDataStyleEditor
                      value={components.mainData}
                      disabled={controlsDisabled}
                      onChange={(value) => updateComponent("mainData", value)}
                    />
                    <ProductSpecificationsStyleEditor
                      value={components.specifications}
                      disabled={controlsDisabled}
                      onChange={(value) =>
                        updateComponent("specifications", value)
                      }
                    />
                    <ProductVehicleSpecsStyleEditor
                      value={components.vehicleSpecs}
                      disabled={controlsDisabled}
                      onChange={(value) =>
                        updateComponent("vehicleSpecs", value)
                      }
                    />
                    <ProductPropertySpecsStyleEditor
                      value={components.propertySpecs}
                      disabled={controlsDisabled}
                      onChange={(value) =>
                        updateComponent("propertySpecs", value)
                      }
                    />
                    <ProductPharmacySpecsStyleEditor
                      value={components.pharmacySpecs}
                      disabled={controlsDisabled}
                      onChange={(value) =>
                        updateComponent("pharmacySpecs", value)
                      }
                    />
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-bold">معاينة المنتج</h2>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["view", "عرض"],
                          ["edit", "تعديل"],
                          ["new", "جديد"],
                        ] as const
                      ).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPreviewMode(mode)}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                            previewMode === mode
                              ? "border-primary bg-primary text-on-primary"
                              : "bg-background hover:bg-muted"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    key={`${mainCategoryId}-${subcategoryId}-${previewMode}`}
                    className="mt-5 space-y-4 rounded-xl bg-muted/20 p-3 sm:p-5"
                  >
                    <ProductComponentsRenderer
                      mode={previewMode}
                      components={previewStyleComponents}
                      fields={previewFields}
                      onFieldsChange={setPreviewFields}
                      images={previewImages}
                      onImagesChange={setPreviewImages}
                      mainCategoryId={mainCategoryId}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
