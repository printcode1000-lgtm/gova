'use client';

import * as React from 'react';
import { useOnboardingStore, constants } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormInput, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import type { BusinessType } from '@/features/onboarding/domain/types';

const BUSINESS_AGE_KEYS = ['justStarting', 'oneYear', 'twoYears', 'threeYears', 'fiveYears', 'tenYears'] as const;
const BUSINESS_AGE_VALUES = ['0', '1', '2', '3', '5', '10'] as const;

export function MerchantInfoSection() {
  const { t } = useTranslation();
  const { data, updateMerchantInfo, markStepComplete } = useOnboardingStore();
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { merchantInfo } = data;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!merchantInfo.merchantName.trim()) {
      newErrors.merchantName = t('onboarding.merchantInfo.errors.nameRequired');
    }
    if (!merchantInfo.businessType) {
      newErrors.businessType = t('onboarding.merchantInfo.errors.businessTypeRequired');
    }
    if (merchantInfo.businessType !== 'individual') {
      if (!merchantInfo.companyName?.trim()) {
        newErrors.companyName = t('onboarding.merchantInfo.errors.companyRequired');
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      markStepComplete('merchant-info');
      return true;
    }
    return false;
  };

  const showBusinessFields = merchantInfo.businessType && merchantInfo.businessType !== 'individual';

  return (
    <div id='onboarding-presentation-sections-merchant-info-section-div-1-6sxnt5' className="space-y-6 animate-in fade-in duration-300">
      <Card id='onboarding-presentation-sections-merchant-info-section-card-2-j0xny9'>
        <CardHeader id='onboarding-presentation-sections-merchant-info-section-cardheader-3-3wwst4'>
          <CardTitle id='onboarding-presentation-sections-merchant-info-section-cardtitle-4-pimh2b'>{t('onboarding.merchantInfo.title')}</CardTitle>
          <CardDescription id='onboarding-presentation-sections-merchant-info-section-carddescription-5-uykr4o'>{t('onboarding.merchantInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-merchant-info-section-cardcontent-6-qq3yo0' className="space-y-6">
          <div id='onboarding-presentation-sections-merchant-info-section-div-7-xcpnwn' className="grid gap-6 lg:grid-cols-2">
            <FormField id='onboarding-presentation-sections-merchant-info-section-formfield-8-5boa30' label={t('onboarding.merchantInfo.yourName')} htmlFor='onboarding-presentation-sections-merchant-info-section-forminput-9-zsotyd' required error={errors.merchantName}>
              <FormInput
                id='onboarding-presentation-sections-merchant-info-section-forminput-9-zsotyd'
                value={merchantInfo.merchantName}
                onChange={(e) => updateMerchantInfo({ merchantName: e.target.value })}
                placeholder={t('onboarding.merchantInfo.namePlaceholder')}
                error={errors.merchantName}
              />
            </FormField>

            <FormField id='onboarding-presentation-sections-merchant-info-section-formfield-10-edzy6n' label={t('onboarding.merchantInfo.businessType')} htmlFor="businessType" required error={errors.businessType}>
              <FormSelect id='onboarding-presentation-sections-merchant-info-section-formselect-11-gwzxbo'
                value={merchantInfo.businessType as string}
                onValueChange={(v) => updateMerchantInfo({ businessType: v as BusinessType })}
                options={constants.businessTypes.map((b) => ({
                  value: b.value,
                  label: t(`onboarding.constants.businessTypes.${b.value}`),
                }))}
                placeholder={t('onboarding.merchantInfo.selectBusinessType')}
                error={errors.businessType}
              />
            </FormField>
          </div>

          {showBusinessFields && (
            <div id='onboarding-presentation-sections-merchant-info-section-div-12-dddoha' className="space-y-6 animate-in slide-in-from-top-2 duration-200">
              <FormField id='onboarding-presentation-sections-merchant-info-section-formfield-13-2pqthw' label={t('onboarding.merchantInfo.companyName')} htmlFor='onboarding-presentation-sections-merchant-info-section-forminput-14-nwgxns' required={showBusinessFields} error={errors.companyName}>
                <FormInput
                  id='onboarding-presentation-sections-merchant-info-section-forminput-14-nwgxns'
                  value={merchantInfo.companyName || ''}
                  onChange={(e) => updateMerchantInfo({ companyName: e.target.value })}
                  placeholder={t('onboarding.merchantInfo.companyPlaceholder')}
                  error={errors.companyName}
                />
              </FormField>

              <div id='onboarding-presentation-sections-merchant-info-section-div-15-ybfu8k' className="grid gap-6 lg:grid-cols-2">
                <FormField id='onboarding-presentation-sections-merchant-info-section-formfield-16-yve7uk' label={t('onboarding.merchantInfo.registrationNumber')} htmlFor='onboarding-presentation-sections-merchant-info-section-forminput-17-kuab90' hint={t('onboarding.common.optional')}>
                  <FormInput
                    id='onboarding-presentation-sections-merchant-info-section-forminput-17-kuab90'
                    value={merchantInfo.registrationNumber || ''}
                    onChange={(e) => updateMerchantInfo({ registrationNumber: e.target.value })}
                    placeholder={t('onboarding.merchantInfo.registrationPlaceholder')}
                  />
                </FormField>

                <FormField id='onboarding-presentation-sections-merchant-info-section-formfield-18-rfyaey' label={t('onboarding.merchantInfo.taxId')} htmlFor='onboarding-presentation-sections-merchant-info-section-forminput-19-jcq0si' hint={t('onboarding.common.optional')}>
                  <FormInput
                    id='onboarding-presentation-sections-merchant-info-section-forminput-19-jcq0si'
                    value={merchantInfo.taxId || ''}
                    onChange={(e) => updateMerchantInfo({ taxId: e.target.value })}
                    placeholder={t('onboarding.merchantInfo.taxPlaceholder')}
                  />
                </FormField>
              </div>
            </div>
          )}

          <FormField id='onboarding-presentation-sections-merchant-info-section-formfield-20-58etaw' label={t('onboarding.merchantInfo.yearsInBusiness')} htmlFor="businessAge" hint={t('onboarding.merchantInfo.yearsHint')}>
            <FormSelect id='onboarding-presentation-sections-merchant-info-section-formselect-21-bwb5t2'
              value={merchantInfo.businessAge?.toString() || ''}
              onValueChange={(v) => updateMerchantInfo({ businessAge: v ? parseInt(v) : '' })}
              options={BUSINESS_AGE_VALUES.map((value, index) => ({
                value,
                label: t(`onboarding.merchantInfo.businessAge.${BUSINESS_AGE_KEYS[index]}`),
              }))}
              placeholder={t('onboarding.merchantInfo.selectYears')}
            />
          </FormField>
        </CardContent>
      </Card>

      <StepNavigation id='onboarding-presentation-sections-merchant-info-section-stepnavigation-22-ho5bdj' onNext={handleNext} showSkip />
    </div>
  );
}

export default MerchantInfoSection;
