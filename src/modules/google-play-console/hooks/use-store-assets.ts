"use client";

import * as React from "react";

import { validateGooglePlayImage } from "@asol/google-play-store-assets-core/images";
import type {
  GooglePlayImageType,
  GooglePlayStoreAssetsSnapshot,
  GooglePlayStoreListing,
} from "@asol/google-play-store-assets-core";
import { storeAssetsApiService } from "../services/store-assets-api-service";
import { useAuthHeaders } from "./use-auth-headers";
import { usePageSaveOperationScope } from "@/features/page-save/hooks/use-page-save-operation-scope";

export interface StagedStoreImageUpload {
  id: string;
  language: string;
  imageType: GooglePlayImageType;
  file: File;
}

export function useStoreAssets() {
  const headers = useAuthHeaders();
  const [snapshot, setSnapshot] = React.useState<GooglePlayStoreAssetsSnapshot | null>(null);
  const [details, setDetails] = React.useState<GooglePlayStoreAssetsSnapshot["details"]>({});
  const [listings, setListings] = React.useState<GooglePlayStoreListing[]>([]);
  const [language, setLanguage] = React.useState("ar");
  const [imageType, setImageType] = React.useState<GooglePlayImageType>("icon");
  const [stagedUploads, setStagedUploads] = React.useState<StagedStoreImageUpload[]>([]);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const assetOperations = usePageSaveOperationScope({
    id: "release-console-store-assets",
    label: "أصول متجر Google Play",
    returnPath: "/super-admin/release-console",
  });
  const apply = React.useCallback((next: GooglePlayStoreAssetsSnapshot) => {
    setSnapshot(next);
    setDetails(next.details);
    setListings(next.listings.length ? next.listings : [{ language: next.defaultLanguage || "ar" }]);
    setLanguage(next.defaultLanguage || "ar");
  }, []);
  const load = React.useCallback(async () => {
    if (!headers) return;
    setBusy("load");
    try { apply(await storeAssetsApiService.snapshot(headers)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "releaseConsole.errors.load"); }
    finally { setBusy(""); }
  }, [apply, headers]);
  React.useEffect(() => { void load(); }, [load]);

  const isTextDirty = React.useMemo(() => {
    if (!snapshot) return false;
    return (
      JSON.stringify({ details: snapshot.details, listings: snapshot.listings }) !==
      JSON.stringify({ details, listings })
    );
  }, [details, listings, snapshot]);

  const save = async (): Promise<boolean> => {
    if (!headers) return false;
    setBusy("save");
    try {
      apply((await storeAssetsApiService.save({ details, listings }, headers)).snapshot);
      return true;
    } finally {
      setBusy("");
    }
  };

  const queueUpload = (files: FileList | null) => {
    if (!files?.length) return;
    setStagedUploads((current) => [
      ...current,
      ...Array.from(files).map((file) => ({
        id: `${Date.now()}-${file.name}`,
        language,
        imageType,
        file,
      })),
    ]);
  };

  const flushStagedUploads = async (): Promise<boolean> => {
    if (!headers || stagedUploads.length === 0) return true;
    setBusy("upload");
    try {
      for (const staged of stagedUploads) {
        const dimensions = await imageDimensions(staged.file);
        const count =
          snapshot?.images.find(
            (group) =>
              group.language === staged.language &&
              group.imageType === staged.imageType,
          )?.images.length ?? 0;
        const validation = validateGooglePlayImage({
          imageType: staged.imageType,
          contentType: staged.file.type,
          size: staged.file.size,
          dimensions,
          existingCount: count,
        });
        if (!validation.ok) throw new Error(validation.message);
        const form = new FormData();
        form.set("language", staged.language);
        form.set("imageType", staged.imageType);
        form.set("file", staged.file);
        apply((await storeAssetsApiService.uploadImage(form, headers)).snapshot);
      }
      setStagedUploads([]);
      return true;
    } finally {
      setBusy("");
    }
  };

  const stageImageDelete = (id: string, itemLanguage: string, type: GooglePlayImageType) => {
    if (!headers) return;
    assetOperations.stage({
      itemId: `store-image-delete:${id}`,
      kind: "delete",
      label: `حذف صورة المتجر: ${itemLanguage} / ${type}`,
      execute: async () => {
        apply((await storeAssetsApiService.deleteImage({
          imageId: id, language: itemLanguage, imageType: type,
        }, headers)).snapshot);
      },
    });
  };
  const stageListingDelete = (itemLanguage: string) => {
    if (!headers) return;
    assetOperations.stage({
      itemId: `store-listing-delete:${itemLanguage}`,
      kind: "delete",
      label: `حذف بيانات المتجر للغة: ${itemLanguage}`,
      execute: async () => {
        apply((await storeAssetsApiService.deleteListing(itemLanguage, headers)).snapshot);
      },
    });
  };
  const stageBackupRestore = (name: string) => {
    if (!headers) return;
    assetOperations.stage({
      itemId: `store-backup-restore:${name}`,
      kind: "save",
      label: `استعادة نسخة صور المتجر: ${name}`,
      execute: async () => {
        apply((await storeAssetsApiService.restoreBackup(name, headers)).snapshot);
      },
    });
  };
  return {
    snapshot, details, setDetails, listings, setListings, language, setLanguage, imageType,
    setImageType, stagedUploads, isTextDirty, busy, error, load, save, queueUpload,
    flushStagedUploads, stageImageDelete, stageListingDelete, stageBackupRestore,
  };
}

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("releaseConsole.errors.imageDimensions")); };
    image.src = url;
  });
}
