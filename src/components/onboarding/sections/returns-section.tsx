'use client';

import * as React from 'react';
import { RotateCcw, CalendarDays } from 'lucide-react';
import { useOnboardingStore } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormTextarea, FormSelect } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ReturnPolicyType } from '@/lib/onboarding/types';

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
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {t('onboarding.returns.title')}
          </CardTitle>
          <CardDescription>{t('onboarding.returns.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base">{t('onboarding.returns.policyType')}</Label>
            <RadioGroup
              value={returns.policyType}
              onValueChange={(v) => updateReturns({ policyType: v as ReturnPolicyType })}
              className="grid gap-3 sm:grid-cols-2"
            >
              {POLICY_TYPES.map((policy) => (
                <div
                  key={policy}
                  className={cn(
                    'relative flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all',
                    returns.policyType === policy
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <RadioGroupItem value={policy} id={policy} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={policy} className="font-medium cursor-pointer">
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
            <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  label={t('onboarding.returns.returnPeriod')}
                  htmlFor="returnPeriod"
                  hint={t('onboarding.returns.returnPeriodHint')}
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <FormSelect
                      value={returns.returnPeriod.toString()}
                      onValueChange={(v) => updateReturns({ returnPeriod: parseInt(v) })}
                      options={RETURN_PERIODS.map((value) => ({
                        value,
                        label: t(`onboarding.returns.period.${value}`),
                      }))}
                    />
                  </div>
                </FormField>

                <FormField label={t('onboarding.returns.refundMethod')} htmlFor="refundMethod">
                  <FormSelect
                    value={returns.refundMethod}
                    onValueChange={(v) => updateReturns({ refundMethod: v as 'original' | 'store_credit' | 'choice' })}
                    options={REFUND_METHODS.map((value) => ({
                      value,
                      label: t(`onboarding.returns.refundMethods.${value}`),
                    }))}
                  />
                </FormField>
              </div>

              <FormField
                label={t('onboarding.returns.policyDescription')}
                htmlFor="policyDescription"
                hint={t('onboarding.returns.policyDescriptionHint')}
              >
                <FormTextarea
                  id="policyDescription"
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

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default ReturnsSection;
