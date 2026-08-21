"use client";

import { Image as ImageIcon, LayoutTemplate } from "lucide-react";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import {
  StorageImageManager,
  type StorageImageManagerConfig,
  type StorageImageManagerHandle,
} from "@/features/storage/components/StorageImageManager";
import type { StoredImage } from "@asol/storage-core";
import type * as React from "react";

export function StoreIdentityImagesEditor({
  imageTab,
  setImageTab,
  logoManagerRef,
  heroManagerRef,
  logoImage,
  storeLogoConfig,
  heroConfig,
  profileHeroConfig,
  onLogoImagesChange,
  onHeroImagesChange,
  onLogoPendingChange,
  onHeroPendingChange,
  isImagesLoading,
  isSavingImages,
  uploadingLabel,
  logoLabel,
}: {
  imageTab: "logo" | "hero";
  setImageTab: (tab: "logo" | "hero") => void;
  logoManagerRef: React.RefObject<StorageImageManagerHandle | null>;
  heroManagerRef: React.RefObject<StorageImageManagerHandle | null>;
  logoImage: StoredImage | null;
  storeLogoConfig: StorageImageManagerConfig;
  heroConfig: HeroSliderConfig | null;
  profileHeroConfig: HeroSliderConfig;
  onLogoImagesChange: (images: StoredImage[]) => void;
  onHeroImagesChange: (config: HeroSliderConfig) => void;
  onLogoPendingChange: (pending: boolean) => void;
  onHeroPendingChange: (pending: boolean) => void;
  isImagesLoading: boolean;
  isSavingImages: boolean;
  uploadingLabel: string;
  logoLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto border-b border-outline-variant">
        <button
          type="button"
          onClick={() => setImageTab("logo")}
          className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-xs font-medium transition-colors sm:text-sm ${
            imageTab === "logo"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          {logoLabel}
        </button>
        <button
          type="button"
          onClick={() => setImageTab("hero")}
          className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-xs font-medium transition-colors sm:text-sm ${
            imageTab === "hero"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          <LayoutTemplate className="h-4 w-4" />
          صور واجهة المتجر
        </button>
      </div>

      <div className={imageTab === "logo" ? "block w-fit max-w-full" : "hidden"}>
        <StorageImageManager
          ref={logoManagerRef}
          config={storeLogoConfig}
          className="w-[120px] sm:w-[150px]"
          value={logoImage ? [logoImage] : []}
          onChange={onLogoImagesChange}
          onPendingChange={onLogoPendingChange}
        />
      </div>
      <div className={imageTab === "hero" ? "block" : "hidden"}>
        <HeroSlider
          mode="images-edit"
          config={heroConfig ?? profileHeroConfig}
          onChange={onHeroImagesChange}
          imageUploadRef={heroManagerRef}
          onImagesPendingChange={onHeroPendingChange}
        />
      </div>

      {isImagesLoading || isSavingImages ? (
        <p className="text-xs text-muted-foreground">
          {isSavingImages ? uploadingLabel : ""}
        </p>
      ) : null}
    </div>
  );
}
