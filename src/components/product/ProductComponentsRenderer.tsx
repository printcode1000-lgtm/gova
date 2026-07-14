"use client";

import type { StoredImage } from "@/core/storage/types/stored-image.types";
import {
  createEmptyProductDetails,
  type ProductDetails,
} from "@/features/product/entities/product.entity";
import {
  ProductComponentFrame,
  ProductField,
} from "./ProductComponentPrimitives";
import { ProductAddToCartButton } from "./ProductAddToCartButton";
import { ProductImageEditors } from "./ProductImageEditors";
import { ProductImageGallery } from "./ProductImageGallery";
import { ProductPharmacySpecs } from "@/features/pharmacy-profile-catalog/components/ProductPharmacySpecs";
import { ProductPropertySpecs } from "./ProductPropertySpecs";
import { ProductRatingSettings } from "./ProductRatingSettings";
import { ProductReviews } from "./ProductReviews";
import type {
  ProductMode,
  ProductStyleComponents,
} from "./product-component.types";
import { ProductVehicleSpecs } from "./ProductVehicleSpecs";

type BasicFieldKind = "text" | "number" | "textarea" | "boolean";

const FIELDS: Record<string, Array<[string, string, BasicFieldKind]>> = {
  mainData: [
    ["name", "الاسم", "text"],
    ["brand", "العلامة التجارية", "text"],
    ["manufacturer", "الشركة المصنعة", "text"],
    ["available", "متوفر", "boolean"],
    ["description", "الوصف", "textarea"],
  ],
  price: [
    ["current", "السعر الحالي", "number"],
    ["beforeDiscount", "السعر قبل الخصم", "number"],
    ["needsCar", "يحتاج سيارة نقل", "boolean"],
  ],
  specifications: [
    ["color", "اللون", "text"],
    ["dimensions", "الأبعاد", "text"],
    ["condition", "الحالة", "text"],
    ["size", "المقاس", "text"],
    ["weight", "الوزن", "text"],
    ["year", "السنة", "number"],
  ],
  propertySpecs: [
    ["area", "المساحة", "text"],
    ["rooms", "عدد الغرف", "number"],
    ["bathrooms", "عدد الحمامات", "number"],
    ["type", "نوع العقار", "text"],
    ["address", "العنوان", "text"],
    ["finishing", "التشطيب", "text"],
  ],
  rating: [
    ["rating", "التقييم", "number"],
    ["comment", "التعليق", "textarea"],
  ],
};

const TITLES: Record<string, string> = {
  images: "الصور",
  rating: "التقييم",
  price: "السعر",
  order: "الطلب",
  mainData: "البيانات الأساسية",
  specifications: "المواصفات",
  vehicleSpecs: "مواصفات المركبة",
  propertySpecs: "مواصفات العقار",
  pharmacySpecs: "مواصفات الصيدلية",
};

export const PRODUCT_DEMO_IMAGES: StoredImage[] = [
  {
    imageKey: "demo-product-1.webp",
    url: "/images/subCategories/Allergy and Immunology.webp",
  },
  {
    imageKey: "demo-product-2.webp",
    url: "/images/subCategories/Animal Care & Training.webp",
  },
  {
    imageKey: "demo-product-3.webp",
    url: "/images/subCategories/Apartments & Houses for Sale.webp",
  },
  {
    imageKey: "demo-product-4.webp",
    url: "/images/subCategories/Art Tools & Supplies.webp",
  },
];

export const PRODUCT_DEMO_DETAILS: ProductDetails = createEmptyProductDetails({
  rating: {
    rating: "4",
    comment: "منتج ممتاز وجودته جيدة جدًا",
    enabled: true,
    targetEnabled: true,
    mode: "",
  },
  price: {
    current: "1250",
    beforeDiscount: "1500",
    label: "",
    needsCar: false,
  },
  mainData: {
    name: "منتج تجريبي",
    brand: "جوفا",
    manufacturer: "الشركة المصنعة",
    available: true,
    description: "وصف تجريبي للمنتج أو الخدمة المعروضة.",
  },
  specifications: {
    color: "أسود",
    dimensions: "40 x 30 x 15 سم",
    condition: "جديد",
    size: "متوسط",
    weight: "2 كجم",
    year: "2026",
  },
  vehicleSpecs: {
    brand: "toyota",
    bodyType: "sedan",
    fuel: "benzine",
    transmission: "automatic",
    special: "special_needs",
  },
  propertySpecs: {
    area: "180 م²",
    rooms: "3",
    bathrooms: "2",
    type: "شقة",
    address: "القاهرة الجديدة",
    locationLatitude: "",
    locationLongitude: "",
    finishing: "سوبر لوكس",
  },
  pharmacySpecs: {
    pharmacyCategoryId: "",
    pharmacyCategory: "الأدوية والعلاج",
    pharmacySubcategoryId: "",
    pharmacySubcategory: "مسكنات الألم وخافض الحرارة",
    activeIngredientId: "",
    activeIngredient: "باراسيتامول",
    nameAr: "دواء تجريبي",
    nameEn: "Demo Medicine",
    formId: "",
    form: "أقراص",
    concentrationId: "",
    concentration: "500 مجم",
    prescriptionRequired: false,
  },
});

