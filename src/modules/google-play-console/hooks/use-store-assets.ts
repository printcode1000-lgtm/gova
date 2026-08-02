"use client";

import * as React from "react";

import { validateGooglePlayImage } from "../domain/image-validation";
import type {
  GooglePlayImageType,
  GooglePlayStoreAssetsSnapshot,
  GooglePlayStoreListing,
} from "../domain/store-assets-types";
import { storeAssetsApiService } from "../services/store-assets-api-service";
import { useAuthHeaders } from "./use-auth-headers";

export function useStoreAssets() {
  const headers = useAuthHeaders();
  const [snapshot, setSnapshot] = React.useState<GooglePlayStoreAssetsSnapshot | null>(null);
  const [details, setDetails] = React.useState<GooglePlayStoreAssetsSnapshot["details"]>({});
  const [listings, setListings] = React.useState<GooglePlayStoreListing[]>([]);
  const [language, setLanguage] = React.useState("ar");
  const [imageType, setImageType] = React.useState<GooglePlayImageType>("icon");
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
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
  const save = async () => {
    if (!headers) return;
    setBusy("save");
    try { apply((await storeAssetsApiService.save({ details, listings }, headers)).snapshot); }
    finally { setBusy(""); }
  };
  const upload = async (files: FileList | null) => {
    if (!headers || !files?.length) return;
    setBusy("upload");
    try {
      for (const file of Array.from(files)) {
        const dimensions = await imageDimensions(file);
        const count = snapshot?.images.find(
          (group) => group.language === language && group.imageType === imageType,
        )?.images.length ?? 0;
        const validation = validateGooglePlayImage({
          imageType, contentType: file.type, size: file.size, dimensions, existingCount: count,
        });
        if (!validation.ok) throw new Error(validation.message);
        const form = new FormData();
        form.set("language", language); form.set("imageType", imageType); form.set("file", file);
        apply((await storeAssetsApiService.uploadImage(form, headers)).snapshot);
      }
    } finally { setBusy(""); }
  };
  const removeImage = async (id: string, itemLanguage: string, type: GooglePlayImageType) => {
    if (headers) apply((await storeAssetsApiService.deleteImage({
      imageId: id, language: itemLanguage, imageType: type,
    }, headers)).snapshot);
  };
  const removeListing = async (itemLanguage: string) => {
    if (headers) apply((await storeAssetsApiService.deleteListing(itemLanguage, headers)).snapshot);
  };
  const restore = async (name: string) => {
    if (headers) apply((await storeAssetsApiService.restoreBackup(name, headers)).snapshot);
  };
  return {
    snapshot, details, setDetails, listings, setListings, language, setLanguage, imageType,
    setImageType, busy, error, load, save, upload, removeImage, removeListing, restore,
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
