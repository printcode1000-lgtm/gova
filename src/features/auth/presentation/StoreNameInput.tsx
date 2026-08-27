'use client';

import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';
import type { RegistrationFormData } from '@asol/auth-core';
import { uiAttributes } from '@asol/ui-registry-core';

export function StoreNameInput() {
  const { t } = useTranslation();
  const { control } = useFormContext<RegistrationFormData>();

  return (
    <Controller
      name="storeName"
      control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <label htmlFor="registration-store-name" className="text-sm font-semibold text-on-surface">
            {t('auth.storeName.label')}
          </label>
          <input
            {...uiAttributes({
              uid: 'registration-store-name-RTpXW9',
              id: 'registration-store-name',
              kind: 'field',
              interaction: { type: 'type', valueContract: 'short-text' },
            })}
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
          <p className="text-xs text-on-surface-variant">{t('auth.storeName.hint')}</p>
          {fieldState.error && <p className="text-xs text-error">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
