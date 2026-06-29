'use client';

import * as React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StoredImage } from '@/core/storage/types/stored-image.types';
import { useProfileStoreImages } from '@/features/profile/hooks/use-profile-store-images';
import {
  StorageImageManager,
  parseStorageImageManagerConfig,
} from '@/features/storage/components/StorageImageManager';
import { Image as ImageIcon, LayoutTemplate } from 'lucide-react';
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

const STORE_CATEGORY_KEYS: Record<string, string> = {
  "Women's Fashion": 'womensFashion',
  "Men's Fashion": 'mensFashion',
  'Kids & Baby': 'kidsBaby',
  Accessories: 'accessories',
  Footwear: 'footwear',
  'Bags & Luggage': 'bagsLuggage',
  Jewelry: 'jewelry',
  Sportswear: 'sportswear',
  Luxury: 'luxury',
  'Sustainable Fashion': 'sustainableFashion',
};

const SPECIALTY_KEYS: Record<string, string> = {
  'Sustainable Materials': 'sustainableMaterials',
  Handcrafted: 'handcrafted',
  'Limited Edition': 'limitedEdition',
  'Custom Tailoring': 'customTailoring',
  'Ethical Fashion': 'ethicalFashion',
  'Plus Sizes': 'plusSizes',
  'Petite Sizes': 'petiteSizes',
  'Luxury Materials': 'luxuryMaterials',
  'Vintage Style': 'vintageStyle',
  'Minimalist Design': 'minimalistDesign',
  'Bold Prints': 'boldPrints',
  'Classic Elegance': 'classicElegance',
};

const STORE_CATEGORIES = [
  "Women's Fashion",
  "Men's Fashion",
  'Kids & Baby',
  'Accessories',
  'Footwear',
  'Bags & Luggage',
  'Jewelry',
  'Sportswear',
  'Luxury',
  'Sustainable Fashion',
] as const;

const SPECIALTIES = [
  'Sustainable Materials',
  'Handcrafted',
  'Limited Edition',
  'Custom Tailoring',
  'Ethical Fashion',
  'Plus Sizes',
  'Petite Sizes',
  'Luxury Materials',
  'Vintage Style',
  'Minimalist Design',
  'Bold Prints',
  'Classic Elegance',
] as const;

interface StoreIdentityData {
  storeName: string;
  storeCategory: string;
  storeDescription: string;
  storeStory: string;
  storeSpecialties: string[];
  storeLogo: string | null;
  coverImage: string | null;
}

interface StoreIdentityCardProps {
  data?: StoreIdentityData;
  onChange?: (data: StoreIdentityData) => void;
  readOnly?: boolean;
}

