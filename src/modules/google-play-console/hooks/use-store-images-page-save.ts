"use client";



import { usePageSaveRegistration } from "@/features/page-save/hooks/use-page-save-registration";

import { buildImageUploadPageSaveItem } from "@/features/page-save/utils/page-save-image-items";

import type { useStoreAssets } from "./use-store-assets";




type StoreAssets = ReturnType<typeof useStoreAssets>;



export function useStoreImagesPageSave(store: StoreAssets, active: boolean): void {




  usePageSaveRegistration({

    id: "release-console-store-images",

    label: "صور Google Play",

    returnPath: "/dev/release-console?tab=store-images",

    enabled: active && Boolean(store.snapshot) && store.stagedUploads.length > 0,

    items: [

      buildImageUploadPageSaveItem({

        id: "store-images",

        label: "رفع صور المتجر",

        hasPending: store.stagedUploads.length > 0,

        canSave: store.stagedUploads.length > 0 && store.busy !== "upload",


      }),

    ],

    isSaving: store.busy === "upload",

    canSave: store.stagedUploads.length > 0 && store.busy !== "upload",

    save: async (selectedItemIds) => {

      if (!selectedItemIds.includes("store-images")) return true;

      return store.flushStagedUploads();

    },

  });

}

