'use client';

import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';
import type { RegistrationFormData } from '@asol/auth-core';

export function EmailInput() {
  const { t } = useTranslation();
  const { control } = useFormContext<RegistrationFormData>();

  return (
    <Controller
      name="email"
      control={control}
      render={({ field, fieldState }) => (
        <div id='features-auth-presentation-emailinput-div-1-gnith9' className="space-y-2">
          <span id='features-auth-presentation-emailinput-text-2-op5sge' className="text-sm font-semibold text-on-surface">{t('auth.email.label')}</span>
          <input id='features-auth-presentation-emailinput-input-3-m5wwy6'
            type="email"
            inputMode="email"
            placeholder="example@email.com"
            className={cn('auth-input w-full', fieldState.error && 'border-error')}
            value={field.value || ''}
            onChange={field.onChange}
          />
          <p id='features-auth-presentation-emailinput-text-4-4bwvnx' className="text-xs text-on-surface-variant">{t('auth.email.hint')}</p>
          {fieldState.error && <p id='features-auth-presentation-emailinput-text-5-amrebs' className="text-xs text-error">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
