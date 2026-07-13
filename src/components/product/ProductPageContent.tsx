"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ApiError, govaApi } from "@/core/api";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useTranslation } from "@/lib/i18n";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { Copy, Check } from "lucide-react";
import type {
  ProductFieldValues,
  ProductRecord,
} from "@/features/product/entities/product.entity";
import { productApiService } from "@/features/product/services/product-api-service";
import { ProductComponentsRenderer } from "./ProductComponentsRenderer";
import type {
  ProductMode,
  ProductStyleComponents,
} from "./product-component.types";
import { createPharmacyInitialFields } from "@/features/pharmacy-profile-catalog/utils/pharmacy-initial-fields";
import {
  PHARMACY_MAIN_CATEGORY_ID,
  PHARMACY_SUBCATEGORY_ID,
} from "@/features/pharmacy-profile-catalog/entities/pharmacy-profile-catalog.types";

interface ProductStyleFile {
  components: ProductStyleComponents;
}

export function ProductPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const mode: ProductMode =
    requestedMode === "edit" || requestedMode === "new"
      ? requestedMode
      : "view";
  const productId = searchParams.get("productId") ?? "";
  const initialMain = searchParams.get("mainCategoryId") ?? "";
  const initialSub = searchParams.get("subcategoryId") ?? "";
  const initialPharmacyCategory = searchParams.get("pharmacyCategoryId") ?? "";
  const initialPharmacySubcategory = searchParams.get("pharmacySubcategoryId") ?? "";
  const returnTo = searchParams.get("returnTo");
  const returnUrl = returnTo === "profile-products"
    ? "/profile?mode=edit&tab=products"
    : null;
  const { t, locale } = useTranslation();
  const { session, isLoggedIn, isLoading: sessionLoading } = useSession();
  const [product, setProduct] = React.useState<ProductRecord | null>(null);
  const [style, setStyle] = React.useState<ProductStyleFile | null>(null);
  const [fields, setFields] = React.useState<ProductFieldValues>({});
  const [images, setImages] = React.useState<StoredImage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [copiedProduct, setCopiedProduct] = React.useState(false);
  const [copiedOwner, setCopiedOwner] = React.useState(false);

  const mainCategoryId = product?.mainCategoryId ?? initialMain;
  const subcategoryId = product?.subcategoryId ?? initialSub;
  const editable = mode !== "view";
  const ownerAllowed =
    mode === "new" || !product || product.uid === session?.uid;

  const convertLegacyBoolean = (fields: ProductFieldValues): ProductFieldValues => {
    const converted = { ...fields };
    if (converted["price.needsCar"] === "نعم") {
      converted["price.needsCar"] = "true";
    } else if (converted["price.needsCar"] === "لا") {
      converted["price.needsCar"] = "false";
    } else if (converted["price.needsCar"] !== "true" && converted["price.needsCar"] !== "false") {
      converted["price.needsCar"] = "false";
    }
    if (converted["mainData.available"] === "نعم" || converted["mainData.available"] === "متوفر") {
      converted["mainData.available"] = "true";
    } else if (converted["mainData.available"] === "لا" || converted["mainData.available"] === "غير متوفر") {
      converted["mainData.available"] = "false";
    } else if (converted["mainData.available"] !== "true" && converted["mainData.available"] !== "false") {
      converted["mainData.available"] = "true";
    }
    return converted;
  };

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
            const convertedFields = convertLegacyBoolean(loadedProduct.data.fields);
            setFields(convertedFields);
            setImages(loadedProduct.data.images);
          }
        } else {
          if (!initialMain || !initialSub)
            throw new Error("يلزم تحديد التصنيف الرئيسي والفرعي.");
          if (!cancelled) {
            setProduct(null);
            setFields(
              initialMain === PHARMACY_MAIN_CATEGORY_ID &&
                initialSub === PHARMACY_SUBCATEGORY_ID
                ? createPharmacyInitialFields(
                    initialPharmacyCategory,
                    initialPharmacySubcategory,
                  )
                : {},
            );
            setImages([]);
          }
        }

        const main = loadedProduct?.mainCategoryId ?? initialMain;
        const sub = loadedProduct?.subcategoryId ?? initialSub;
        let loadedStyle: ProductStyleFile;
        try {
          loadedStyle = await govaApi.getPublicJson<ProductStyleFile>(
            `/product/style/${encodeURIComponent(main)}__${encodeURIComponent(sub)}.json`,
          );
        } catch (styleError) {
          if (!(styleError instanceof ApiError) || styleError.status !== 404) {
            throw styleError;
          }
          loadedStyle = await govaApi.getPublicJson<ProductStyleFile>(
            "/product/style/default.json",
          );
        }
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
  }, [initialMain, initialPharmacyCategory, initialPharmacySubcategory, initialSub, mode, productId]);

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
      if (returnUrl) {
        router.replace(returnUrl);
      } else {
        router.replace(
          `/product?mode=view&productId=${encodeURIComponent(saved.id)}&mainCategoryId=${encodeURIComponent(saved.mainCategoryId)}&subcategoryId=${encodeURIComponent(saved.subcategoryId)}`,
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "تعذر حفظ المنتج.",
      );
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, type: "product" | "owner") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === "product") {
        setCopiedProduct(true);
        setTimeout(() => setCopiedProduct(false), 2000);
      } else {
        setCopiedOwner(true);
        setTimeout(() => setCopiedOwner(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy text: ", err);
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
      <ProductComponentsRenderer
        mode={mode}
        components={style?.components ?? {}}
        fields={fields}
        onFieldsChange={setFields}
        images={images}
        onImagesChange={setImages}
        productId={product?.id ?? ""}
        ownerUid={product?.uid ?? session?.uid ?? ""}
        mainCategoryId={mainCategoryId}
      />
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
      {mode === "view" && isSuperAdmin(session) ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-warning">
            <span className="h-2.5 w-2.5 rounded-full bg-warning animate-pulse" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">
              {locale === "ar" ? "لوحة الإدارة الخارقة (Super Admin)" : "Super Admin Panel"}
            </h3>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg bg-surface-container-high p-3 border border-outline-variant/30 flex flex-col justify-between items-start">
              <div className="w-full">
                <span className="block text-on-surface-variant font-medium mb-1">
                  {locale === "ar" ? "معرف المنتج (Product ID):" : "Product ID:"}
                </span>
                <code className="break-all font-mono text-primary font-semibold select-all">
                  {productId || product?.id || "—"}
                </code>
              </div>
              {(productId || product?.id) && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(productId || product?.id || "", "product")}
                  className="mt-3 self-end inline-flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-primary transition-colors border border-outline-variant rounded px-2 py-1 bg-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {copiedProduct ? (
                    <>
                      <Check className="h-3 w-3 text-success" />
                      {locale === "ar" ? "تم النسخ" : "Copied"}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      {locale === "ar" ? "نسخ" : "Copy"}
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="rounded-lg bg-surface-container-high p-3 border border-outline-variant/30 flex flex-col justify-between items-start">
              <div className="w-full">
                <span className="block text-on-surface-variant font-medium mb-1">
                  {locale === "ar" ? "معرف صاحب المنتج (Owner ID):" : "Owner ID:"}
                </span>
                <code className="break-all font-mono text-primary font-semibold select-all">
                  {product?.uid || "—"}
                </code>
              </div>
              {product?.uid && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(product.uid, "owner")}
                  className="mt-3 self-end inline-flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-primary transition-colors border border-outline-variant rounded px-2 py-1 bg-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {copiedOwner ? (
                    <>
                      <Check className="h-3 w-3 text-success" />
                      {locale === "ar" ? "تم النسخ" : "Copied"}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      {locale === "ar" ? "نسخ" : "Copy"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
