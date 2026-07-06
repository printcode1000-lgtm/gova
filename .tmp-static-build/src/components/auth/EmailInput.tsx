'use client';

import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RegistrationFormData } from '@/lib/validation/auth';

export function EmailInput() {
  const { t } = useTranslation();
  const { control } = useFormContext<RegistrationFormData>();

  return (
    <Controller
      name="email"
      control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <span className="text-sm font-semibold text-on-surface">{t('auth.email.label')}</span>
          <input
            type="email"
            inputMode="email"
            placeholder="example@email.com"
            data-gova-autofill="registration-email"
            className={cn('auth-input w-full', fieldState.error && 'border-error')}
            value={field.value || ''}
            onChange={field.onChange}
          />
          <p className="text-xs text-on-surface-variant">{t('auth.email.hint')}</p>
          {fieldState.error && <p className="text-xs text-error">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
