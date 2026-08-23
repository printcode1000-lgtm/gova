"use client";

import * as React from "react";
import { Share2, UserCircle } from "lucide-react";

import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ASOL_API_ROUTES, asolApi } from "@/core/api";
import { usePageSaveRegistration } from "@/features/page-save/ui";
import {
  PRODUCT_DEMO_DETAILS,
  PRODUCT_DEMO_IMAGES,
  ProductComponentsRenderer,
} from "@/features/product/presentation/ProductComponentsRenderer";
import type { ProductMode } from "@/features/product/ui";
import {
  createEmptyProductDetails,
  type ProductDetails,
} from "@/features/product";
import {
  CATEGORY_CONSTANTS,
  categoryService,
  type DeveloperCatalogCategory,
  type DeveloperCatalogSubcategory,
  type MainCategoryOption,
  type SubcategoryOption,
} from "@/features/categories";
import { ProductImagesStyleEditor } from "@/features/product/ui";
import { ProductRatingStyleEditor } from "@/features/product/ui";
import { ProductPriceStyleEditor } from "@/features/product/ui";
import { ProductOrderStyleEditor } from "@/features/product/ui";
import { ProductMainDataStyleEditor } from "@/features/product/ui";
import { ProductSpecificationsStyleEditor } from "@/features/product/ui";
import { ProductVehicleSpecsStyleEditor } from "@/features/product/ui";
import { ProductPropertySpecsStyleEditor } from "@/features/product/ui";
import { ProductSearchColumnsStyleEditor } from "@/features/product/ui";
import { ProductPharmacySpecsStyleEditor } from "@/features/pharmacy-profile-catalog/ui";
import {
  createDefaultProductStyleComponents,
  normalizeProductStyleComponents,
  toProductStyleComponents,
  type ProductStyleSettings,
  type ProductStyleSettingsComponents,
} from "@/shared/ui/product-style-settings";
import {
  SelectedRecordDetails,
  type DetailRecord,
} from "./DeveloperRecordDetails";

const MEDICAL_SERVICES_CATEGORY_ID = CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID;
const DOCTOR_APPOINTMENT_VALUE = CATEGORY_CONSTANTS.DOCTOR_APPOINTMENT_VALUE;

interface ProductStyleResponse {
  exists: boolean;
  settings: ProductStyleSettings | null;
}

function bilingualLabel(titleAr: string, titleEn: string) {
  return titleEn ? `${titleAr} - ${titleEn}` : titleAr;
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
  const [savedComponentsJson, setSavedComponentsJson] = React.useState("");
  const [styleStatus, setStyleStatus] = React.useState<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("idle");
  const [previewMode, setPreviewMode] = React.useState<ProductMode>("view");
  const [previewDetails, setPreviewDetails] = React.useState<ProductDetails>({
    ...PRODUCT_DEMO_DETAILS,
    images: PRODUCT_DEMO_IMAGES,
  });

  const isLoading = false;
  const loadError = false;

  React.useEffect(() => {
    setPreviewDetails(
      previewMode === "new"
        ? createEmptyProductDetails()
        : { ...PRODUCT_DEMO_DETAILS, images: [...PRODUCT_DEMO_IMAGES] },
    );
  }, [previewMode, mainCategoryId, subcategoryId]);

  const mainCategoryOptions = React.useMemo<MainCategoryOption[]>(() => {
    return [...categoryService.getDeveloperMainOptions()];
  }, []);

  const selectedMainCategory = mainCategoryOptions.find(
    (category) => category.id.toString() === mainCategoryId,
  );

  const subcategoryOptions = React.useMemo<SubcategoryOption[]>(() => {
    if (!selectedMainCategory) return [];
    return categoryService
      .getDeveloperSubOptions(
        selectedMainCategory.id,
        selectedMainCategory.isCollection,
      )
      .filter((item) => item.selectable !== false);
  }, [selectedMainCategory]);

  const selectedMainDetails = React.useMemo<DetailRecord | null>(() => {
    if (!selectedMainCategory) return null;

    if (!selectedMainCategory.isCollection) {
      const category = categories.find(
        (item) => item.id === selectedMainCategory.id,
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
    asolApi
      .get<ProductStyleResponse>(
        `${ASOL_API_ROUTES.dev.productStyle}?${query.toString()}`,
        { cache: "no-store" },
      )
      .then((response) => {
        if (cancelled) return;
        const loaded = normalizeProductStyleComponents(
          response.settings?.components,
        );
        setComponents(loaded);
        setSavedComponentsJson(JSON.stringify(loaded));
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

  const isStyleDirty =
    isStyleLoaded &&
    Boolean(mainCategoryId) &&
    Boolean(subcategoryId) &&
    JSON.stringify(components) !== savedComponentsJson;

  usePageSaveRegistration({
    id: "developer-product-style",
    label: "محدد التصنيفات",
    returnPath: "/dev/category-selector",
    enabled: isStyleLoaded,
    items: [
      {
        id: "product-style",
        label: "إعدادات مكونات المنتج",
        operation: "save",
        isDirty: isStyleDirty,
        canSave: true,
      },
    ],
    isSaving: styleStatus === "saving",
    canSave: isStyleDirty,
    save: async () => {
      setStyleStatus("saving");
      const settings: ProductStyleSettings = {
        mainCategoryId,
        subcategoryId,
        components,
      };
      try {
        await asolApi.put<{ saved: boolean }>(
          ASOL_API_ROUTES.dev.productStyle,
          settings,
        );
        setSavedComponentsJson(JSON.stringify(components));
        setStyleStatus("saved");
        return true;
      } catch {
        setStyleStatus("error");
        return false;
      }
    },
  });

  const previewStyleComponents = toProductStyleComponents(components);
  const controlsDisabled = !isStyleLoaded;

  return (
    <main className="mx-auto w-full px-4 py-8 sm:px-6" data-voice-input="off">
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
              <summary className="flex list-none items-center justify-between rounded-xl border bg-muted/40 px-4 py-3 font-semibold transition-colors">
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
                      {styleStatus === "error" && "تعذر تحميل الإعدادات"}
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
                    <ProductSearchColumnsStyleEditor
                      value={components.searchColumns}
                      disabled={controlsDisabled}
                      onChange={(value) =>
                        updateComponent("searchColumns", value)
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
                              : "bg-background"
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
                    {/* Omit productId so the non-persisted preview never queries the reviews API. */}
                    <ProductComponentsRenderer
                      mode={previewMode}
                      components={previewStyleComponents}
                      product={previewDetails}
                      onProductChange={setPreviewDetails}
                      mainCategoryId={mainCategoryId}
                      ownerUid="demo-owner"
                      shareAction={
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2"
                        >
                          <Share2 className="h-4 w-4" />
                          مشاركة المنتج
                        </button>
                      }
                      profileAction={
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2"
                        >
                          <UserCircle className="h-4 w-4" />
                          بروفايل صاحب المنتج
                        </button>
                      }
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
