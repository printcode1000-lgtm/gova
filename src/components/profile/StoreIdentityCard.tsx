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
import { Store, Upload, X } from 'lucide-react';

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

  const handleImageUpload = (field: 'storeLogo' | 'coverImage') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField(field, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = (field: 'storeLogo' | 'coverImage') => () => {
    updateField(field, null);
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
        <div className="space-y-2">
          <Label>{t('onboarding.storeIdentity.storeLogo')}</Label>
          <p className="text-xs text-muted-foreground">{t('onboarding.storeIdentity.logoHint')}</p>
          <div className="relative aspect-square rounded-lg border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center bg-muted/30 overflow-hidden">
            {localData.storeLogo ? (
              <>
                <img
                  src={localData.storeLogo}
                  alt="Store Logo"
                  className="w-full h-full object-cover"
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleImageRemove('storeLogo')}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t('onboarding.storeIdentity.uploadLogo')}</p>
                {!readOnly && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('storeLogo')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('onboarding.storeIdentity.coverImage')}</Label>
          <p className="text-xs text-muted-foreground">{t('onboarding.storeIdentity.coverHint')}</p>
          <div className="relative aspect-video rounded-lg border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center bg-muted/30 overflow-hidden">
            {localData.coverImage ? (
              <>
                <img
                  src={localData.coverImage}
                  alt="Cover Image"
                  className="w-full h-full object-cover"
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleImageRemove('coverImage')}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t('onboarding.storeIdentity.uploadCover')}</p>
                {!readOnly && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('coverImage')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </>
            )}
          </div>
        </div>
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
