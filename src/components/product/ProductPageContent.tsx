"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  ProductComponentFrame,
  ProductField,
} from "@/components/product-preview/shared";
import type { ProductPreviewMode } from "@/components/product-preview";
import { StorageImageManager } from "@/features/storage/components/StorageImageManager";
import { StorageProfiles } from "@/core/storage/constants/storage-profiles";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { useSession } from "@/features/auth/components/SessionProvider";
import { productApiService } from "@/features/product/services/product-api-service";
import type {
  ProductFieldValues,
  ProductRecord,
} from "@/features/product/entities/product.entity";
import { govaApi } from "@/core/api";

interface ProductPageContentProps {
  mode: ProductPreviewMode;
  productId: string;
  mainCategoryId: string;
  subcategoryId: string;
}

type ComponentConfig = Record<string, boolean | number | string> & {
  visible: boolean;
  order: number;
};
interface ProductStyleFile {
  components: Record<string, ComponentConfig>;
}

const FIELD_DEFINITIONS: Record<
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
  vehicleSpecs: [
    ["brand", "الماركة", "text"],
    ["bodyType", "نوع الهيكل", "text"],
    ["fuel", "نوع الوقود", "text"],
    ["transmission", "ناقل الحركة", "text"],
  ],
  propertySpecs: [
    ["area", "المساحة", "text"],
    ["rooms", "عدد الغرف", "number"],
    ["bathrooms", "عدد الحمامات", "number"],
    ["type", "نوع العقار", "text"],
    ["address", "العنوان", "text"],
    ["location", "الموقع", "text"],
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

const COMPONENT_TITLES: Record<string, string> = {
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

export function ProductPageContent({
  mode,
  productId,
  mainCategoryId: initialMain,
  subcategoryId: initialSub,
}: ProductPageContentProps) {
  const router = useRouter();
  const { session, isLoggedIn, isLoading: sessionLoading } = useSession();
  const [product, setProduct] = React.useState<ProductRecord | null>(null);
  const [style, setStyle] = React.useState<ProductStyleFile | null>(null);
  const [fields, setFields] = React.useState<ProductFieldValues>({});
  const [images, setImages] = React.useState<StoredImage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const mainCategoryId = product?.mainCategoryId ?? initialMain;
  const subcategoryId = product?.subcategoryId ?? initialSub;

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        let loadedProduct: ProductRecord | null = null;
        if (mode !== "new") {
          if (!productId)
            throw new Error("يلزم productId لوضع العرض أو التعديل.");
          loadedProduct = await productApiService.get(productId);
          if (!cancelled) {
            setProduct(loadedProduct);
            setFields(loadedProduct.data.fields);
            setImages(loadedProduct.data.images);
          }
        } else {
          if (!initialMain || !initialSub)
            throw new Error("يلزم تحديد التصنيف الرئيسي والفرعي.");
          if (!cancelled) {
            setFields({});
            setImages([]);
          }
        }
        const main = loadedProduct?.mainCategoryId ?? initialMain;
        const sub = loadedProduct?.subcategoryId ?? initialSub;
        const loadedStyle = await govaApi.getPublicJson<ProductStyleFile>(
          `/product/style/${encodeURIComponent(main)}__${encodeURIComponent(sub)}.json`,
        );
        if (!cancelled) setStyle(loadedStyle);
      } catch (loadError) {
        if (!cancelled)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "تعذر تحميل المنتج.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialMain, initialSub, mode, productId]);

  const editable = mode !== "view";
  const ownerAllowed =
    mode === "new" || !product || product.uid === session?.uid;
  const components = React.useMemo(
    () =>
      style
        ? Object.entries(style.components)
            .filter(([, config]) => config.visible)
            .sort(
              ([, left], [, right]) => Number(left.order) - Number(right.order),
            )
        : [],
    [style],
  );

  const save = async () => {
    if (!session?.uid || !ownerAllowed) return;
    setSaving(true);
    setError("");
    try {
      const saved =
        mode === "new"
          ? await productApiService.create({
              uid: session.uid,
              mainCategoryId,
              subcategoryId,
              data: { fields, images },
              status: "active",
            })
          : await productApiService.update({
              id: productId,
              uid: session.uid,
              data: { fields, images },
              status: product?.status,
            });
      router.replace(
        `/product?mode=view&productId=${encodeURIComponent(saved.id)}&mainCategoryId=${encodeURIComponent(saved.mainCategoryId)}&subcategoryId=${encodeURIComponent(saved.subcategoryId)}`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "تعذر حفظ المنتج.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || sessionLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  if (error && !style)
    return (
      <p className="m-6 rounded-2xl bg-destructive/10 p-5 text-center text-destructive">
        {error}
      </p>
    );
  if (editable && !isLoggedIn)
    return (
      <div className="m-6 rounded-2xl border p-6 text-center">
        <p>يجب تسجيل الدخول لإنشاء المنتج أو تعديله.</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-on-primary"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  if (mode === "edit" && !ownerAllowed)
    return (
      <p className="m-6 rounded-2xl bg-destructive/10 p-5 text-center text-destructive">
        لا يمكنك تعديل منتج يخص مستخدمًا آخر.
      </p>
    );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6">
      <header className="rounded-2xl border bg-card p-5">
        <p className="text-xs text-muted-foreground">
          {mainCategoryId} / {subcategoryId}
        </p>
        <h1 className="text-2xl font-bold">
          {mode === "new"
            ? "منتج جديد"
            : mode === "edit"
              ? "تعديل المنتج"
              : fields["mainData.name"] || "عرض المنتج"}
        </h1>
      </header>
      {components.map(([key, config]) => {
        if (key === "images")
          return (
            <ProductComponentFrame key={key} title={COMPONENT_TITLES[key]}>
              {editable ? (
                <StorageImageManager
                  config={{
                    id: "product-images",
                    storageProfileId: StorageProfiles.ProductDefault,
                    maxItems: Number(config.count || 1),
                    aspectRatio: "square",
                    allowReplace: true,
                    confirmUpload: false,
                    confirmRemove: true,
                  }}
                  value={images}
                  onChange={setImages}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((image) => (
                    <img
                      key={image.imageKey}
                      src={image.url}
                      alt=""
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  ))}
                </div>
              )}
            </ProductComponentFrame>
          );
        if (key === "order")
          return (
            <ProductComponentFrame key={key} title={COMPONENT_TITLES[key]}>
              <div className="flex flex-wrap gap-2">
                {config.cart ? (
                  <button className="rounded-xl bg-primary px-4 py-2 text-on-primary">
                    إضافة إلى السلة
                  </button>
                ) : null}
                {config.favorite ? (
                  <button className="rounded-xl border px-4 py-2">
                    المفضلة
                  </button>
                ) : null}
                {config.contact ? (
                  <button className="rounded-xl border px-4 py-2">تواصل</button>
                ) : null}
              </div>
            </ProductComponentFrame>
          );
        const definitions = FIELD_DEFINITIONS[key] ?? [];
        return (
          <ProductComponentFrame key={key} title={COMPONENT_TITLES[key] ?? key}>
            <div className="grid gap-3 sm:grid-cols-2">
              {definitions.map(([fieldKey, label, fieldType]) => {
                if (
                  key === "rating" &&
                  fieldKey === "comment" &&
                  config.type !== "stars-comments"
                )
                  return null;
                if (key !== "rating" && config[fieldKey] === false) return null;
                const storageKey = `${key}.${fieldKey}`;
                return (
                  <ProductField
                    key={storageKey}
                    label={label}
                    value={fields[storageKey] ?? ""}
                    mode={mode}
                    type={fieldType === "number" ? "number" : "text"}
                    multiline={fieldType === "textarea"}
                    onChange={(value) =>
                      setFields((current) => ({
                        ...current,
                        [storageKey]: value,
                      }))
                    }
                  />
                );
              })}
            </div>
          </ProductComponentFrame>
        );
      })}
      {error ? (
        <p className="rounded-xl bg-destructive/10 p-3 text-destructive">
          {error}
        </p>
      ) : null}
      {editable ? (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-60"
        >
          {saving
            ? "جارٍ الحفظ…"
            : mode === "new"
              ? "إنشاء المنتج"
              : "حفظ التعديلات"}
        </button>
      ) : null}
    </main>
  );
}
