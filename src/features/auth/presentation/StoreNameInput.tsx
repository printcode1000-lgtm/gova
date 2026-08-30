'use client';

import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';
import type { RegistrationFormData } from '@asol/auth-core';

export function StoreNameInput() {
  const { t } = useTranslation();
  const { control } = useFormContext<RegistrationFormData>();

  return (
    <Controller
      name="storeName"
      control={control}
      render={({ field, fieldState }) => (
        <div id="auth.store-name-input.div" className="space-y-2">
          <label id="auth.store-name-input.label" htmlFor="registration-store-name" className="text-sm font-semibold text-on-surface">
            {t('auth.storeName.label')}
          </label>
          <input
            id="registration-store-name"
            name="storeName"
            type="text"
            autoComplete="organization"
            placeholder={t('auth.storeName.placeholder')}
            className={cn('auth-input w-full', fieldState.error && 'border-error')}
            value={field.value || ''}
            onChange={field.onChange}
            maxLength={120}
          />
          <p id="auth.store-name-input.p" className="text-xs text-on-surface-variant">{t('auth.storeName.hint')}</p>
          {fieldState.error && <p id="auth.store-name-input.p.2" className="text-xs text-error">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
