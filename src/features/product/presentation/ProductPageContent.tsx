"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, Share2, UserCircle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { useSessionRuntime } from "@/shared/session-runtime";
import { useTranslation } from "@/shared/i18n";
import { isSuperAdminSession } from "@asol/auth-core";
import { categoryService } from "@/features/categories";
import type {
  ProductDetails,
  ProductRecord,
} from "@/features/product";
import { productApiService } from "@/features/product/application/services/product-api-service";
import { createProductCardViewModel } from "@asol/product-card-core";
import { favoriteFromProductCard } from "@asol/favorites-core";
import { FavoriteButton } from "@asol/favorites-core/ui";
import { specialtyChatClient } from "@/features/specialty-chat";
import type { StorageImageManagerHandle } from "@/features/storage/ui";
import { ProductComponentsRenderer } from "./ProductComponentsRenderer";
import type { ProductStyleComponents } from "./product-component.types";
import { createDefaultProductStyleComponents } from "@/shared/ui/product-style-settings";
import { usePageSaveRegistration } from "@/features/page-save/ui";
import { buildImageUploadPageSaveItem } from "@/features/page-save";
import { buildPageSaveOperationDescription } from "@/features/page-save";
import {
  buildProductShareUrl,
  ShareMenu,
} from "@/features/sharing";
import { AdminCopyValue } from "./AdminCopyValue";
import { productPageClipboard } from "./product-page-clipboard";
import { productPageRouteModel } from "./product-page-route-model";
import { useProductPageLoader } from "./use-product-page-loader";

function getProductImageKeysFingerprint(
  images: ProductDetails["images"],
): string {
  return JSON.stringify(
    images.map((image) => image.imageKey).filter(Boolean),
  );
}