export function StoreIdentityCard({ data, onChange, readOnly = false }: StoreIdentityCardProps) {
  const { t } = useTranslation();
  const { storeImages, isLoading: isImagesLoading, isSaving: isSavingImages, error: imagesError, saveStoreImages } =
    useProfileStoreImages();
  const [imageTab, setImageTab] = React.useState<'logo' | 'cover'>('logo');
  const [localData, setLocalData] = React.useState<StoreIdentityData>(() => {
    if (data) {
      return data;
    }
    return {
      storeName: '',
      storeCategory: '',
      storeDescription: '',
      storeStory: '',
      storeSpecialties: [],
      storeLogo: null,
      coverImage: null,
    };
  });
  const [logoImage, setLogoImage] = React.useState<StoredImage | null>(null);
  const [coverImages, setCoverImages] = React.useState<StoredImage[]>([]);

  React.useEffect(() => {
    if (!data) return;
    setLocalData(data);
  }, [data]);

  React.useEffect(() => {
    if (data) return;

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
    setLocalData((current) => ({
      ...current,
      storeLogo: nextLogoImage?.url ?? null,
      coverImage: nextCoverImages[0]?.url ?? null,
    }));
  }, [data, storeImages]);

  const updateField = <K extends keyof StoreIdentityData>(field: K, value: StoreIdentityData[K]) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onChange?.(newData);
  };

  const toggleSpecialty = (specialty: string) => {
    const newSpecialties = localData.storeSpecialties.includes(specialty)
      ? localData.storeSpecialties.filter((s) => s !== specialty)
      : [...localData.storeSpecialties, specialty];
    updateField('storeSpecialties', newSpecialties);
  };

  const handleLogoImagesChange = (images: StoredImage[]) => {
    const image = images[0] ?? null;
    setLogoImage(image);
    updateField('storeLogo', image?.url ?? null);
    void saveStoreImages({ avatarImageKey: image?.imageKey ?? null });
  };

  const handleCoverImagesChange = (images: StoredImage[]) => {
    setCoverImages(images);
    updateField('coverImage', images[0]?.url ?? null);
    void saveStoreImages({ coverImageKeys: images.map((image) => image.imageKey) });
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="storeName">{t('onboarding.storeIdentity.storeName')}</Label>
          <Input
            id="storeName"
            value={localData.storeName}
            onChange={(e) => updateField('storeName', e.target.value)}
            placeholder={t('onboarding.storeIdentity.storeNamePlaceholder')}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="storeCategory">{t('onboarding.storeIdentity.storeCategory')}</Label>
          <Select
            value={localData.storeCategory}
            onValueChange={(v) => updateField('storeCategory', v)}
            disabled={readOnly}
          >
            <SelectTrigger id="storeCategory">
              <SelectValue placeholder={t('onboarding.storeIdentity.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              {STORE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`onboarding.constants.storeCategories.${STORE_CATEGORY_KEYS[c]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {!readOnly ? (
          <>
            <div className="lg:col-span-2">
              <div className="flex gap-2 border-b border-outline-variant mb-4">
                <button
                  type="button"
                  onClick={() => setImageTab('logo')}
                  className={`flex items-center gap-2 pb-3 px-4 transition-colors ${
                    imageTab === 'logo'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent'
                  }`}
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t('onboarding.storeIdentity.storeLogo')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('cover')}
                  className={`flex items-center gap-2 pb-3 px-4 transition-colors ${
                    imageTab === 'cover'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent'
                  }`}
                >
                  <LayoutTemplate className="h-5 w-5" />
                  <span className="text-sm font-medium">{t('onboarding.storeIdentity.coverImage')}</span>
                </button>
              </div>

              {imageTab === 'logo' && (
                <div className="rounded-lg border-2 border-primary/20 p-3 bg-primary/5 inline-block">
                  <div className="w-[150px] h-[150px]">
                    <StorageImageManager
                      config={storeLogoConfig}
                      value={logoImage ? [logoImage] : []}
                      onChange={handleLogoImagesChange}
                    />
                  </div>
                </div>
              )}

              {imageTab === 'cover' && (
                <div className="space-y-2 rounded-lg border-2 border-primary/20 p-4 bg-primary/5">
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
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>{t('onboarding.storeIdentity.storeLogo')}</Label>
              <div className="relative aspect-square rounded-lg border overflow-hidden">
                {localData.storeLogo ? (
                  <img src={localData.storeLogo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">—</div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('onboarding.storeIdentity.coverImage')}</Label>
              <div className="relative aspect-video rounded-lg border overflow-hidden">
                {localData.coverImage ? (
                  <img src={localData.coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">—</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {(isImagesLoading || isSavingImages || imagesError) && (
        <p className={`text-xs ${imagesError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {imagesError ?? (isSavingImages ? t('onboarding.common.uploading') : '')}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="storeDescription">{t('onboarding.storeIdentity.storeDescription')}</Label>
        <Textarea
          id="storeDescription"
          value={localData.storeDescription}
          onChange={(e) => updateField('storeDescription', e.target.value)}
          placeholder={t('onboarding.storeIdentity.descriptionPlaceholder')}
          rows={4}
          maxLength={500}
          disabled={readOnly}
        />
        <p className="text-xs text-muted-foreground text-end">{localData.storeDescription.length}/500</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeStory">{t('onboarding.storeIdentity.storeStory')}</Label>
        <Textarea
          id="storeStory"
          value={localData.storeStory}
          onChange={(e) => updateField('storeStory', e.target.value)}
          placeholder={t('onboarding.storeIdentity.storyPlaceholder')}
          rows={4}
          maxLength={1000}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('onboarding.storeIdentity.specialties')}</Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((specialty) => (
            <Button
              key={specialty}
              type="button"
              variant={localData.storeSpecialties.includes(specialty) ? 'default' : 'outline'}
              size="sm"
              onClick={() => !readOnly && toggleSpecialty(specialty)}
              disabled={readOnly}
              className="text-xs"
            >
              {t(`onboarding.constants.specialties.${SPECIALTY_KEYS[specialty]}`)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StoreIdentityCard;
