"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";

import { ApiError, asolApi } from "@/core/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useTranslation } from "@/lib/i18n";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { categoryService } from "@/features/categories";
import type {
  ProductDetails,
  ProductRecord,
} from "@/features/product/entities/product.entity";
import {
  createEmptyProductDetails,
  toProductDetails,
} from "@/features/product/entities/product.entity";
import { productApiService } from "@/features/product/services/product-api-service";
import { ProductComponentsRenderer } from "./ProductComponentsRenderer";
import type {
  ProductMode,
  ProductStyleComponents,
} from "./product-component.types";
import { createPharmacyInitialDetails } from "@/features/pharmacy-profile-catalog/utils/pharmacy-initial-fields";
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
  const initialPharmacySubcategory =
    searchParams.get("pharmacySubcategoryId") ?? "";
  const returnTo = searchParams.get("returnTo");
  const returnUrl =
    returnTo === "profile-products" ? "/profile?mode=edit&tab=products" : null;
  const { locale } = useTranslation();
  const { session, isLoggedIn, isLoading: sessionLoading } = useSession();
  const [product, setProduct] = React.useState<ProductRecord | null>(null);
  const [style, setStyle] = React.useState<ProductStyleFile | null>(null);
  const [details, setDetails] = React.useState<ProductDetails>(
    createEmptyProductDetails(),
  );
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const mainCategoryId = product?.mainCategoryId ?? initialMain;
  const subcategoryId = product?.subcategoryId ?? initialSub;
  const editable = mode !== "view";
  const ownerAllowed =
    mode === "new" || !product || product.uid === session?.uid;
  const adminCategoryInfo = React.useMemo(() => {
    const numericMainId = Number(mainCategoryId);
    const main = categoryService
      .getDeveloperMainOptions()
      .find((option) => option.id === numericMainId);
    const sub = main
      ? categoryService
          .getDeveloperSubOptions(main.id, main.isCollection)
          .find((option) => option.value === subcategoryId)
      : undefined;
    return {
      mainName: main ? (locale === "ar" ? main.titleAr : main.titleEn) : "",
      subName: sub ? (locale === "ar" ? sub.titleAr : sub.titleEn) : "",
    };
  }, [locale, mainCategoryId, subcategoryId]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        let loadedProduct: ProductRecord | null = null;
        if (mode !== "new") {
          if (!productId) throw new Error("يلزم تحديد المنتج.");
          loadedProduct = await productApiService.get(productId);
          if (!cancelled) {
            setProduct(loadedProduct);
            setDetails(toProductDetails(loadedProduct));
          }
        } else {
          if (!initialMain || !initialSub)
            throw new Error("يلزم تحديد التصنيف الرئيسي والفرعي.");
          if (!cancelled) {
            setProduct(null);
            setDetails(
              initialMain === PHARMACY_MAIN_CATEGORY_ID &&
                initialSub === PHARMACY_SUBCATEGORY_ID
                ? createPharmacyInitialDetails(
                    initialPharmacyCategory,
                    initialPharmacySubcategory,
                  )
                : createEmptyProductDetails(),
            );
          }
        }

        const main = loadedProduct?.mainCategoryId ?? initialMain;
        const sub = loadedProduct?.subcategoryId ?? initialSub;
        let loadedStyle: ProductStyleFile;
        try {
          loadedStyle = await asolApi.getPublicJson<ProductStyleFile>(
            `/product/style/${encodeURIComponent(main)}__${encodeURIComponent(sub)}.json`,
          );
        } catch (styleError) {
          if (!(styleError instanceof ApiError) || styleError.status !== 404) {
            throw styleError;
          }
          loadedStyle = await asolApi.getPublicJson<ProductStyleFile>(
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
  }, [
    initialMain,
    initialPharmacyCategory,
    initialPharmacySubcategory,
    initialSub,
    mode,
    productId,
  ]);

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
              ...details,
              status: "active",
            })
          : await productApiService.update({
              id: productId,
              uid: session.uid,
              ...details,
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

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
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
        product={details}
        onProductChange={setDetails}
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
            ? "جار الحفظ..."
            : mode === "new"
              ? "إنشاء المنتج"
              : "حفظ التعديلات"}
        </button>
      ) : null}
      {mode === "view" && isSuperAdmin(session) ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-warning">
            {locale === "ar" ? "لوحة الإدارة الخارقة" : "Super Admin Panel"}
          </h3>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <AdminCopyValue
              label={locale === "ar" ? "معرف المنتج" : "Product ID"}
              value={productId || product?.id || ""}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              label={locale === "ar" ? "معرف المالك" : "Owner ID"}
              value={product?.uid || ""}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              label={locale === "ar" ? "التصنيف الرئيسي" : "Main Category"}
              value={adminCategoryInfo.mainName}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              label={locale === "ar" ? "معرف التصنيف الرئيسي" : "Main Category ID"}
              value={mainCategoryId}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              label={locale === "ar" ? "التصنيف الفرعي" : "Subcategory"}
              value={adminCategoryInfo.subName}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              label={locale === "ar" ? "معرف التصنيف الفرعي" : "Subcategory ID"}
              value={subcategoryId}
              onCopy={copyToClipboard}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function AdminCopyValue({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-high p-3">
      <span className="block text-on-surface-variant">{label}</span>
      <code className="mt-1 block break-all font-mono text-primary">
        {value || "-"}
      </code>
      {value ? (
        <button
          type="button"
          onClick={() => void onCopy(value)}
          className="mt-2 inline-flex items-center gap-1 rounded border border-outline-variant px-2 py-1 text-[10px]"
        >
          <Copy className="h-3 w-3" />
          نسخ
        </button>
      ) : null}
    </div>
  );
}
