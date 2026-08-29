'use client';

import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';
import { foldPasswordDigits, type RegistrationFormData } from '@asol/auth-core';
import { uiAttributes } from "@asol/ui-registry-core";

interface PasswordInputProps {
  name: 'password' | 'confirmPassword';
}

export function PasswordInput({ id, name }: PasswordInputProps & { id?: string }) {
  const { t } = useTranslation();
  const [show, setShow] = React.useState(false);
  const { control } = useFormContext<RegistrationFormData>();

  const label =
    name === 'password' ? t('auth.password.label') : t('auth.password.confirmLabel');
  const placeholder =
    name === 'password' ? t('auth.password.placeholder') : t('auth.password.confirmPlaceholder');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div {...uiAttributes({ uid: "auth.password-input.div-jGZm6K", id: "auth.password-input.div" })} id={id} className="space-y-2">
          <span {...uiAttributes({ uid: "auth.password-input.span-8hiDJT", id: "auth.password-input.span" })} className="text-sm font-semibold text-on-surface">{label}</span>
          <div {...uiAttributes({ uid: "auth.password-input.div.2-12iUGy", id: "auth.password-input.div.2" })} className="relative">
            <input {...uiAttributes({ uid: "auth.password-input.input-C4DZ2I", id: "auth.password-input.input" })}
              name={name}
              autoComplete={name === 'password' ? 'new-password' : 'off'}
              type={show ? 'text' : 'password'}
              placeholder={placeholder}
              className={cn('auth-input pe-10 w-full', fieldState.error && 'border-error')}
              value={field.value}
              onChange={(event) =>
                field.onChange(foldPasswordDigits(event.target.value))
              }
            />
            <button {...uiAttributes({ uid: "auth.password-input.button-EASA2R", id: "auth.password-input.button" })}
              type="button"
              className="absolute end-0 top-0 h-full px-3 text-on-surface-variant"
              onClick={() => setShow((s) => !s)}
              tabIndex={-1}
              aria-label={t('auth.password.show')}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldState.error && <p {...uiAttributes({ uid: "auth.password-input.p-XdQm4w", id: "auth.password-input.p" })} className="text-xs text-error">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
