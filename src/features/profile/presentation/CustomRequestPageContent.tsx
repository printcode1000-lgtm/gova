"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2 } from "lucide-react";

import { ASOL_API_ROUTES, asolApi } from "@/core/api";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useStoreDetails } from "@/features/profile/hooks/use-store-details";
import { StorageProfiles, type StoredImage } from "@asol/storage-core";
import {
  StorageImageManager,
  type StorageImageManagerHandle,
} from "@/features/storage/components/StorageImageManager";
import { usePageSaveRegistration } from "@/features/page-save/hooks/use-page-save-registration";
import { buildImageUploadPageSaveItem } from "@/features/page-save/utils/page-save-image-items";
import { buildPageSaveOperationDescription } from "@/features/page-save/utils/page-save-operation-description";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";

function normalizeCustomRequestImages(
  images: Array<StoredImage | null | undefined>,
): StoredImage[] {
  return images
    .filter(
      (image): image is StoredImage =>
        Boolean(image && (image.url || image.isUploading || image.error)),
    )
    .slice(0, 4);
}

type ResultState = { kind: "error"; message: string } | null;

/**
 * Full-page counterpart of the profile-page custom-request dialog.
 *
 * Reads `sellerUid` from the query string rather than a parent component's
 * closure, so the page works from any link — the profile action tile,
 * a shared URL, a future entry point — without depending on the profile page
 * model still being mounted.
 */
