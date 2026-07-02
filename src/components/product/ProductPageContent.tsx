"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { govaApi } from "@/core/api";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSession } from "@/features/auth/components/SessionProvider";
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

interface ProductPageContentProps {
  mode: ProductMode;
  productId: string;
  mainCategoryId: string;
  subcategoryId: string;
}

interface ProductStyleFile {
  components: ProductStyleComponents;
}

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
  const editable = mode !== "view";
  const ownerAllowed =
    mode === "new" || !product || product.uid === session?.uid;

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
            setProduct(null);
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
      <ProductComponentsRenderer
        mode={mode}
        components={style?.components ?? {}}
        fields={fields}
        onFieldsChange={setFields}
        images={images}
        onImagesChange={setImages}
        productId={product?.id ?? ""}
        ownerUid={product?.uid ?? session?.uid ?? ""}
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
    </main>
  );
}
