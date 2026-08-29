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
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "profile.store-identity.store-identity-images-editor.div.5-J3ONTs", id: "profile.store-identity.store-identity-images-editor.div.5" })} id="profile.store-identity.store-identity-images-editor.div" className="space-y-4">
      <div {...uiAttributes({ uid: "profile.store-identity.store-identity-images-editor.div.6-TALRM1", id: "profile.store-identity.store-identity-images-editor.div.6" })} id="profile.store-identity.store-identity-images-editor.div.2" className="flex gap-2 overflow-x-auto border-b border-outline-variant">
        <button {...uiAttributes({ uid: "profile.store-identity.store-identity-images-editor.button.3-QOU1Q4", id: "profile.store-identity.store-identity-images-editor.button.3" })} id="profile.store-identity.store-identity-images-editor.button"
          type="button"
          onClick={() => setImageTab("logo")}
          className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-xs font-medium transition-colors sm:text-sm ${
            imageTab === "logo"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          <ImageIcon id="profile.store-identity.store-identity-images-editor.image-icon" className="h-4 w-4" />
          {logoLabel}
        </button>
        <button {...uiAttributes({ uid: "profile.store-identity.store-identity-images-editor.button.4-9skR8c", id: "profile.store-identity.store-identity-images-editor.button.4" })} id="profile.store-identity.store-identity-images-editor.button.2"
          type="button"
          onClick={() => setImageTab("hero")}
          className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-xs font-medium transition-colors sm:text-sm ${
            imageTab === "hero"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          <LayoutTemplate id="profile.store-identity.store-identity-images-editor.layout-template" className="h-4 w-4" />
          صور واجهة المتجر
        </button>
      </div>

      <div {...uiAttributes({ uid: "profile.store-identity.store-identity-images-editor.div.7-25Mczj", id: "profile.store-identity.store-identity-images-editor.div.7" })} id="profile.store-identity.store-identity-images-editor.div.3" className={imageTab === "logo" ? "block w-fit max-w-full" : "hidden"}>
        <StorageImageManager
          ref={logoManagerRef}
          config={storeLogoConfig}
          className="w-[120px] sm:w-[150px]"
          value={logoImage ? [logoImage] : []}
          onChange={onLogoImagesChange}
          onPendingChange={onLogoPendingChange}
        />
      </div>
      <div {...uiAttributes({ uid: "profile.store-identity.store-identity-images-editor.div.8-1U4Pqk", id: "profile.store-identity.store-identity-images-editor.div.8" })} id="profile.store-identity.store-identity-images-editor.div.4" className={imageTab === "hero" ? "block" : "hidden"}>
        <HeroSlider id="profile.store-identity.store-identity-images-editor.hero-slider"
          mode="images-edit"
          config={heroConfig ?? profileHeroConfig}
          onChange={onHeroImagesChange}
          imageUploadRef={heroManagerRef}
          onImagesPendingChange={onHeroPendingChange}
        />
      </div>

      {isImagesLoading || isSavingImages ? (
        <p {...uiAttributes({ uid: "profile.store-identity.store-identity-images-editor.p.2-KNqt8E", id: "profile.store-identity.store-identity-images-editor.p.2" })} id="profile.store-identity.store-identity-images-editor.p" className="text-xs text-muted-foreground">
          {isSavingImages ? uploadingLabel : ""}
        </p>
      ) : null}
    </div>
  );
}
