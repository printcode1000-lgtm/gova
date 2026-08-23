'use client';

import { ChevronDown } from 'lucide-react';
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
        <details className="group overflow-hidden rounded-xl border border-outline-variant bg-surface-container/30">
          <summary className="flex min-h-12 list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-on-surface transition-colors active:bg-surface-container">
            <span>{t('auth.email.optionalSection')}</span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="space-y-2 border-t border-outline-variant px-4 py-3">
            <span className="text-sm font-semibold text-on-surface">{t('auth.email.label')}</span>
            <input
              type="email"
              inputMode="email"
              placeholder="example@email.com"
              className={cn('auth-input w-full', fieldState.error && 'border-error')}
              value={field.value || ''}
              onChange={field.onChange}
            />
            <p className="text-xs text-on-surface-variant">{t('auth.email.hint')}</p>
            {fieldState.error && <p className="text-xs text-error">{fieldState.error.message}</p>}
          </div>
        </details>
      )}
    />
  );
}
