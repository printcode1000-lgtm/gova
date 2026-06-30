'use client';

import * as React from 'react';
import { Image as ImageIcon, LayoutTemplate } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';
import type { StoredImage } from '@/core/storage/types/stored-image.types';
import { useProfileStoreImages } from '@/features/profile/hooks/use-profile-store-images';
import { useStoreDetails } from '@/features/profile/hooks/use-store-details';
import {
  StorageImageManager,
  parseStorageImageManagerConfig,
} from '@/features/storage/components/StorageImageManager';
import type {
  ProfileSectionStatus,
  StoreDetailsController,
} from './profile-save-controller';
import storeLogoImageConfig from './image-configs/store-logo.image.json';
import storeCover1ImageConfig from './image-configs/store-cover-1.image.json';
import storeCover2ImageConfig from './image-configs/store-cover-2.image.json';
import storeCover3ImageConfig from './image-configs/store-cover-3.image.json';

const storeLogoConfig = parseStorageImageManagerConfig(storeLogoImageConfig);
const storeCoverConfigs = [
  parseStorageImageManagerConfig(storeCover1ImageConfig),
  parseStorageImageManagerConfig(storeCover2ImageConfig),
  parseStorageImageManagerConfig(storeCover3ImageConfig),
];

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
  const [imageTab, setImageTab] = React.useState<'logo' | 'cover'>('logo');
  const [logoImage, setLogoImage] = React.useState<StoredImage | null>(null);
  const [coverImages, setCoverImages] = React.useState<StoredImage[]>([]);
  const label = t('onboarding.storeIdentity.title');

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
    const nextCoverImages = storeImages.coverImageKeys
      .map((imageKey, index) => {
        const url = storeImages.coverUrls[index];
        return imageKey && url ? { imageKey, url } : null;
      })
      .filter((image): image is StoredImage => Boolean(image));

    setLogoImage(nextLogoImage);
    setCoverImages(nextCoverImages);
  }, [storeImages]);

  const handleLogoImagesChange = (images: StoredImage[]) => {
    const image = images[0] ?? null;
    setLogoImage(image);
    void saveStoreImages({ avatarImageKey: image?.imageKey ?? null });
  };

  const handleCoverImagesChange = (images: StoredImage[]) => {
    setCoverImages(images);
    void saveStoreImages({
      coverImageKeys: images.map((image) => image.imageKey),
    });
  };

  const handleCoverImageChange = (index: number, images: StoredImage[]) => {
    const image = images[0] ?? null;
    const nextCoverImages = [...coverImages];
    if (image) {
      nextCoverImages[index] = image;
    } else {
      nextCoverImages.splice(index, 1);
    }
    handleCoverImagesChange(nextCoverImages.filter(Boolean));
  };

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-on-surface-variant">
        {t('profile.loading')}
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
          {t('profile.saved')}
        </div>
      ) : null}

      {!readOnly ? (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-outline-variant">
            <button
              type="button"
              onClick={() => setImageTab('logo')}
              className={`flex items-center gap-2 px-4 pb-3 transition-colors ${
                imageTab === 'logo'
                  ? 'border-b-2 border-primary text-primary'
                  : 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <ImageIcon className="h-5 w-5" />
              <span className="text-sm font-medium">
                {t('onboarding.storeIdentity.storeLogo')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setImageTab('cover')}
              className={`flex items-center gap-2 px-4 pb-3 transition-colors ${
                imageTab === 'cover'
                  ? 'border-b-2 border-primary text-primary'
                  : 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <LayoutTemplate className="h-5 w-5" />
              <span className="text-sm font-medium">
                {t('onboarding.storeIdentity.coverImage')}
              </span>
            </button>
          </div>

          {imageTab === 'logo' ? (
            <div className="inline-block rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
              <div className="h-[150px] w-[150px]">
                <StorageImageManager
                  config={storeLogoConfig}
                  value={logoImage ? [logoImage] : []}
                  onChange={handleLogoImagesChange}
                />
              </div>
            </div>
          ) : null}

          {imageTab === 'cover' ? (
            <div className="space-y-2 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {storeCoverConfigs.map((config, index) => (
                  <StorageImageManager
                    key={config.id}
                    config={config}
                    value={coverImages[index] ? [coverImages[index]] : []}
                    onChange={(images) => handleCoverImageChange(index, images)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {(isImagesLoading || isSavingImages) && (
            <p className="text-xs text-muted-foreground">
              {isSavingImages ? t('onboarding.common.uploading') : ''}
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="storeName">
          {t('onboarding.storeIdentity.storeName')}
        </Label>
        <Input
          id="storeName"
          value={details.storeName}
          onChange={(event) => updateField('storeName', event.target.value)}
          placeholder={t('onboarding.storeIdentity.storeNamePlaceholder')}
          maxLength={120}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeDescription">
          {t('onboarding.storeIdentity.storeDescription')}
        </Label>
        <Textarea
          id="storeDescription"
          value={details.storeDescription}
          onChange={(event) =>
            updateField('storeDescription', event.target.value)
          }
          placeholder={t('onboarding.storeIdentity.descriptionPlaceholder')}
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
          {t('onboarding.storeIdentity.storeStory')}
        </Label>
        <Textarea
          id="storeStory"
          value={details.storeStory}
          onChange={(event) => updateField('storeStory', event.target.value)}
          placeholder={t('onboarding.storeIdentity.storyPlaceholder')}
          rows={4}
          maxLength={1000}
          disabled={readOnly}
        />
        <p className="text-end text-xs text-muted-foreground">
          {details.storeStory.length}/1000
        </p>
      </div>
    </div>
  );
});

export default StoreIdentityCard;
