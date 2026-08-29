'use client';

import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';
import type { RegistrationFormData } from '@asol/auth-core';
import { uiAttributes } from "@asol/ui-registry-core";

export function EmailInput() {
  const { t } = useTranslation();
  const { control } = useFormContext<RegistrationFormData>();

  return (
    <Controller
      name="email"
      control={control}
      render={({ field, fieldState }) => (
        <div {...uiAttributes({ uid: "auth.email-input.div.2-RkgBR3", id: "auth.email-input.div.2" })} id="auth.email-input.div" className="space-y-2">
          <span {...uiAttributes({ uid: "auth.email-input.span.2-E1OgFV", id: "auth.email-input.span.2" })} id="auth.email-input.span" className="text-sm font-semibold text-on-surface">{t('auth.email.label')}</span>
          <input {...uiAttributes({ uid: "auth.email-input.input.2-ehiE3U", id: "auth.email-input.input.2" })} id="auth.email-input.input"
            type="email"
            inputMode="email"
            placeholder="example@email.com"
            className={cn('auth-input w-full', fieldState.error && 'border-error')}
            value={field.value || ''}
            onChange={field.onChange}
          />
          <p {...uiAttributes({ uid: "auth.email-input.p.3-zv2lXE", id: "auth.email-input.p.3" })} id="auth.email-input.p" className="text-xs text-on-surface-variant">{t('auth.email.hint')}</p>
          {fieldState.error && <p {...uiAttributes({ uid: "auth.email-input.p.4-Rox4qn", id: "auth.email-input.p.4" })} id="auth.email-input.p.2" className="text-xs text-error">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
