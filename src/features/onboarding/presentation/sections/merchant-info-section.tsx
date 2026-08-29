'use client';

import * as React from 'react';
import { useOnboardingStore, constants } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormInput, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import type { BusinessType } from '@/features/onboarding/domain/types';
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "onboarding.sections.merchant-info-section.div.5-qI1MMu", id: "onboarding.sections.merchant-info-section.div.5" })} id="onboarding.sections.merchant-info-section.div" className="space-y-6 animate-in fade-in duration-300">
      <Card ui={{ uid: "onboarding.sections.merchant-info-section.card.2-cVe5GI", id: "onboarding.sections.merchant-info-section.card.2" }} id="onboarding.sections.merchant-info-section.card">
        <CardHeader ui={{ uid: "onboarding.sections.merchant-info-section.card-header.2-6beSVH", id: "onboarding.sections.merchant-info-section.card-header.2" }} id="onboarding.sections.merchant-info-section.card-header">
          <CardTitle ui={{ uid: "onboarding.sections.merchant-info-section.card-title.2-r163VO", id: "onboarding.sections.merchant-info-section.card-title.2" }} id="onboarding.sections.merchant-info-section.card-title">{t('onboarding.merchantInfo.title')}</CardTitle>
          <CardDescription ui={{ uid: "onboarding.sections.merchant-info-section.card-description.2-Jz45EX", id: "onboarding.sections.merchant-info-section.card-description.2" }} id="onboarding.sections.merchant-info-section.card-description">{t('onboarding.merchantInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent ui={{ uid: "onboarding.sections.merchant-info-section.card-content.2-4kvjDD", id: "onboarding.sections.merchant-info-section.card-content.2" }} id="onboarding.sections.merchant-info-section.card-content" className="space-y-6">
          <div {...uiAttributes({ uid: "onboarding.sections.merchant-info-section.div.6-301ePI", id: "onboarding.sections.merchant-info-section.div.6" })} id="onboarding.sections.merchant-info-section.div.2" className="grid gap-6 lg:grid-cols-2">
            <FormField id="onboarding.sections.merchant-info-section.form-field" label={t('onboarding.merchantInfo.yourName')} htmlFor="merchantName" required error={errors.merchantName}>
              <FormInput ui={{ uid: 'onboarding.merchant-info.merchant-name-89HUhH', id: 'onboarding.merchant-info.merchant-name', kind: 'field', part: 'form' }}
                id="merchantName"
                value={merchantInfo.merchantName}
                onChange={(e) => updateMerchantInfo({ merchantName: e.target.value })}
                placeholder={t('onboarding.merchantInfo.namePlaceholder')}
                error={errors.merchantName}
              />
            </FormField>

            <FormField id="onboarding.sections.merchant-info-section.form-field.2" label={t('onboarding.merchantInfo.businessType')} htmlFor="businessType" required error={errors.businessType}>
              <FormSelect id="onboarding.sections.merchant-info-section.form-select" ui={{ uid: 'onboarding.merchant-info.business-type-w8PI3X', id: 'onboarding.merchant-info.business-type', kind: 'field', part: 'form' }}
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
            <div {...uiAttributes({ uid: "onboarding.sections.merchant-info-section.div.7-C55dgh", id: "onboarding.sections.merchant-info-section.div.7" })} id="onboarding.sections.merchant-info-section.div.3" className="space-y-6 animate-in slide-in-from-top-2 duration-200">
              <FormField id="onboarding.sections.merchant-info-section.form-field.3" label={t('onboarding.merchantInfo.companyName')} htmlFor="companyName" required={showBusinessFields} error={errors.companyName}>
                <FormInput ui={{ uid: 'onboarding.merchant-info.company-name-1PGUGk', id: 'onboarding.merchant-info.company-name', kind: 'field', part: 'form' }}
                  id="companyName"
                  value={merchantInfo.companyName || ''}
                  onChange={(e) => updateMerchantInfo({ companyName: e.target.value })}
                  placeholder={t('onboarding.merchantInfo.companyPlaceholder')}
                  error={errors.companyName}
                />
              </FormField>

              <div {...uiAttributes({ uid: "onboarding.sections.merchant-info-section.div.8-t1OI6y", id: "onboarding.sections.merchant-info-section.div.8" })} id="onboarding.sections.merchant-info-section.div.4" className="grid gap-6 lg:grid-cols-2">
                <FormField id="onboarding.sections.merchant-info-section.form-field.4" label={t('onboarding.merchantInfo.registrationNumber')} htmlFor="registrationNumber" hint={t('onboarding.common.optional')}>
                  <FormInput ui={{ uid: 'onboarding.merchant-info.registration-number-F2UO6Q', id: 'onboarding.merchant-info.registration-number', kind: 'field', part: 'form' }}
                    id="registrationNumber"
                    value={merchantInfo.registrationNumber || ''}
                    onChange={(e) => updateMerchantInfo({ registrationNumber: e.target.value })}
                    placeholder={t('onboarding.merchantInfo.registrationPlaceholder')}
                  />
                </FormField>

                <FormField id="onboarding.sections.merchant-info-section.form-field.5" label={t('onboarding.merchantInfo.taxId')} htmlFor="taxId" hint={t('onboarding.common.optional')}>
                  <FormInput ui={{ uid: 'onboarding.merchant-info.tax-id-bLWG5W', id: 'onboarding.merchant-info.tax-id', kind: 'field', part: 'form' }}
                    id="taxId"
                    value={merchantInfo.taxId || ''}
                    onChange={(e) => updateMerchantInfo({ taxId: e.target.value })}
                    placeholder={t('onboarding.merchantInfo.taxPlaceholder')}
                  />
                </FormField>
              </div>
            </div>
          )}

          <FormField id="onboarding.sections.merchant-info-section.form-field.6" label={t('onboarding.merchantInfo.yearsInBusiness')} htmlFor="businessAge" hint={t('onboarding.merchantInfo.yearsHint')}>
            <FormSelect id="onboarding.sections.merchant-info-section.form-select.2" ui={{ uid: 'onboarding.merchant-info.business-age-a2UoXJ', id: 'onboarding.merchant-info.business-age', kind: 'field', part: 'form' }}
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

      <StepNavigation id="onboarding.sections.merchant-info-section.step-navigation" onNext={handleNext} showSkip />
    </div>
  );
}

export default MerchantInfoSection;
