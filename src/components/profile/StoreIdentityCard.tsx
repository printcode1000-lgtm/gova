"use client";

import * as React from "react";
import { Image as ImageIcon, LayoutTemplate } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import { RatingSettingsEditor } from "@/components/ui/rating/RatingSettingsEditor";
import { useTranslation } from "@/lib/i18n";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { useProfileStoreImages } from "@/features/profile/hooks/use-profile-store-images";
import { useStoreDetails } from "@/features/profile/hooks/use-store-details";
import {
  StorageImageManager,
  parseStorageImageManagerConfig,
  type StorageImageManagerHandle,
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
    saveStoreImagesAsync,
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
  const [heroConfig, setHeroConfig] = React.useState<HeroSliderConfig | null>(null);
  const [logoPending, setLogoPending] = React.useState(false);
  const [heroPending, setHeroPending] = React.useState(false);
  const [logoTouched, setLogoTouched] = React.useState(false);
  const [heroTouched, setHeroTouched] = React.useState(false);
  const logoManagerRef = React.useRef<StorageImageManagerHandle | null>(null);
  const heroManagerRef = React.useRef<StorageImageManagerHandle | null>(null);
  const logoImageRef = React.useRef<StoredImage | null>(null);
  const heroConfigRef = React.useRef<HeroSliderConfig | null>(null);
  const label = t("onboarding.storeIdentity.title");

  const savedLogoKey = storeImages.avatarImageKey ?? "";
  const savedCoverKeys = storeImages.coverImageKeys;
  const currentCoverKeys = heroTouched
    ? (heroConfig?.slides ?? [])
        .map((slide) => slide.imageKey ?? "")
        .filter(Boolean)
        .slice(0, 3)
    : savedCoverKeys;
  const currentLogoKey = logoTouched ? (logoImage?.imageKey ?? "") : savedLogoKey;
  const imagesDirty =
    logoPending ||
    heroPending ||
    currentLogoKey !== savedLogoKey ||
    JSON.stringify(currentCoverKeys) !== JSON.stringify(savedCoverKeys);
  const sectionDirty = isDirty || imagesDirty;

  const prepareImagesForSave = React.useCallback(async () => {
    if (logoManagerRef.current?.hasPending()) {
      if (!(await logoManagerRef.current.uploadPending())) return false;
    }
    if (heroManagerRef.current?.hasPending()) {
      if (!(await heroManagerRef.current.uploadPending())) return false;
    }
    const logo = logoImageRef.current;
    const hero = heroConfigRef.current;
    const coverImageKeys = (hero?.slides ?? [])
      .map((slide) => slide.imageKey)
      .filter((imageKey): imageKey is string => Boolean(imageKey))
      .slice(0, 3);
    if (logo?.isUploading || logo?.error || (logo?.url && !logo.imageKey)) return false;
    await saveStoreImagesAsync({
      avatarImageKey: logo?.imageKey ?? null,
      coverImageKeys,
    });
    setLogoTouched(false);
    setHeroTouched(false);
    return true;
  }, [saveStoreImagesAsync]);

  React.useImperativeHandle(
    ref,
    () => ({
      isDirty: sectionDirty,
      isSaving,
      canSave: true,
      label,
      save: saveAsync,
      getSnapshot: () => details,
      applySaved,
      prepareForSave: prepareImagesForSave,
    }),
    [applySaved, details, isSaving, label, prepareImagesForSave, saveAsync, sectionDirty],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty: sectionDirty, isSaving, canSave: true, label });
  }, [isSaving, label, onStatusChange, sectionDirty]);

  React.useEffect(() => {
    const nextLogoImage =
      storeImages.avatarUrl && storeImages.avatarImageKey
        ? { imageKey: storeImages.avatarImageKey, url: storeImages.avatarUrl }
        : null;
    if (logoTouched) return;
    setLogoImage(nextLogoImage);
    logoImageRef.current = nextLogoImage;
  }, [logoTouched, storeImages.avatarImageKey, storeImages.avatarUrl]);

  const handleLogoImagesChange = (images: StoredImage[]) => {
    const image = images[0] ?? null;
    setLogoTouched(true);
    setLogoImage(image);
    logoImageRef.current = image;
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

  React.useEffect(() => {
    if (heroPending || heroTouched) return;
    setHeroConfig(profileHeroConfig);
    heroConfigRef.current = profileHeroConfig;
  }, [heroPending, heroTouched, profileHeroConfig]);

  const handleHeroImagesChange = (config: HeroSliderConfig) => {
    setHeroTouched(true);
    setHeroConfig(config);
    heroConfigRef.current = config;
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
                  ref={logoManagerRef}
                  config={storeLogoConfig}
                  value={logoImage ? [logoImage] : []}
                  onChange={handleLogoImagesChange}
                  onPendingChange={setLogoPending}
                />
              </div>
            </div>
          ) : (
            <HeroSlider
              mode="images-edit"
              config={heroConfig ?? profileHeroConfig}
              onChange={handleHeroImagesChange}
              imageUploadRef={heroManagerRef}
              onImagesPendingChange={setHeroPending}
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

      <RatingSettingsEditor
        enabled={details.ratingSettings.enabled}
        mode={details.ratingSettings.mode}
        disabled={readOnly}
        labels={{
          title:
            "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0642\u064A\u064A\u0645",
          enabled:
            "\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0641\u064A \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A",
          mode: "\u0648\u0636\u0639 \u0627\u0644\u062A\u0642\u064A\u064A\u0645",
          placeholder:
            "\u0627\u062E\u062A\u0631 \u0648\u0636\u0639 \u0627\u0644\u062A\u0642\u064A\u064A\u0645",
          stars: "\u0646\u062C\u0648\u0645 \u0641\u0642\u0637",
          starsComments:
            "\u0646\u062C\u0648\u0645 \u0648\u062A\u0639\u0644\u064A\u0642\u0627\u062A",
        }}
        onChange={(ratingSettings) =>
          updateField("ratingSettings", ratingSettings)
        }
      />
    </div>
  );
});

export default StoreIdentityCard;