function readValue(product: ProductDetails, section: string, key: string) {
  const value = (product as unknown as Record<string, Record<string, unknown>>)[
    section
  ]?.[key];
  return typeof value === "boolean" ? String(value) : String(value ?? "");
}

function writeValue(
  product: ProductDetails,
  section: string,
  key: string,
  value: string,
  kind: BasicFieldKind,
): ProductDetails {
  const currentSection =
    (product as unknown as Record<string, Record<string, unknown>>)[section] ??
    {};
  return {
    ...product,
    [section]: {
      ...currentSection,
      [key]: kind === "boolean" ? value === "true" : value,
    },
  } as ProductDetails;
}

export function ProductComponentsRenderer({
  mode,
  components,
  product,
  onProductChange,
  productId = "",
  ownerUid = "",
  mainCategoryId = "",
}: {
  mode: ProductMode;
  components: ProductStyleComponents;
  product: ProductDetails;
  onProductChange: (product: ProductDetails) => void;
  productId?: string;
  ownerUid?: string;
  mainCategoryId?: string;
}) {
  const visible = Object.entries(components)
    .filter(([, config]) => config.visible)
    .sort(([, a], [, b]) => Number(a.order) - Number(b.order));

  if (visible.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد مكونات مفعلة للعرض.
      </p>
    );
  }

  return (
    <>
      {visible.map(([key, config]) => {
        if (key === "images") {
          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              {mode === "view" ? (
                <ProductImageGallery
                  images={product.images.slice(0, Number(config.count || 1))}
                />
              ) : (
                <ProductImageEditors
                  maxImages={Number(config.count || 1)}
                  mainCategoryId={mainCategoryId}
                  images={product.images}
                  onChange={(images) => onProductChange({ ...product, images })}
                  deferStorageDeletion={mode === "edit"}
                />
              )}
            </ProductComponentFrame>
          );
        }

        if (key === "rating") {
          const savedMode = product.rating.mode;
          const commentsEnabled =
            savedMode === "stars"
              ? false
              : savedMode === "stars-comments"
                ? true
                : config.type === "stars-comments";

          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              {mode === "view" ? (
                <ProductReviews
                  productId={productId}
                  ownerUid={ownerUid}
                  productName={product.mainData.name || "المنتج أو الخدمة"}
                  reviewsEnabled={product.rating.enabled}
                  targetEnabled={product.rating.targetEnabled}
                  commentsEnabled={commentsEnabled}
                />
              ) : (
                <ProductRatingSettings
                  rating={product.rating}
                  onChange={(rating) => onProductChange({ ...product, rating })}
                />
              )}
            </ProductComponentFrame>
          );
        }

        if (key === "order") {
          if (mode !== "view") return null;
          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              <div className="flex flex-wrap gap-2">
                {config.cart ? (
                  <ProductAddToCartButton
                    productId={productId}
                    sellerId={ownerUid}
                    product={product}
                    mainCategoryId={mainCategoryId}
                  />
                ) : null}
                {config.favorite ? (
                  <button type="button" className="rounded-xl border px-4 py-2">
                    المفضلة
                  </button>
                ) : null}
                {config.contact ? (
                  <button type="button" className="rounded-xl border px-4 py-2">
                    تواصل
                  </button>
                ) : null}
              </div>
            </ProductComponentFrame>
          );
        }

        if (key === "vehicleSpecs") {
          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              <ProductVehicleSpecs
                mode={mode}
                config={config}
                specs={product.vehicleSpecs}
                onChange={(vehicleSpecs) =>
                  onProductChange({ ...product, vehicleSpecs })
                }
              />
            </ProductComponentFrame>
          );
        }

        if (key === "propertySpecs") {
          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              <ProductPropertySpecs
                mode={mode}
                config={config}
                specs={product.propertySpecs}
                onChange={(propertySpecs) =>
                  onProductChange({ ...product, propertySpecs })
                }
              />
            </ProductComponentFrame>
          );
        }

        if (key === "pharmacySpecs") {
          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              <ProductPharmacySpecs
                mode={mode}
                config={config}
                details={product}
                ownerUid={ownerUid}
                onChange={onProductChange}
              />
            </ProductComponentFrame>
          );
        }

        return (
          <ProductComponentFrame key={key} title={TITLES[key] ?? key}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(FIELDS[key] ?? []).map(([fieldKey, label, kind]) => {
                if (config[fieldKey] === false) return null;
                return (
                  <ProductField
                    key={`${key}.${fieldKey}`}
                    label={label}
                    value={readValue(product, key, fieldKey)}
                    mode={mode}
                    type={kind}
                    multiline={kind === "textarea"}
                    onChange={(value) =>
                      onProductChange(
                        writeValue(product, key, fieldKey, value, kind),
                      )
                    }
                  />
                );
              })}
            </div>
          </ProductComponentFrame>
        );
      })}
    </>
  );
}
