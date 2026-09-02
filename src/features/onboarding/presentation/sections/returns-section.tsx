'use client';

import * as React from 'react';
import { RotateCcw, CalendarDays } from 'lucide-react';
import { useOnboardingStore } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormTextarea, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/utils';
import type { ReturnPolicyType } from '@/features/onboarding/domain/types';

const POLICY_TYPES: ReturnPolicyType[] = [
  'full_returns',
  'exchange_only',
  'store_credit',
  'no_returns',
];

const REFUND_METHODS = ['original', 'store_credit', 'choice'] as const;
const RETURN_PERIODS = ['7', '14', '30', '60', '90'] as const;

export function ReturnsSection() {
  const { t } = useTranslation();
  const { data, updateReturns, markStepComplete } = useOnboardingStore();

  const { returns } = data;

  const handleNext = () => {
    markStepComplete('returns');
    return true;
  };

  return (
    <div id='onboarding-presentation-sections-returns-section-div-1-fvnzh9' className="space-y-6 animate-in fade-in duration-300">
      <Card id='onboarding-presentation-sections-returns-section-card-2-v9bf9v'>
        <CardHeader id='onboarding-presentation-sections-returns-section-cardheader-3-nidhju'>
          <CardTitle id='onboarding-presentation-sections-returns-section-cardtitle-4-6duiek' className="flex items-center gap-2">
            <RotateCcw id='onboarding-presentation-sections-returns-section-rotateccw-5-km1tag' className="h-5 w-5" />
            {t('onboarding.returns.title')}
          </CardTitle>
          <CardDescription id='onboarding-presentation-sections-returns-section-carddescription-6-i77wgx'>{t('onboarding.returns.description')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-returns-section-cardcontent-7-g84tvu' className="space-y-6">
          <div id='onboarding-presentation-sections-returns-section-div-8-bu95rj' className="space-y-4">
            <Label id='onboarding-presentation-sections-returns-section-label-9-1kglak' className="text-base">{t('onboarding.returns.policyType')}</Label>
            <RadioGroup id='onboarding-presentation-sections-returns-section-radiogroup-10-nmfhkc'
              value={returns.policyType}
              onValueChange={(v) => updateReturns({ policyType: v as ReturnPolicyType })}
              className="grid gap-3 sm:grid-cols-2"
            >
              {POLICY_TYPES.map((policy) => (
                <div
                  key={policy}
                  className={cn(
                    'relative flex items-start gap-3 rounded-lg border p-4 transition-all',
                    returns.policyType === policy
                      ? 'border-primary bg-primary/5'
                      : 'border-border',
                  )}
                >
                  <RadioGroupItem value={policy} id={policy} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={policy} className="font-medium">
                      {t(`onboarding.returns.policyTypes.${policy}.label`)}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(`onboarding.returns.policyTypes.${policy}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {returns.policyType !== 'no_returns' && (
            <div id='onboarding-presentation-sections-returns-section-div-11-ks1etm' className="space-y-6 animate-in slide-in-from-top-2 duration-200">
              <div id='onboarding-presentation-sections-returns-section-div-12-6din4l' className="grid gap-6 sm:grid-cols-2">
                <FormField id='onboarding-presentation-sections-returns-section-formfield-13-gdbwdq'
                  label={t('onboarding.returns.returnPeriod')}
                  htmlFor="returnPeriod"
                  hint={t('onboarding.returns.returnPeriodHint')}
                >
                  <div id='onboarding-presentation-sections-returns-section-div-14-peqyru' className="flex items-center gap-2">
                    <CalendarDays id='onboarding-presentation-sections-returns-section-calendardays-15-myvnzm' className="h-5 w-5 text-muted-foreground" />
                    <FormSelect id='onboarding-presentation-sections-returns-section-formselect-16-uuolme'
                      value={returns.returnPeriod.toString()}
                      onValueChange={(v) => updateReturns({ returnPeriod: parseInt(v) })}
                      options={RETURN_PERIODS.map((value) => ({
                        value,
                        label: t(`onboarding.returns.period.${value}`),
                      }))}
                    />
                  </div>
                </FormField>

                <FormField id='onboarding-presentation-sections-returns-section-formfield-17-v5d6jl' label={t('onboarding.returns.refundMethod')} htmlFor="refundMethod">
                  <FormSelect id='onboarding-presentation-sections-returns-section-formselect-18-ig88rm'
                    value={returns.refundMethod}
                    onValueChange={(v) => updateReturns({ refundMethod: v as 'original' | 'store_credit' | 'choice' })}
                    options={REFUND_METHODS.map((value) => ({
                      value,
                      label: t(`onboarding.returns.refundMethods.${value}`),
                    }))}
                  />
                </FormField>
              </div>

              <FormField id='onboarding-presentation-sections-returns-section-formfield-19-2btvk1'
                label={t('onboarding.returns.policyDescription')}
                htmlFor='onboarding-presentation-sections-returns-section-formtextarea-20-ueobsn'
                hint={t('onboarding.returns.policyDescriptionHint')}
              >
                <FormTextarea
                  id='onboarding-presentation-sections-returns-section-formtextarea-20-ueobsn'
                  value={returns.policyDescription}
                  onChange={(e) => updateReturns({ policyDescription: e.target.value })}
                  placeholder={t('onboarding.returns.policyDescriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                />
              </FormField>
            </div>
          )}
        </CardContent>
      </Card>

      <StepNavigation id='onboarding-presentation-sections-returns-section-stepnavigation-21-itd97r' onNext={handleNext} showSkip />
    </div>
  );
}

export default ReturnsSection;
