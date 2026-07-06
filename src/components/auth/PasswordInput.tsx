'use client';

import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RegistrationFormData } from '@/lib/validation/auth';

interface PasswordInputProps {
  name: 'password' | 'confirmPassword';
}

export function PasswordInput({ name }: PasswordInputProps) {
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
        <div className="space-y-2">
          <span className="text-sm font-semibold text-on-surface">{label}</span>
          <div className="relative">
            <input
              name={name}
              autoComplete={name === 'password' ? 'new-password' : 'off'}
              type={show ? 'text' : 'password'}
              placeholder={placeholder}
              data-gova-autofill={
                name === 'password' ? 'registration-password' : 'registration-confirm-password'
              }
              className={cn('auth-input pe-10 w-full', fieldState.error && 'border-error')}
              value={field.value}
              onChange={field.onChange}
            />
            <button
              type="button"
              className="absolute end-0 top-0 h-full px-3 text-on-surface-variant"
              onClick={() => setShow((s) => !s)}
              tabIndex={-1}
              aria-label={t('auth.password.show')}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldState.error && <p className="text-xs text-error">{fieldState.error.message}</p>}
        </div>
      )}
    />
  );
}
