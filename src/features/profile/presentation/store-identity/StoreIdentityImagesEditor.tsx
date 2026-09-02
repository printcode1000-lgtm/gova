"use client";

import { Image as ImageIcon, LayoutTemplate } from "lucide-react";
import { HeroSlider, type HeroSliderConfig } from "@/features/advertisements/ui";
import {
  StorageImageManager,
  type StorageImageManagerConfig,
  type StorageImageManagerHandle,
} from "@/features/storage/ui";
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
    <div id='profile-presentation-store-identity-storeidentityimageseditor-div-1-csqjgy' className="space-y-4">
      <div id='profile-presentation-store-identity-storeidentityimageseditor-div-2-cj36uv' className="flex gap-2 overflow-x-auto border-b border-outline-variant">
        <button id='profile-presentation-store-identity-storeidentityimageseditor-button-3-9n2fjy'
          type="button"
          onClick={() => setImageTab("logo")}
          className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-xs font-medium transition-colors sm:text-sm ${
            imageTab === "logo"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          <ImageIcon id='profile-presentation-store-identity-storeidentityimageseditor-imageicon-4-2epajx' className="h-4 w-4" />
          {logoLabel}
        </button>
        <button id='profile-presentation-store-identity-storeidentityimageseditor-button-5-kb2uqc'
          type="button"
          onClick={() => setImageTab("hero")}
          className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-xs font-medium transition-colors sm:text-sm ${
            imageTab === "hero"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          <LayoutTemplate id='profile-presentation-store-identity-storeidentityimageseditor-layouttemplate-6-r7bpc6' className="h-4 w-4" />
          صور واجهة المتجر
        </button>
      </div>

      <div id='profile-presentation-store-identity-storeidentityimageseditor-div-7-drswcz' className={imageTab === "logo" ? "block w-fit max-w-full" : "hidden"}>
        <StorageImageManager
          ref={logoManagerRef}
          config={storeLogoConfig}
          className="w-[120px] sm:w-[150px]"
          value={logoImage ? [logoImage] : []}
          onChange={onLogoImagesChange}
          onPendingChange={onLogoPendingChange}
        />
      </div>
      <div id='profile-presentation-store-identity-storeidentityimageseditor-div-8-yzmsie' className={imageTab === "hero" ? "block" : "hidden"}>
        <HeroSlider id='profile-presentation-store-identity-storeidentityimageseditor-heroslider-9-gpwewl'
          mode="images-edit"
          config={heroConfig ?? profileHeroConfig}
          onChange={onHeroImagesChange}
          imageUploadRef={heroManagerRef}
          onImagesPendingChange={onHeroPendingChange}
        />
      </div>

      {isImagesLoading || isSavingImages ? (
        <p id='profile-presentation-store-identity-storeidentityimageseditor-text-10-f8viyz' className="text-xs text-muted-foreground">
          {isSavingImages ? uploadingLabel : ""}
        </p>
      ) : null}
    </div>
  );
}
