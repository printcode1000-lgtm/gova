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
        <div id='features-auth-presentation-storenameinput-div-1-2inkro' className="space-y-2">
          <label id='features-auth-presentation-storenameinput-label-2-nrzoy7' htmlFor='features-auth-presentation-storenameinput-input-3-ovlhvz' className="text-sm font-semibold text-on-surface">
            {t('auth.storeName.label')}
          </label>
          <input
            id='features-auth-presentation-storenameinput-input-3-ovlhvz'
            name="storeName"
            type="text"
            autoComplete="organization"
            placeholder={t('auth.storeName.placeholder')}
            className={cn('auth-input w-full', fieldState.error && 'border-error')}
            value={field.value || ''}
            onChange={field.onChange}
            maxLength={120}
          />
          <p id='features-auth-presentation-storenameinput-text-4-eddpbv' className="text-xs text-on-surface-variant">{t('auth.storeName.hint')}</p>
          {fieldState.error && <p id='features-auth-presentation-storenameinput-text-5-djqpzo' className="text-xs text-error">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
