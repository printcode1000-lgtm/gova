"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { HeroSliderConfig } from "@/components/ui/HeroSlider";
import { ASOL_DB_STORES, asolDbDelete } from "@asol/data-core/browser";
import {
  HOME_HERO_CACHE_KEY,
  normalizeHomeHeroConfigForPersist,
  type HomeHeroRecord,
  type SuperAdminIdentity,
} from "@asol/hero-slider-core";
import { homeHeroSliderApiService } from "@/features/advertisements/services/home-hero-slider-api-service";
import { notifyHomeHeroSliderUpdated } from "@/features/advertisements/home-hero-slider-sync";
import type { StorageImageManagerHandle } from "@/features/storage/components/StorageImageManager";
import { reportSystemIssue } from "@asol/system-logs-core";
import {
  heroSliderFingerprint,
  heroSliderHasRemovedImages,
  heroSliderImagesFingerprint,
  isHeroSliderConfigReadyToPersist,
} from "./super-admin-hero-slider-save-model";

const saveErrorMessages: Record<string, string> = {
  forbidden: "غير مصرح لك بهذه العملية.",
  invalidHeroSliderConfig: "إعداد الشرائح غير صالح، يرجى مراجعة البيانات.",
};

/**
 * Only the storage warning is worth surfacing here; the page-save dialog owns
 * the generic success and failure wording.
 */
function formatSaveWarning(saved: HomeHeroRecord): string | null {
  return saved.storageWarning === "imageDeleteFailed"
    ? "تعذر حذف ملف صورة قديم من التخزين."
    : null;
}

function formatSaveError(error: unknown): string | null {
  const rawMessage = error instanceof Error ? error.message : "";
  return saveErrorMessages[rawMessage] ?? rawMessage ?? null;
}

function hasPendingUploads(
  imageUploadRef: RefObject<StorageImageManagerHandle | null>,
): boolean {
  return imageUploadRef.current?.hasPending() ?? false;
}

export function useSuperAdminHeroSliderSave({
  session,
  record,
  config,
  intervalMinutes,
  getConfig,
  getIntervalMinutes,
  imageUploadRef,
  imagesPending,
  onSaved,
}: {
  session: SuperAdminIdentity | null;
  record: HomeHeroRecord | null;
  config: HeroSliderConfig | null;
  intervalMinutes: number;
  getConfig: () => HeroSliderConfig | null;
  getIntervalMinutes: () => number;
  imageUploadRef: RefObject<StorageImageManagerHandle | null>;
  imagesPending: boolean;
  onSaved: (saved: HomeHeroRecord) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const [savedImagesFingerprint, setSavedImagesFingerprint] = useState<
    string | null
  >(null);
  const persistInFlightRef = useRef(false);

  useEffect(() => {
    if (!record) return;
    setSavedFingerprint(
      heroSliderFingerprint(record.config, record.checkIntervalMinutes),
    );
    setSavedImagesFingerprint(heroSliderImagesFingerprint(record.config));
  }, [record?.version, record?.checkIntervalMinutes]);

  const uploadPendingImages = useCallback(async (): Promise<boolean> => {
    if (hasPendingUploads(imageUploadRef)) {
      const uploaded = await imageUploadRef.current!.uploadPending();
      if (!uploaded) {
        setMessage("تعذر إكمال رفع الصور.");
        return false;
      }
    }
    if (imageUploadRef.current?.hasPending()) {
      setMessage("لا تزال هناك صور بانتظار الرفع.");
      return false;
    }
    const configToSave = getConfig();
    if (configToSave && !isHeroSliderConfigReadyToPersist(configToSave)) {
      setMessage("أكمل رفع الصور لكل الشرائح.");
      return false;
    }
    return true;
  }, [getConfig, imageUploadRef]);

  const persistConfig = useCallback(async () => {
    if (!session || !record || persistInFlightRef.current) {
      return false;
    }

    persistInFlightRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const configToSave = getConfig();
      const intervalToSave = getIntervalMinutes();
      if (!configToSave) return false;

      if (!isHeroSliderConfigReadyToPersist(configToSave)) {
        setMessage("أكمل رفع الصور لكل الشرائح.");
        return false;
      }

      const saved = await homeHeroSliderApiService.save(
        session,
        normalizeHomeHeroConfigForPersist(configToSave),
        intervalToSave,
      );
      try {
        await asolDbDelete(ASOL_DB_STORES.APP_SETTINGS, HOME_HERO_CACHE_KEY);
      } catch (error) {
        reportSystemIssue({
          level: "warning",
          feature: "HeroSliderAdmin",
          operation: "invalidate-home-cache",
          error,
        });
      }
      onSaved(saved);
      setSavedFingerprint(
        heroSliderFingerprint(saved.config, saved.checkIntervalMinutes),
      );
      setSavedImagesFingerprint(heroSliderImagesFingerprint(saved.config));
      notifyHomeHeroSliderUpdated();
      setMessage(formatSaveWarning(saved));
      return true;
    } catch (error) {
      reportSystemIssue({
        feature: "HeroSliderAdmin",
        operation: "save",
        error,
      });
      setMessage(formatSaveError(error));
      return false;
    } finally {
      persistInFlightRef.current = false;
      setBusy(false);
    }
  }, [getConfig, getIntervalMinutes, onSaved, record, session]);

  const persist = useCallback(async () => {
    if (!(await uploadPendingImages())) return false;
    return persistConfig();
  }, [persistConfig, uploadPendingImages]);

  const saveNow = useCallback(async () => {
    return persist();
  }, [persist]);

  const isDirty =
    Boolean(config) &&
    savedFingerprint !== null &&
    heroSliderFingerprint(config!, intervalMinutes) !== savedFingerprint;

  const imagesConfigDirty =
    Boolean(config) &&
    savedImagesFingerprint !== null &&
    heroSliderImagesFingerprint(config!) !== savedImagesFingerprint;

  const imagesRemoved =
    Boolean(config) &&
    Boolean(record) &&
    heroSliderHasRemovedImages(record!.config, config!);

  const imagesDirty = imagesPending || imagesConfigDirty || imagesRemoved;
  const configReady = config ? isHeroSliderConfigReadyToPersist(config) : false;
  const hasUnpublishedDraft = isDirty || imagesPending;
  const canPersist = Boolean(config) && hasUnpublishedDraft && !busy;
  const imagesItemCanSave =
    Boolean(config) &&
    imagesDirty &&
    !busy &&
    (imagesPending || configReady);
  const configItemCanSave = Boolean(config) && isDirty && !busy && configReady;

  return {
    busy,
    message,
    setMessage,
    saveNow,
    uploadPendingImages,
    persistConfig,
    isDirty,
    imagesDirty,
    imagesConfigDirty,
    imagesRemoved,
    configReady,
    canPersist,
    imagesItemCanSave,
    configItemCanSave,
    hasUnpublishedDraft,
  };
}