export function ProductPageContent({ id,
  initialProduct = null,
}: {
  initialProduct?: ProductRecord | null;
} & { id?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    mode,
    productId,
    initialMain,
    initialSub,
    initialPharmacyCategory,
    initialPharmacySubcategory,
    returnUrl,
  } = productPageRouteModel(searchParams);
  const { locale, formatApiError, t } = useTranslation();
  const { session, isLoggedIn, isLoading: sessionLoading } = useSessionRuntime();
  const [saving, setSaving] = React.useState(false);
  const [openingConversation, setOpeningConversation] = React.useState(false);
  const imageUploadRef = React.useRef<StorageImageManagerHandle | null>(null);
  const [imagesPending, setImagesPending] = React.useState(false);
  const {
    product,
    setProduct,
    style,
    details,
    detailsRef,
    updateDetails,
    loading,
    error,
    setError,
  } = useProductPageLoader({
    initialProduct,
    mode,
    productId,
    initialMain,
    initialSub,
    initialPharmacyCategory,
    initialPharmacySubcategory,
    formatApiError,
  });

  const mainCategoryId = product?.mainCategoryId ?? initialMain;
  const subcategoryId = product?.subcategoryId ?? initialSub;
  const editable = mode !== "view";
  const productShareUrl = React.useMemo(() => {
    const id = product?.id || productId;
    if (mode !== "view" || !id) return "";
    return buildProductShareUrl(id);
  }, [mode, product?.id, productId]);
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


  const productShareTitle =
    details.mainData.name ||
    (locale === "ar"
      ? details.pharmacySpecs.nameAr || details.pharmacySpecs.nameEn
      : details.pharmacySpecs.nameEn || details.pharmacySpecs.nameAr) ||
    (locale === "ar" ? "منتج على ASOL" : "Product on ASOL");
  const productShareText =
    details.mainData.description ||
    details.price.label ||
    (locale === "ar"
      ? "شاهد تفاصيل المنتج على ASOL"
      : "View product details on ASOL");

  const shareAction =
    mode === "view" && productShareUrl ? (
      <ShareMenu
        locale={locale}
        content={{
          kind: "product",
          title: productShareTitle,
          text: productShareText,
          url: productShareUrl,
          imageUrl: details.images.find((image) => image.url)?.url,
        }}
        trigger={
          <Button type="button" variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            {locale === "ar" ? "مشاركة المنتج" : "Share product"}
          </Button>
        }
      />
    ) : null;
  const profileAction =
    mode === "view" && product?.uid ? (
      <Button asChild variant="outline" className="gap-2">
        <Link
          href={`/profile?mode=preview&uid=${encodeURIComponent(product.uid)}`}
        >
          <UserCircle className="h-4 w-4" />
          {locale === "ar" ? "بروفايل صاحب المنتج" : "Owner profile"}
        </Link>
      </Button>
    ) : null;
  const favoriteAction =
    mode === "view" && product ? (
      <FavoriteButton
        item={favoriteFromProductCard(createProductCardViewModel(product))}
        label={locale === "ar" ? "المفضلة" : "Favorite"}
        className="h-10 w-auto gap-2 rounded-xl px-4"
      />
    ) : null;

  const openSellerConversation = async () => {
    if (!product?.uid || !product.id) return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.uid === product.uid) {
      setError(
        locale === "ar"
          ? "لا يمكن بدء محادثة مع حسابك نفسه."
          : "You cannot start a conversation with your own account.",
      );
      return;
    }
    setOpeningConversation(true);
    setError("");
    try {
      const requestId = `req_${crypto.randomUUID().replace(/-/g, "")}`;
      const productName = productShareTitle;
      const result = await specialtyChatClient.startProductConversation(
        session,
        {
          requestId,
          sellerUid: product.uid,
          productId: product.id,
          productName,
          message:
            locale === "ar"
              ? `أرغب في الاستفسار عن المنتج: ${productName}`
              : `I would like to ask about: ${productName}`,
        },
      );
      router.push(
        `/notifications/chat?conversationId=${encodeURIComponent(result.conversationKey)}`,
      );
    } catch (conversationError) {
      setError(
        conversationError instanceof Error &&
          conversationError.message === "specialtyChatRecipientUnavailable"
          ? locale === "ar"
            ? "لا يمكن الوصول إلى صاحب المنتج حاليًا."
            : "The product owner is currently unavailable."
          : locale === "ar"
            ? "تعذر فتح المحادثة. حاول مرة أخرى."
            : "Unable to open the conversation. Try again.",
      );
    } finally {
      setOpeningConversation(false);
    }
  };
  const contactAction = mode === "view" && product?.uid ? (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      disabled={openingConversation}
      onClick={() => void openSellerConversation()}
    >
      <MessageCircle className="h-4 w-4" />
      {openingConversation
        ? locale === "ar"
          ? "جار فتح المحادثة..."
          : "Opening chat..."
        : locale === "ar"
          ? "مراسلة صاحب المنتج"
          : "Message seller"}
    </Button>
  ) : null;

  const [savedBaseline, setSavedBaseline] = React.useState("");
  React.useEffect(() => {
    if (loading) return;
    setSavedBaseline(JSON.stringify(detailsRef.current));
  }, [loading, mode, product?.id]);

  const isProductDirty = React.useMemo(
    () => JSON.stringify(details) !== savedBaseline,
    [details, savedBaseline],
  );

  const imageKeysDirty = React.useMemo(() => {
    if (!savedBaseline) return imagesPending;
    try {
      const baseline = JSON.parse(savedBaseline) as ProductDetails;
      return (
        getProductImageKeysFingerprint(details.images) !==
        getProductImageKeysFingerprint(baseline.images)
      );
    } catch {
      return imagesPending;
    }
  }, [details.images, imagesPending, savedBaseline]);

  const uploadProductImages = async (): Promise<boolean> => {
    const imagesUploaded = await imageUploadRef.current?.uploadPending();
    if (imagesUploaded === false) {
      setError(
        locale === "ar"
          ? "تعذر رفع إحدى الصور."
          : "An image could not be uploaded.",
      );
      return false;
    }
    if (imageUploadRef.current?.hasPending()) {
      setError(
        locale === "ar"
          ? "لا تزال هناك صور بانتظار الرفع."
          : "Some images are still pending upload.",
      );
      return false;
    }
    const currentDetails = detailsRef.current;
    if (
      currentDetails.images.some(
        (image) => !image.imageKey || image.isUploading || image.error,
      )
    ) {
      setError(
        locale === "ar"
          ? "لم يكتمل رفع جميع الصور."
          : "Not all images have finished uploading.",
      );
      return false;
    }
    return true;
  };

  const saveProductDetails = async (): Promise<boolean> => {
    if (!session?.uid || !ownerAllowed) return false;
    setSaving(true);
    setError("");
    try {
      const currentDetails = detailsRef.current;
      const saved =
        mode === "new"
          ? await productApiService.create({
              uid: session.uid,
              mainCategoryId,
              subcategoryId,
              ...currentDetails,
              status: "active",
            })
          : await productApiService.update({
              id: productId,
              uid: session.uid,
              ...currentDetails,
              status: product?.status,
            });
      setSavedBaseline(JSON.stringify(currentDetails));
      if (returnUrl) {
        router.replace(returnUrl);
      } else {
        router.replace(
          `/product?mode=view&productId=${encodeURIComponent(saved.id)}&mainCategoryId=${encodeURIComponent(saved.mainCategoryId)}&subcategoryId=${encodeURIComponent(saved.subcategoryId)}`,
        );
      }
      return true;
    } catch (saveError) {
      setError(formatApiError(saveError));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = async (): Promise<boolean> => {
    if (!(await uploadProductImages())) return false;
    return saveProductDetails();
  };

  const imageChanges = React.useMemo(() => {
    const hasUpload = imagesPending;
    const hasDelete = (() => {
      if (!savedBaseline) return false;
      try {
        const baseline = JSON.parse(savedBaseline) as ProductDetails;
        const baselineKeys = baseline.images
          .map((image) => image.imageKey)
          .filter(Boolean);
        const currentKeys = details.images
          .map((image) => image.imageKey)
          .filter(Boolean);
        return baselineKeys.some((key) => !currentKeys.includes(key));
      } catch {
        return false;
      }
    })();
    return {
      hasUpload,
      hasDelete,
      hasUnsavedKeys: imageKeysDirty && !hasUpload,
    };
  }, [details.images, imageKeysDirty, imagesPending, savedBaseline]);

  const pageSaveItems = React.useMemo(
    () => [
      buildImageUploadPageSaveItem({
        id: "product-images",
        label: locale === "ar" ? "صور المنتج" : "Product images",
        hasPending:
          imageChanges.hasUpload ||
          imageChanges.hasDelete ||
          imageChanges.hasUnsavedKeys,
        hasPendingUpload: imageChanges.hasUpload || imageChanges.hasUnsavedKeys,
        hasPendingDelete: imageChanges.hasDelete,
        t,
      }),
      {
        id: "product-details",
        label: locale === "ar" ? "بيانات المنتج" : "Product details",
        isDirty: isProductDirty,
        canSave: isProductDirty && !saving,
        description: buildPageSaveOperationDescription(t, ["save"]),
      },
    ],
    [imageChanges, isProductDirty, locale, saving, t],
  );

  usePageSaveRegistration({
    id: `product-${mode}-${productId || "new"}`,
    label:
      locale === "ar"
        ? mode === "new"
          ? "منتج جديد"
          : "تعديل المنتج"
        : mode === "new"
          ? "New product"
          : "Edit product",
    returnPath: `/product?${searchParams.toString()}`,
    enabled: editable && ownerAllowed,
    items: pageSaveItems,
    isSaving: saving,
    canSave:
      (isProductDirty || imagesPending || imageKeysDirty) && !saving,
    prepareForSave: async (selectedItemIds) => {
      if (!selectedItemIds.includes("product-images")) return true;
      return uploadProductImages();
    },
    save: async (selectedItemIds) => {
      const shouldPersistDetails =
        selectedItemIds.includes("product-details") ||
        (selectedItemIds.includes("product-images") && imageKeysDirty);
      if (!shouldPersistDetails) return true;
      return saveProductDetails();
    },
  });

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    await productPageClipboard.write(text);
  };

  if (loading || sessionLoading)
    return (
      <div id={id} className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner id="product-page-content-product-page-content-loading-spinner-e925d5" size="lg" />
      </div>
    );

  if (error && !style)
    return (
      <p id={id} className="m-6 rounded-2xl bg-destructive/10 p-5 text-center text-destructive">
        {error}
      </p>
    );

  if (editable && !isLoggedIn)
    return (
      <div id={id} className="m-6 rounded-2xl border p-6 text-center">
        <p id="features-product-presentation-productpagecontent-text-4-hvmpoo">يجب تسجيل الدخول لإنشاء المنتج أو تعديله.</p>
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
      <p id={id} className="m-6 rounded-2xl bg-destructive/10 p-5 text-center text-destructive">
        لا يمكنك تعديل منتج يخص مستخدمًا آخر.
      </p>
    );

  return (
    <main id={id} className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6">
      <ProductComponentsRenderer
        mode={mode}
        components={style?.components ?? createDefaultProductStyleComponents()}
        product={details}
        onProductChange={updateDetails}
        productId={product?.id ?? ""}
        ownerUid={product?.uid ?? session?.uid ?? ""}
        mainCategoryId={mainCategoryId}
        shareAction={shareAction}
        profileAction={profileAction}
        favoriteAction={favoriteAction}
        contactAction={contactAction}
        imageUploadRef={imageUploadRef}
        onImagesPendingChange={setImagesPending}
      />
      {error ? (
        <p id="features-product-presentation-productpagecontent-text-7-9m8xym" className="rounded-xl bg-destructive/10 p-3 text-destructive">
          {error}
        </p>
      ) : null}
      {mode === "view" && isSuperAdminSession(session) ? (
        <div id="features-product-presentation-productpagecontent-div-8-zatlbb" className="rounded-2xl border border-warning/30 bg-warning/5 p-4 sm:p-5">
          <h3 id="features-product-presentation-productpagecontent-heading-9-5dynra" className="text-sm font-semibold text-warning">
            {locale === "ar" ? "لوحة الإدارة الخارقة" : "Super Admin Panel"}
          </h3>
          <div id="features-product-presentation-productpagecontent-div-10-5wcqum" className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <AdminCopyValue
              id='features-product-presentation-productpagecontent-admincopyvalue-11-a0hery'
              label={locale === "ar" ? "معرف المنتج" : "Product ID"}
              value={productId || product?.id || ""}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              id='features-product-presentation-productpagecontent-admincopyvalue-12-xdgfsu'
              label={locale === "ar" ? "معرف المالك" : "Owner ID"}
              value={product?.uid || ""}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              id='features-product-presentation-productpagecontent-admincopyvalue-13-slzveq'
              label={locale === "ar" ? "التصنيف الرئيسي" : "Main Category"}
              value={adminCategoryInfo.mainName}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              id='features-product-presentation-productpagecontent-admincopyvalue-14-8bqrld'
              label={
                locale === "ar" ? "معرف التصنيف الرئيسي" : "Main Category ID"
              }
              value={mainCategoryId}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              id='features-product-presentation-productpagecontent-admincopyvalue-15-pzpsba'
              label={locale === "ar" ? "التصنيف الفرعي" : "Subcategory"}
              value={adminCategoryInfo.subName}
              onCopy={copyToClipboard}
            />
            <AdminCopyValue
              id='features-product-presentation-productpagecontent-admincopyvalue-16-y0m9su'
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

