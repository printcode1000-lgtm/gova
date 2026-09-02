'use client';

import * as React from 'react';
import { useOnboardingStore, constants } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormInput, FormTextarea, FormSelect, MultiSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { StorageImageManager, type StorageImageManagerHandle } from '@/features/storage/ui';
import { registerPageSaveImageUploadHandle } from '@/features/page-save';
import { useOnboardingSaveBridge } from '@/features/page-save/ui';
import { StorageProfiles, type StoredImage } from '@asol/storage-core';

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
  const bridge = useOnboardingSaveBridge();
  const [logoHandle, setLogoHandle] = React.useState<StorageImageManagerHandle | null>(null);
  const [coverHandle, setCoverHandle] = React.useState<StorageImageManagerHandle | null>(null);
  const logoPendingRef = React.useRef(false);
  const coverPendingRef = React.useRef(false);

  const syncPending = React.useCallback(() => {
    bridge?.setImagesPending(logoPendingRef.current || coverPendingRef.current);
  }, [bridge]);

  React.useEffect(() => {
    if (!logoHandle) return undefined;
    return registerPageSaveImageUploadHandle("onboarding-store-logo", logoHandle);
  }, [logoHandle]);

  React.useEffect(() => {
    if (!coverHandle) return undefined;
    return registerPageSaveImageUploadHandle("onboarding-store-cover", coverHandle);
  }, [coverHandle]);

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
    <div id='onboarding-presentation-sections-store-identity-section-div-1-axf34n' className="space-y-6 animate-in fade-in duration-300">
      <Card id='onboarding-presentation-sections-store-identity-section-card-2-1sddur'>
        <CardHeader id='onboarding-presentation-sections-store-identity-section-cardheader-3-l8vfkv'>
          <CardTitle id='onboarding-presentation-sections-store-identity-section-cardtitle-4-tk85pj'>{t('onboarding.storeIdentity.title')}</CardTitle>
          <CardDescription id='onboarding-presentation-sections-store-identity-section-carddescription-5-vcgtia'>{t('onboarding.storeIdentity.description')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-store-identity-section-cardcontent-6-caieoj' className="space-y-6">
          <div id='onboarding-presentation-sections-store-identity-section-div-7-fqfbcw' className="grid gap-6 lg:grid-cols-2">
            <FormField id='onboarding-presentation-sections-store-identity-section-formfield-8-gmfv6r' label={t('onboarding.storeIdentity.storeName')} htmlFor='onboarding-presentation-sections-store-identity-section-forminput-9-jhbqee' required error={errors.storeName}>
              <FormInput
                id='onboarding-presentation-sections-store-identity-section-forminput-9-jhbqee'
                value={storeIdentity.storeName}
                onChange={(e) => updateStoreIdentity({ storeName: e.target.value })}
                placeholder={t('onboarding.storeIdentity.storeNamePlaceholder')}
                error={errors.storeName}
              />
            </FormField>

            <FormField id='onboarding-presentation-sections-store-identity-section-formfield-10-1az67g' label={t('onboarding.storeIdentity.storeCategory')} htmlFor="storeCategory" required error={errors.storeCategory}>
              <FormSelect id='onboarding-presentation-sections-store-identity-section-formselect-11-9cr0m2'
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

          <FormField id='onboarding-presentation-sections-store-identity-section-formfield-12-bbdv4i'
            label={t('onboarding.storeIdentity.storeDescription')}
            htmlFor='onboarding-presentation-sections-store-identity-section-formtextarea-13-qdka6a'
            required
            hint={`${storeIdentity.storeDescription.length}/500`}
            error={errors.storeDescription}
          >
            <FormTextarea
              id='onboarding-presentation-sections-store-identity-section-formtextarea-13-qdka6a'
              value={storeIdentity.storeDescription}
              onChange={(e) => updateStoreIdentity({ storeDescription: e.target.value })}
              placeholder={t('onboarding.storeIdentity.descriptionPlaceholder')}
              rows={4}
              maxLength={500}
              error={errors.storeDescription}
            />
          </FormField>

          <FormField id='onboarding-presentation-sections-store-identity-section-formfield-14-b5aena'
            label={t('onboarding.storeIdentity.storeStory')}
            htmlFor='onboarding-presentation-sections-store-identity-section-formtextarea-15-zsqidv'
            hint={t('onboarding.storeIdentity.storyHint')}
          >
            <FormTextarea
              id='onboarding-presentation-sections-store-identity-section-formtextarea-15-zsqidv'
              value={storeIdentity.storeStory}
              onChange={(e) => updateStoreIdentity({ storeStory: e.target.value })}
              placeholder={t('onboarding.storeIdentity.storyPlaceholder')}
              rows={4}
              maxLength={1000}
            />
          </FormField>

          <div id='onboarding-presentation-sections-store-identity-section-div-16-hgqrqt' className="grid gap-6 lg:grid-cols-2">
            <StorageImageManager
              ref={setLogoHandle}
              config={{
                id: 'onboarding-store-logo',
                storageProfileId: StorageProfiles.Avatar,
                maxItems: 1,
                aspectRatio: 'square',
                allowReplace: true,
              }}
              value={
                storeIdentity.storeLogo?.url ||
                storeIdentity.storeLogo?.isUploading ||
                storeIdentity.storeLogo?.error
                  ? [{
                      imageKey: storeIdentity.storeLogo.imageKey ?? '',
                      url: storeIdentity.storeLogo.url,
                      isUploading: storeIdentity.storeLogo.isUploading,
                      error: storeIdentity.storeLogo.error,
                    }]
                  : []
              }
              onChange={(images) => handleLogoChange(images[0] ?? null)}
              onPendingChange={(pending) => {
                logoPendingRef.current = pending;
                syncPending();
              }}
              label={t('onboarding.storeIdentity.storeLogo')}
              hint={t('onboarding.storeIdentity.logoHint')}
            />

            <StorageImageManager
              ref={setCoverHandle}
              config={{
                id: 'onboarding-store-cover',
                storageProfileId: StorageProfiles.Cover,
                maxItems: 1,
                aspectRatio: 'wide',
                allowReplace: true,
              }}
              value={
                storeIdentity.coverImage?.url ||
                storeIdentity.coverImage?.isUploading ||
                storeIdentity.coverImage?.error
                  ? [{
                      imageKey: storeIdentity.coverImage.imageKey ?? '',
                      url: storeIdentity.coverImage.url,
                      isUploading: storeIdentity.coverImage.isUploading,
                      error: storeIdentity.coverImage.error,
                    }]
                  : []
              }
              onChange={(images) => handleCoverChange(images[0] ?? null)}
              onPendingChange={(pending) => {
                coverPendingRef.current = pending;
                syncPending();
              }}
              label={t('onboarding.storeIdentity.coverImage')}
              hint={t('onboarding.storeIdentity.coverHint')}
            />
          </div>

          <FormField id='onboarding-presentation-sections-store-identity-section-formfield-17-lcgrnc'
            label={t('onboarding.storeIdentity.specialties')}
            htmlFor="storeSpecialties"
            required
            hint={t('onboarding.storeIdentity.specialtiesHint')}
            error={errors.storeSpecialties}
          >
            <MultiSelect id='onboarding-presentation-sections-store-identity-section-multiselect-18-dpiash'
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

      <StepNavigation id='onboarding-presentation-sections-store-identity-section-stepnavigation-19-jyhrte' onNext={handleNext} showSkip />
    </div>
  );
}

export default StoreIdentitySection;
