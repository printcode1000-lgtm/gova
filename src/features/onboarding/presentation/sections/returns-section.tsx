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
import type { UiDescriptor } from '@asol/ui-registry-core';
import type { ReturnPolicyType } from '@/features/onboarding/domain/types';
import { uiAttributes } from "@asol/ui-registry-core";

const POLICY_TYPES: ReturnPolicyType[] = [
  'full_returns',
  'exchange_only',
  'store_credit',
  'no_returns',
];

/**
 * Each policy option is registered from its own stable domain id, so the uid
 * never depends on the rendered order of POLICY_TYPES.
 */
const POLICY_TYPE_UI = {
  full_returns: { uid: 'onboarding.returns.policy-full-returns-Y8J2DR', id: 'onboarding.returns.policy-full-returns', kind: 'field', action: 'select-policy', part: 'policy' },
  exchange_only: { uid: 'onboarding.returns.policy-exchange-only-T2WHzq', id: 'onboarding.returns.policy-exchange-only', kind: 'field', action: 'select-policy', part: 'policy' },
  store_credit: { uid: 'onboarding.returns.policy-store-credit-75R1vi', id: 'onboarding.returns.policy-store-credit', kind: 'field', action: 'select-policy', part: 'policy' },
  no_returns: { uid: 'onboarding.returns.policy-no-returns-2Pfo4H', id: 'onboarding.returns.policy-no-returns', kind: 'field', action: 'select-policy', part: 'policy' },
} as const satisfies Record<ReturnPolicyType, UiDescriptor>;

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
    <div {...uiAttributes({ uid: "onboarding.sections.returns-section.div.6-4MQ3PX", id: "onboarding.sections.returns-section.div.6" })} id="onboarding.sections.returns-section.div" className="space-y-6 animate-in fade-in duration-300">
      <Card id="onboarding.sections.returns-section.card">
        <CardHeader id="onboarding.sections.returns-section.card-header">
          <CardTitle id="onboarding.sections.returns-section.card-title" className="flex items-center gap-2">
            <RotateCcw id="onboarding.sections.returns-section.rotate-ccw" className="h-5 w-5" />
            {t('onboarding.returns.title')}
          </CardTitle>
          <CardDescription id="onboarding.sections.returns-section.card-description">{t('onboarding.returns.description')}</CardDescription>
        </CardHeader>
        <CardContent id="onboarding.sections.returns-section.card-content" className="space-y-6">
          <div {...uiAttributes({ uid: "onboarding.sections.returns-section.div.7-Ur0GpK", id: "onboarding.sections.returns-section.div.7" })} id="onboarding.sections.returns-section.div.2" className="space-y-4">
            <Label id="onboarding.sections.returns-section.label" className="text-base">{t('onboarding.returns.policyType')}</Label>
            <RadioGroup id="onboarding.sections.returns-section.radio-group"
              value={returns.policyType}
              onValueChange={(v) => updateReturns({ policyType: v as ReturnPolicyType })}
              className="grid gap-3 sm:grid-cols-2"
            >
              {POLICY_TYPES.map((policy) => (
                <div
                  key={policy} {...uiAttributes({ uid: "onboarding.sections.returns-section.div.8-PeZ3VH", id: "onboarding.sections.returns-section.div.8" })}
                  className={cn(
                    'relative flex items-start gap-3 rounded-lg border p-4 transition-all',
                    returns.policyType === policy
                      ? 'border-primary bg-primary/5'
                      : 'border-border',
                  )}
                >
                  <RadioGroupItem ui={POLICY_TYPE_UI[policy]} value={policy} id={policy} className="mt-0.5" />
                  <div {...uiAttributes({ uid: "onboarding.sections.returns-section.div.9-Y3QGzW", id: "onboarding.sections.returns-section.div.9" })} className="flex-1">
                    <Label htmlFor={policy} className="font-medium">
                      {t(`onboarding.returns.policyTypes.${policy}.label`)}
                    </Label>
                    <p {...uiAttributes({ uid: "onboarding.sections.returns-section.p-55UNY5", id: "onboarding.sections.returns-section.p" })} className="text-sm text-muted-foreground mt-1">
                      {t(`onboarding.returns.policyTypes.${policy}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {returns.policyType !== 'no_returns' && (
            <div {...uiAttributes({ uid: "onboarding.sections.returns-section.div.10-4L98FZ", id: "onboarding.sections.returns-section.div.10" })} id="onboarding.sections.returns-section.div.3" className="space-y-6 animate-in slide-in-from-top-2 duration-200">
              <div {...uiAttributes({ uid: "onboarding.sections.returns-section.div.11-i6sZWh", id: "onboarding.sections.returns-section.div.11" })} id="onboarding.sections.returns-section.div.4" className="grid gap-6 sm:grid-cols-2">
                <FormField id="onboarding.sections.returns-section.form-field"
                  label={t('onboarding.returns.returnPeriod')}
                  htmlFor="returnPeriod"
                  hint={t('onboarding.returns.returnPeriodHint')}
                >
                  <div {...uiAttributes({ uid: "onboarding.sections.returns-section.div.12-fbNvT6", id: "onboarding.sections.returns-section.div.12" })} id="onboarding.sections.returns-section.div.5" className="flex items-center gap-2">
                    <CalendarDays id="onboarding.sections.returns-section.calendar-days" className="h-5 w-5 text-muted-foreground" />
                    <FormSelect id="onboarding.sections.returns-section.form-select" ui={{ uid: 'onboarding.returns.return-period-NE7mB4', id: 'onboarding.returns.return-period', kind: 'field', part: 'form' }}
                      value={returns.returnPeriod.toString()}
                      onValueChange={(v) => updateReturns({ returnPeriod: parseInt(v) })}
                      options={RETURN_PERIODS.map((value) => ({
                        value,
                        label: t(`onboarding.returns.period.${value}`),
                      }))}
                    />
                  </div>
                </FormField>

                <FormField id="onboarding.sections.returns-section.form-field.2" label={t('onboarding.returns.refundMethod')} htmlFor="refundMethod">
                  <FormSelect id="onboarding.sections.returns-section.form-select.2" ui={{ uid: 'onboarding.returns.refund-method-B9j88E', id: 'onboarding.returns.refund-method', kind: 'field', part: 'form' }}
                    value={returns.refundMethod}
                    onValueChange={(v) => updateReturns({ refundMethod: v as 'original' | 'store_credit' | 'choice' })}
                    options={REFUND_METHODS.map((value) => ({
                      value,
                      label: t(`onboarding.returns.refundMethods.${value}`),
                    }))}
                  />
                </FormField>
              </div>

              <FormField id="onboarding.sections.returns-section.form-field.3"
                label={t('onboarding.returns.policyDescription')}
                htmlFor="policyDescription"
                hint={t('onboarding.returns.policyDescriptionHint')}
              >
                <FormTextarea ui={{ uid: 'onboarding.returns.policy-description-pO9fsl', id: 'onboarding.returns.policy-description', kind: 'field', part: 'form' }}
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

      <StepNavigation id="onboarding.sections.returns-section.step-navigation" onNext={handleNext} showSkip />
    </div>
  );
}

export default ReturnsSection;
