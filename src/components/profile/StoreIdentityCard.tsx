'use client';

import * as React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Store, X } from 'lucide-react';
import { StorageProfileImageUpload } from '@/features/storage/components/StorageProfileImageUpload';
import { StorageProfiles } from '@/core/storage/constants/storage-profiles';
import type { StoredImage } from '@/core/storage/types/stored-image.types';

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

  React.useEffect(() => {
    if (!data) return;
    setLocalData(data);
  }, [data]);

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

  const handleLogoChange = (image: StoredImage | null) => {
    updateField('storeLogo', image?.url ?? null);
  };

  const handleCoverChange = (image: StoredImage | null) => {
    updateField('coverImage', image?.url ?? null);
  };

  const logoValue: StoredImage | null = localData.storeLogo
    ? { imageKey: '', url: localData.storeLogo }
    : null;

  const coverValue: StoredImage | null = localData.coverImage
    ? { imageKey: '', url: localData.coverImage }
    : null;

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
            <StorageProfileImageUpload
              storageProfileId={StorageProfiles.Avatar}
              value={logoValue}
              onChange={handleLogoChange}
              aspectRatio="square"
              label={t('onboarding.storeIdentity.storeLogo')}
              hint={t('onboarding.storeIdentity.logoHint')}
            />
            <StorageProfileImageUpload
              storageProfileId={StorageProfiles.Cover}
              value={coverValue}
              onChange={handleCoverChange}
              aspectRatio="landscape"
              label={t('onboarding.storeIdentity.coverImage')}
              hint={t('onboarding.storeIdentity.coverHint')}
            />
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
