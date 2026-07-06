"use client";

import type { StoredImage } from "@/core/storage/types/stored-image.types";
import type { ProductFieldValues } from "@/features/product/entities/product.entity";
import {
  ProductComponentFrame,
  ProductField,
} from "./ProductComponentPrimitives";
import { ProductImageEditors } from "./ProductImageEditors";
import { ProductImageGallery } from "./ProductImageGallery";
import { ProductPropertySpecs } from "./ProductPropertySpecs";
import { ProductRatingSettings } from "./ProductRatingSettings";
import { ProductReviews } from "./ProductReviews";
import type {
  ProductMode,
  ProductStyleComponents,
} from "./product-component.types";
import { ProductVehicleSpecs } from "./ProductVehicleSpecs";

const FIELDS: Record<
  string,
  Array<[string, string, "text" | "number" | "textarea"]>
> = {
  mainData: [
    ["name", "الاسم", "text"],
    ["brand", "العلامة التجارية", "text"],
    ["manufacturer", "الشركة المصنعة", "text"],
    ["available", "التوفر", "text"],
    ["description", "الوصف", "textarea"],
  ],
  price: [
    ["current", "السعر الحالي", "number"],
    ["beforeDiscount", "السعر قبل الخصم", "number"],
    ["needsCar", "يحتاج سيارة", "text"],
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
  pharmacySpecs: [
    ["nameAr", "الاسم بالعربي", "text"],
    ["nameEn", "الاسم بالإنجليزي", "text"],
    ["form", "شكل الدواء", "text"],
    ["concentration", "التركيز", "text"],
    ["activeIngredient", "المادة الفعالة", "text"],
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

export const PRODUCT_DEMO_FIELDS: ProductFieldValues = {
  "rating.rating": "4",
  "rating.comment": "منتج ممتاز وجودته جيدة جدًا",
  "price.current": "1250",
  "price.beforeDiscount": "1500",
  "price.needsCar": "لا",
  "mainData.name": "منتج تجريبي",
  "mainData.brand": "جوفا",
  "mainData.manufacturer": "الشركة المصنعة",
  "mainData.available": "متوفر",
  "mainData.description": "وصف تجريبي للمنتج أو الخدمة المعروضة.",
  "specifications.color": "أسود",
  "specifications.dimensions": "40 × 30 × 15 سم",
  "specifications.condition": "جديد",
  "specifications.size": "متوسط",
  "specifications.weight": "2 كجم",
  "specifications.year": "2026",
  "vehicleSpecs.brand": "toyota",
  "vehicleSpecs.bodyType": "sedan",
  "vehicleSpecs.fuel": "benzine",
  "vehicleSpecs.transmission": "automatic",
  "vehicleSpecs.special": "special_needs",
  "propertySpecs.area": "180 م²",
  "propertySpecs.rooms": "3",
  "propertySpecs.bathrooms": "2",
  "propertySpecs.type": "شقة",
  "propertySpecs.address": "القاهرة الجديدة",
  "propertySpecs.finishing": "سوبر لوكس",
  "pharmacySpecs.nameAr": "دواء تجريبي",
  "pharmacySpecs.nameEn": "Demo Medicine",
  "pharmacySpecs.form": "أقراص",
  "pharmacySpecs.concentration": "500 مجم",
  "pharmacySpecs.activeIngredient": "مادة فعالة تجريبية",
};

export function ProductComponentsRenderer({
  mode,
  components,
  fields,
  onFieldsChange,
  images,
  onImagesChange,
  productId = "",
  ownerUid = "",
  mainCategoryId = "",
}: {
  mode: ProductMode;
  components: ProductStyleComponents;
  fields: ProductFieldValues;
  onFieldsChange: (fields: ProductFieldValues) => void;
  images: StoredImage[];
  onImagesChange: (images: StoredImage[]) => void;
  productId?: string;
  ownerUid?: string;
  mainCategoryId?: string;
}) {
  const visible = Object.entries(components)
    .filter(([, config]) => config.visible)
    .sort(([, a], [, b]) => Number(a.order) - Number(b.order));
  if (visible.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد مكونات مفعّلة للعرض.
      </p>
    );
  return (
    <>
      {visible.map(([key, config]) => {
        if (key === "images")
          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              {mode === "view" ? (
                <ProductImageGallery
                  images={images.slice(0, Number(config.count || 1))}
                />
              ) : (
                <ProductImageEditors
                  maxImages={Number(config.count || 1)}
                  mainCategoryId={mainCategoryId}
                  images={images}
                  onChange={onImagesChange}
                  deferStorageDeletion={mode === "edit"}
                />
              )}
            </ProductComponentFrame>
          );
        if (key === "rating") {
          const savedMode = fields["rating.mode"];
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
                  productName={fields["mainData.name"] || "المنتج أو الخدمة"}
                  reviewsEnabled={fields["rating.enabled"] !== "false"}
                  targetEnabled={fields["rating.targetEnabled"] !== "false"}
                  commentsEnabled={commentsEnabled}
                />
              ) : (
                <ProductRatingSettings
                  fields={fields}
                  onChange={onFieldsChange}
                />
              )}
            </ProductComponentFrame>
          );
        }
        if (key === "order")
          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              <div className="flex flex-wrap gap-2">
                {config.cart ? (
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-on-primary"
                  >
                    إضافة إلى السلة
                  </button>
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
        if (key === "vehicleSpecs")
          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              <ProductVehicleSpecs
                mode={mode}
                config={config}
                fields={fields}
                onChange={onFieldsChange}
              />
            </ProductComponentFrame>
          );
        if (key === "propertySpecs")
          return (
            <ProductComponentFrame key={key} title={TITLES[key]}>
              <ProductPropertySpecs
                mode={mode}
                config={config}
                fields={fields}
                onChange={onFieldsChange}
              />
            </ProductComponentFrame>
          );
        return (
          <ProductComponentFrame key={key} title={TITLES[key] ?? key}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(FIELDS[key] ?? []).map(([fieldKey, label, kind]) => {
                if (config[fieldKey] === false) return null;
                const storageKey = `${key}.${fieldKey}`;
                return (
                  <ProductField
                    key={storageKey}
                    label={label}
                    value={fields[storageKey] ?? ""}
                    mode={mode}
                    type={kind === "number" ? "number" : "text"}
                    multiline={kind === "textarea"}
                    onChange={(value) =>
                      onFieldsChange({ ...fields, [storageKey]: value })
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
