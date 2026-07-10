"use client";

import * as React from "react";
import { Image as ImageIcon, LayoutTemplate } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import { useTranslation } from "@/lib/i18n";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { useProfileStoreImages } from "@/features/profile/hooks/use-profile-store-images";
import { useStoreDetails } from "@/features/profile/hooks/use-store-details";
import {
  StorageImageManager,
  parseStorageImageManagerConfig,
} from "@/features/storage/components/StorageImageManager";
import type {
  ProfileSectionStatus,
  StoreDetailsController,
} from "./profile-save-controller";
import storeLogoImageConfig from "./image-configs/store-logo.image.json";

const storeLogoConfig = parseStorageImageManagerConfig(storeLogoImageConfig);

interface StoreIdentityCardProps {
  showSaveButton?: boolean;
  onStatusChange?: (status: ProfileSectionStatus) => void;
  readOnly?: boolean;
}

export const StoreIdentityCard = React.forwardRef<
  StoreDetailsController,
  StoreIdentityCardProps
>(function StoreIdentityCard({ onStatusChange, readOnly = false }, ref) {
  const { t } = useTranslation();
  const {
    storeImages,
    isLoading: isImagesLoading,
    isSaving: isSavingImages,
    error: imagesError,
    saveStoreImages,
  } = useProfileStoreImages();
  const {
    details,
    updateField,
    isDirty,
    isLoading,
    isSaving,
    error,
    saveAsync,
    applySaved,
    saved,
  } = useStoreDetails();
  const [imageTab, setImageTab] = React.useState<"logo" | "hero">("logo");
  const [logoImage, setLogoImage] = React.useState<StoredImage | null>(null);
  const label = t("onboarding.storeIdentity.title");

  React.useImperativeHandle(
    ref,
    () => ({
      isDirty,
      isSaving,
      canSave: true,
      label,
      save: saveAsync,
      getSnapshot: () => details,
      applySaved,
    }),
    [applySaved, details, isDirty, isSaving, label, saveAsync],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty, isSaving, canSave: true, label });
  }, [isDirty, isSaving, label, onStatusChange]);

  React.useEffect(() => {
    const nextLogoImage =
      storeImages.avatarUrl && storeImages.avatarImageKey
        ? { imageKey: storeImages.avatarImageKey, url: storeImages.avatarUrl }
        : null;
    setLogoImage(nextLogoImage);
  }, [storeImages]);

  const handleLogoImagesChange = (images: StoredImage[]) => {
    const image = images[0] ?? null;
    setLogoImage(image);
    void saveStoreImages({ avatarImageKey: image?.imageKey ?? null });
  };

  const profileHeroConfig = React.useMemo<HeroSliderConfig>(
    () => ({
      transition: "SlideLeft",
      transitionDuration: 500,
      autoPlay: true,
      loop: true,
      slides: storeImages.coverUrls.map((url, index) => ({
        priority: (index + 1) * 100,
        image: url,
        imageKey: storeImages.coverImageKeys[index],
        title: "",
        subtitle: "",
        duration: 4000,
        action: "",
      })),
    }),
    [storeImages.coverImageKeys, storeImages.coverUrls],
  );

  const handleHeroImagesChange = (config: HeroSliderConfig) => {
    void saveStoreImages({
      coverImageKeys: config.slides
        .map((slide) => slide.imageKey)
        .filter((imageKey): imageKey is string => Boolean(imageKey))
        .slice(0, 3),
    });
  };

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error || imagesError ? (
        <div className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error ?? imagesError}
        </div>
      ) : null}
      {saved && !isDirty ? (
        <div className="rounded-lg bg-success/15 px-3 py-2 text-sm text-success">
          {t("profile.saved")}
        </div>
      ) : null}

      {!readOnly ? (
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
              {t("onboarding.storeIdentity.storeLogo")}
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

          {imageTab === "logo" ? (
            <div className="inline-block rounded-lg border-2 border-primary/20 bg-primary/5 p-2 sm:p-3">
              <div className="h-[120px] w-[120px] sm:h-[150px] sm:w-[150px]">
                <StorageImageManager
                  config={storeLogoConfig}
                  value={logoImage ? [logoImage] : []}
                  onChange={handleLogoImagesChange}
                />
              </div>
            </div>
          ) : (
            <HeroSlider
              mode="images-edit"
              config={profileHeroConfig}
              onChange={handleHeroImagesChange}
            />
          )}

          {(isImagesLoading || isSavingImages) && (
            <p className="text-xs text-muted-foreground">
              {isSavingImages ? t("onboarding.common.uploading") : ""}
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="storeName">
          {t("onboarding.storeIdentity.storeName")}
        </Label>
        <Input
          id="storeName"
          value={details.storeName}
          onChange={(event) => updateField("storeName", event.target.value)}
          placeholder={t("onboarding.storeIdentity.storeNamePlaceholder")}
          maxLength={120}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeDescription">
          {t("onboarding.storeIdentity.storeDescription")}
        </Label>
        <Textarea
          id="storeDescription"
          value={details.storeDescription}
          onChange={(event) =>
            updateField("storeDescription", event.target.value)
          }
          placeholder={t("onboarding.storeIdentity.descriptionPlaceholder")}
          rows={4}
          maxLength={100}
          disabled={readOnly}
        />
        <p className="text-end text-xs text-muted-foreground">
          {details.storeDescription.length}/100
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeStory">
          {t("onboarding.storeIdentity.storeStory")}
        </Label>
        <Textarea
          id="storeStory"
          value={details.storeStory}
          onChange={(event) => updateField("storeStory", event.target.value)}
          placeholder={t("onboarding.storeIdentity.storyPlaceholder")}
          rows={4}
          maxLength={500}
          disabled={readOnly}
        />
        <p className="text-end text-xs text-muted-foreground">
          {details.storeStory.length}/500
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-outline-variant p-4">
        <h3 className="text-sm font-bold">إعدادات التقييم</h3>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <Checkbox
            id="ratingEnabled"
            checked={details.ratingSettings.enabled}
            onCheckedChange={(checked) =>
              updateField("ratingSettings", {
                ...details.ratingSettings,
                enabled: !!checked,
              })
            }
            disabled={readOnly}
          />
          <Label htmlFor="ratingEnabled" className="cursor-pointer">تفعيل التقييمات في الملف الشخصي</Label>
        </div>

        <div className="space-y-2">
          <Label>وضع التقييم</Label>
          <Select
            value={details.ratingSettings.mode}
            onValueChange={(value: "stars" | "stars-comments") =>
              updateField("ratingSettings", {
                ...details.ratingSettings,
                mode: value,
              })
            }
            disabled={readOnly || !details.ratingSettings.enabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="اختر وضع التقييم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stars">نجوم فقط</SelectItem>
              <SelectItem value="stars-comments">نجوم + تعليقات</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
});

export default StoreIdentityCard;