export function CustomRequestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellerUid = (searchParams.get("sellerUid") ?? "").trim();
  const { session, isLoading } = useSession();
  const { locale, isRTL, t } = useTranslation();
  const { details: sellerDetails, isLoading: isLoadingSeller } =
    useStoreDetails(sellerUid || undefined);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [images, setImages] = React.useState<StoredImage[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ResultState>(null);

  const copy = locale === "ar" ? {
    subtitle: "اكتب وصف الطلب ويمكنك إضافة حتى 4 صور. الصور اختيارية.",
    titleLabel: "عنوان الطلب",
    titlePlaceholder: "مثال: أحتاج خدمة خاصة",
    descriptionLabel: "وصف الطلب",
    descriptionPlaceholder: "اكتب تفاصيل الطلب المطلوب...",
    images: "الصور",
    pageLabel: "طلب خاص",
    requestItem: "إرسال الطلب الخاص",
    imagesItem: "صور الطلب الخاص",
    validation: "اكتب وصف الطلب أو أضف صورة واحدة على الأقل.",
    failure: "تعذر إرسال الطلب الخاص. حاول مرة أخرى.",
    invalidSeller: "رابط الطلب غير صالح.",
    login: "يجب تسجيل الدخول لإرسال طلب خاص.",
    signIn: "تسجيل الدخول",
    back: "رجوع",
  } : {
    subtitle: "Describe your request and add up to 4 optional images.",
    titleLabel: "Request title",
    titlePlaceholder: "e.g. I need a custom service",
    descriptionLabel: "Request description",
    descriptionPlaceholder: "Describe exactly what you need...",
    images: "Images",
    pageLabel: "Custom request",
    requestItem: "Send custom request",
    imagesItem: "Custom request images",
    validation: "Write a description or add at least one image.",
    failure: "Unable to send the request. Try again.",
    invalidSeller: "This request link is invalid.",
    login: "Sign in to send a custom request.",
    signIn: "Sign in",
    back: "Back",
  };

  const canSubmit = description.trim().length > 0 || images.length > 0;
  const sellerName =
    sellerDetails.storeName || t("profilePreview.sellerFallback");

  const imageManagerRefs = React.useRef<(StorageImageManagerHandle | null)[]>([]);
  const imagesRef = React.useRef(images);
  imagesRef.current = images;

  const uploadStagedImages = React.useCallback(async () => {
    const pending = imageManagerRefs.current.filter(
      (manager): manager is StorageImageManagerHandle =>
        Boolean(manager?.hasPending()),
    );
    for (const manager of pending) {
      if (!(await manager.uploadPending())) return false;
    }
    return true;
  }, []);

  const submitRequest = React.useCallback(async () => {
    if (!session?.uid || !sellerUid) return false;
    setBusy(true);
    setResult(null);
    try {
      const response = await asolApi.post<{ orderId: string }>(
        ASOL_API_ROUTES.orders.customRequestFromProfile,
        {
          uid: session.uid,
          phone: session.phone,
          sellerUid,
          title: title.trim(),
          description: description.trim(),
          images: imagesRef.current.map((image) => ({
            imageKey: image.imageKey,
            url: image.url,
          })),
        },
        { suppressErrorLog: true },
      );
      router.push(
        `/orders/details?orderId=${encodeURIComponent(response.orderId)}&role=buyer`,
      );
      return true;
    } catch (error) {
      setResult({
        kind: "error",
        message: error instanceof Error ? error.message : copy.failure,
      });
      return false;
    } finally {
      setBusy(false);
    }
  }, [copy.failure, description, router, sellerUid, session?.phone, session?.uid, title]);

  const [pendingImageSlots, setPendingImageSlots] = React.useState<boolean[]>([]);
  const hasStagedImages = pendingImageSlots.some(Boolean);

  const pageSaveItems = React.useMemo(
    () => [
      ...(hasStagedImages
        ? [
            buildImageUploadPageSaveItem({
              id: "custom-request-images",
              label: copy.imagesItem,
              hasPending: true,
              t,
            }),
          ]
        : []),
      {
        id: "custom-request",
        label: copy.requestItem,
        operation: "save" as const,
        isDirty: canSubmit,
        canSave: canSubmit,
        description: buildPageSaveOperationDescription(t, ["save"]),
      },
    ],
    [canSubmit, copy.imagesItem, copy.requestItem, hasStagedImages, t],
  );

  usePageSaveRegistration({
    id: "custom-request",
    label: copy.pageLabel,
    returnPath: `/custom-request?sellerUid=${encodeURIComponent(sellerUid)}`,
    enabled: Boolean(sellerUid && session?.uid),
    items: pageSaveItems,
    isSaving: busy,
    canSave: canSubmit,
    prepareForSave: uploadStagedImages,
    save: async (selectedItemIds) => {
      if (!selectedItemIds.includes("custom-request")) return true;
      return submitRequest();
    },
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </main>
    );
  }

  if (!sellerUid) {
    return (
      <main className="mx-auto max-w-xl px-4 py-14 text-center">
        <p className="text-on-surface-variant">{copy.invalidSeller}</p>
      </main>
    );
  }

  if (!session?.uid) {
    return (
      <main className="mx-auto max-w-xl px-4 py-14 text-center">
        <ImagePlus className="mx-auto h-12 w-12 text-primary" />
        <p className="mt-4 text-on-surface-variant">{copy.login}</p>
        <a
          href="/login"
          className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-bold text-on-primary"
        >
          {copy.signIn}
        </a>
      </main>
    );
  }

  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="mb-5 flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="asol-control-icon mt-1 shrink-0 rounded-full"
          aria-label={copy.back}
        >
          <ArrowLeft className={isRTL ? "h-5 w-5 rotate-180" : "h-5 w-5"} />
        </button>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary">
          <ImagePlus className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">
            {t("profilePreview.customRequestTo")} {isLoadingSeller ? "…" : sellerName}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
            {copy.subtitle}
          </p>
        </div>
      </div>

      <div className="space-y-6 rounded-3xl border border-outline-variant bg-surface p-4 shadow-sm sm:p-6">
        <fieldset disabled={busy} className="min-w-0 space-y-6 disabled:opacity-70">
          <div className="space-y-2">
            <label className="text-sm font-bold" htmlFor="custom-request-title">
              {copy.titleLabel}
            </label>
            <Input
              id="custom-request-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={copy.titlePlaceholder}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold" htmlFor="custom-request-description">
              {copy.descriptionLabel}
            </label>
            <Textarea
              id="custom-request-description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setResult(null);
              }}
              placeholder={copy.descriptionPlaceholder}
              rows={6}
              maxLength={1200}
              className="min-h-40 resize-y"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold">{copy.images}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <StorageImageManager
                  key={index}
                  ref={(handle) => {
                    imageManagerRefs.current[index] = handle;
                  }}
                  onPendingChange={(pending) => {
                    setPendingImageSlots((current) => {
                      if (current[index] === pending) return current;
                      const next = [...current];
                      next[index] = pending;
                      return next;
                    });
                  }}
                  config={{
                    id: `custom-request-image-${index + 1}`,
                    storageProfileId: StorageProfiles.SpicialOrder,
                    storageScope: "custom-request",
                    maxItems: 1,
                    aspectRatio: "square",
                    allowReplace: true,
                    deleteFromStorageOnRemove: true,
                  }}
                  value={images[index] ? [images[index]] : []}
                  onChange={(slot) => {
                    const next: Array<StoredImage | null> = [...images];
                    if (slot[0]) next[index] = slot[0];
                    else next[index] = null;
                    setImages(normalizeCustomRequestImages(next));
                    setResult(null);
                  }}
                />
              ))}
            </div>
          </div>
        </fieldset>

        {result ? (
          <p
            className="rounded-2xl bg-error/15 px-4 py-3 text-sm font-semibold leading-6 text-error"
            role="alert"
          >
            {result.message}
          </p>
        ) : !canSubmit ? (
          <p className="text-xs text-on-surface-variant">{copy.validation}</p>
        ) : null}
      </div>
    </main>
  );
}
