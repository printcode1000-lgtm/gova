'use client';

import * as React from 'react';
import { useOnboardingStore, constants } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormInput, FormTextarea, FormSelect, MultiSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export function StoreIdentitySection() {
  const { t } = useTranslation();
  const { data, updateStoreIdentity, setStoreImage, markStepComplete } = useOnboardingStore();
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { storeIdentity } = data;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!storeIdentity.storeName.trim()) {
      newErrors.storeName = t('onboarding.storeIdentity.errors.storeNameRequired');
    } else if (storeIdentity.storeName.length < 2) {
      newErrors.storeName = t('onboarding.storeIdentity.errors.storeNameMin');
    }
    if (!storeIdentity.storeDescription.trim()) {
      newErrors.storeDescription = t('onboarding.storeIdentity.errors.descriptionRequired');
    } else if (storeIdentity.storeDescription.length < 20) {
      newErrors.storeDescription = t('onboarding.storeIdentity.errors.descriptionMin');
    }
    if (!storeIdentity.storeCategory) {
      newErrors.storeCategory = t('onboarding.storeIdentity.errors.categoryRequired');
    }
    if (storeIdentity.storeSpecialties.length === 0) {
      newErrors.storeSpecialties = t('onboarding.storeIdentity.errors.specialtiesRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      markStepComplete('store-identity');
      return true;
    }
    return false;
  };

  const handleLogoChange = (image: StoredImage | null) => {
    setStoreImage('storeLogo', image);
  };

  const handleCoverChange = (image: StoredImage | null) => {
    setStoreImage('coverImage', image);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>{t('onboarding.storeIdentity.title')}</CardTitle>
          <CardDescription>{t('onboarding.storeIdentity.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <FormField label={t('onboarding.storeIdentity.storeName')} htmlFor="storeName" required error={errors.storeName}>
              <FormInput
                id="storeName"
                value={storeIdentity.storeName}
                onChange={(e) => updateStoreIdentity({ storeName: e.target.value })}
                placeholder={t('onboarding.storeIdentity.storeNamePlaceholder')}
                error={errors.storeName}
              />
            </FormField>

            <FormField label={t('onboarding.storeIdentity.storeCategory')} htmlFor="storeCategory" required error={errors.storeCategory}>
              <FormSelect
                value={storeIdentity.storeCategory}
                onValueChange={(v) => updateStoreIdentity({ storeCategory: v })}
                options={constants.storeCategories.map((c) => ({
                  value: c,
                  label: t(`onboarding.constants.storeCategories.${STORE_CATEGORY_KEYS[c]}`),
                }))}
                placeholder={t('onboarding.storeIdentity.selectCategory')}
                error={errors.storeCategory}
              />
            </FormField>
          </div>

          <FormField
            label={t('onboarding.storeIdentity.storeDescription')}
            htmlFor="storeDescription"
            required
            hint={`${storeIdentity.storeDescription.length}/500`}
            error={errors.storeDescription}
          >
            <FormTextarea
              id="storeDescription"
              value={storeIdentity.storeDescription}
              onChange={(e) => updateStoreIdentity({ storeDescription: e.target.value })}
              placeholder={t('onboarding.storeIdentity.descriptionPlaceholder')}
              rows={4}
              maxLength={500}
              error={errors.storeDescription}
            />
          </FormField>

          <FormField
            label={t('onboarding.storeIdentity.storeStory')}
            htmlFor="storeStory"
            hint={t('onboarding.storeIdentity.storyHint')}
          >
            <FormTextarea
              id="storeStory"
              value={storeIdentity.storeStory}
              onChange={(e) => updateStoreIdentity({ storeStory: e.target.value })}
              placeholder={t('onboarding.storeIdentity.storyPlaceholder')}
              rows={4}
              maxLength={1000}
            />
          </FormField>

          <div className="grid gap-6 lg:grid-cols-2">
            <StorageProfileImageUpload
              storageProfileId={StorageProfiles.Avatar}
              value={
                storeIdentity.storeLogo?.url
                  ? {
                      imageKey: storeIdentity.storeLogo.imageKey ?? '',
                      url: storeIdentity.storeLogo.url,
                      isUploading: storeIdentity.storeLogo.isUploading,
                      error: storeIdentity.storeLogo.error,
                    }
                  : null
              }
              onChange={handleLogoChange}
              aspectRatio="square"
              label={t('onboarding.storeIdentity.storeLogo')}
              hint={t('onboarding.storeIdentity.logoHint')}
            />

            <StorageProfileImageUpload
              storageProfileId={StorageProfiles.Cover}
              value={
                storeIdentity.coverImage?.url
                  ? {
                      imageKey: storeIdentity.coverImage.imageKey ?? '',
                      url: storeIdentity.coverImage.url,
                      isUploading: storeIdentity.coverImage.isUploading,
                      error: storeIdentity.coverImage.error,
                    }
                  : null
              }
              onChange={handleCoverChange}
              aspectRatio="wide"
              label={t('onboarding.storeIdentity.coverImage')}
              hint={t('onboarding.storeIdentity.coverHint')}
            />
          </div>

          <FormField
            label={t('onboarding.storeIdentity.specialties')}
            htmlFor="storeSpecialties"
            required
            hint={t('onboarding.storeIdentity.specialtiesHint')}
            error={errors.storeSpecialties}
          >
            <MultiSelect
              options={constants.specialties.map((s) => ({
                value: s,
                label: t(`onboarding.constants.specialties.${SPECIALTY_KEYS[s]}`),
              }))}
              value={storeIdentity.storeSpecialties}
              onChange={(v) => updateStoreIdentity({ storeSpecialties: v })}
              placeholder={t('onboarding.storeIdentity.selectSpecialties')}
            />
          </FormField>
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default StoreIdentitySection;
