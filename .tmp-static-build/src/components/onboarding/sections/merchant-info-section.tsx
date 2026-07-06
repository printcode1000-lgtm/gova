'use client';

import * as React from 'react';
import { useOnboardingStore, constants } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormInput, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BusinessType } from '@/lib/onboarding/types';

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
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>{t('onboarding.merchantInfo.title')}</CardTitle>
          <CardDescription>{t('onboarding.merchantInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <FormField label={t('onboarding.merchantInfo.yourName')} htmlFor="merchantName" required error={errors.merchantName}>
              <FormInput
                id="merchantName"
                value={merchantInfo.merchantName}
                onChange={(e) => updateMerchantInfo({ merchantName: e.target.value })}
                placeholder={t('onboarding.merchantInfo.namePlaceholder')}
                error={errors.merchantName}
              />
            </FormField>

            <FormField label={t('onboarding.merchantInfo.businessType')} htmlFor="businessType" required error={errors.businessType}>
              <FormSelect
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
            <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
              <FormField label={t('onboarding.merchantInfo.companyName')} htmlFor="companyName" required={showBusinessFields} error={errors.companyName}>
                <FormInput
                  id="companyName"
                  value={merchantInfo.companyName || ''}
                  onChange={(e) => updateMerchantInfo({ companyName: e.target.value })}
                  placeholder={t('onboarding.merchantInfo.companyPlaceholder')}
                  error={errors.companyName}
                />
              </FormField>

              <div className="grid gap-6 lg:grid-cols-2">
                <FormField label={t('onboarding.merchantInfo.registrationNumber')} htmlFor="registrationNumber" hint={t('onboarding.common.optional')}>
                  <FormInput
                    id="registrationNumber"
                    value={merchantInfo.registrationNumber || ''}
                    onChange={(e) => updateMerchantInfo({ registrationNumber: e.target.value })}
                    placeholder={t('onboarding.merchantInfo.registrationPlaceholder')}
                  />
                </FormField>

                <FormField label={t('onboarding.merchantInfo.taxId')} htmlFor="taxId" hint={t('onboarding.common.optional')}>
                  <FormInput
                    id="taxId"
                    value={merchantInfo.taxId || ''}
                    onChange={(e) => updateMerchantInfo({ taxId: e.target.value })}
                    placeholder={t('onboarding.merchantInfo.taxPlaceholder')}
                  />
                </FormField>
              </div>
            </div>
          )}

          <FormField label={t('onboarding.merchantInfo.yearsInBusiness')} htmlFor="businessAge" hint={t('onboarding.merchantInfo.yearsHint')}>
            <FormSelect
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

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default MerchantInfoSection;
