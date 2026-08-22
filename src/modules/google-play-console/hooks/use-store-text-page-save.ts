"use client";

import { usePageSaveRegistration } from "@/features/page-save/hooks/use-page-save-registration";
import type { useStoreAssets } from "./use-store-assets";

type StoreAssets = ReturnType<typeof useStoreAssets>;

export function useStoreTextPageSave(
  store: StoreAssets,
  active: boolean,
  acknowledged: boolean,
): void {

  usePageSaveRegistration({
    id: "release-console-store-text",
    label: "نصوص Google Play",
    returnPath: "/dev/release-console?tab=store-text",
    enabled: active && Boolean(store.snapshot) && store.isTextDirty,
    items: [
      {
        id: "store-text",
        label: "تفاصيل المتجر والقوائم",
        isDirty: store.isTextDirty,
        canSave: store.isTextDirty && acknowledged && store.busy !== "save",
      },
    ],
    isSaving: store.busy === "save",
    canSave: store.isTextDirty && acknowledged && store.busy !== "save",
    save: async (selectedItemIds) => {
      if (!selectedItemIds.includes("store-text")) return true;
      return store.save();
    },
  });
}
