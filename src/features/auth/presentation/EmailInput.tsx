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
        <div id="auth.email-input.div" className="space-y-2">
          <span id="auth.email-input.span" className="text-sm font-semibold text-on-surface">{t('auth.email.label')}</span>
          <input id="auth.email-input.input"
            type="email"
            inputMode="email"
            placeholder="example@email.com"
            className={cn('auth-input w-full', fieldState.error && 'border-error')}
            value={field.value || ''}
            onChange={field.onChange}
          />
          <p id="auth.email-input.p" className="text-xs text-on-surface-variant">{t('auth.email.hint')}</p>
          {fieldState.error && <p id="auth.email-input.p.2" className="text-xs text-error">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
