'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { FormProvider } from 'react-hook-form';

import { AuthHero } from '@/features/auth/presentation/AuthHero';
import { AuthMobileBrand } from '@/features/auth/presentation/AuthMobileBrand';
import { EmailInput } from '@/features/auth/presentation/EmailInput';
import { PasswordInput } from '@/features/auth/presentation/PasswordInput';
import { PasswordStrength } from '@/features/auth/presentation/PasswordStrength';
import { PhoneVerification } from '@/features/auth/presentation/PhoneVerification';
import { useGuestSession } from '@/features/auth/application/hooks/use-guest-session';
import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';
import { createRegistrationSchema, type RegistrationFormData } from '@asol/auth-core';

import { useRegister } from './hooks/use-register';

export function RegistrationPageContent() {
  const { t, isRTL } = useTranslation();
  const { form, isSubmitting, error, password, phoneVerified, onSubmit } = useRegister();

  return (
    <div className="auth-page">
      <div className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero variant="registration" />
        <div className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 w-full asol-auth-form-panel" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl space-y-6 sm:space-y-8">
            <AuthMobileBrand />
            <div className="space-y-2 text-center lg:text-start"><h1 className="text-3xl font-bold text-on-surface">{t('auth.registration.title')}</h1></div>
            {error && <div className="p-3 text-sm rounded bg-error/15 text-error text-center font-medium animate-in fade-in duration-200">{error}</div>}
            <FormProvider {...form}>
              <form data-simulation-event="registration-submit" onSubmit={onSubmit} className="space-y-6" noValidate>
                <PhoneVerification useForm={true} />
                <div className="space-y-4">
                  <PasswordInput name="password" />
                  {password.length > 0 && <PasswordStrength password={password} />}
                  <PasswordInput name="confirmPassword" />
                  <EmailInput />
                </div>
                <div className="space-y-3">
                  {!phoneVerified && <p className="text-xs text-on-surface-variant flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />{t('auth.registration.phoneVerificationRequired')}</p>}
                  <button type="submit" disabled={isSubmitting || !phoneVerified} className={cn('w-full auth-cta h-12 text-sm font-semibold', !phoneVerified && 'opacity-50')}>
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin me-2" />{t('auth.registration.submitting')}</> : <>{t('auth.registration.submit')}<ArrowRight className="h-4 w-4 ms-2" /></>}
                  </button>
                </div>
              </form>
            </FormProvider>
            <p className="text-center text-sm text-on-surface-variant">{t('auth.registration.hasAccount')}{''}<Link data-simulation-event="registration-login" href="/login" className="font-medium text-primary">{t('auth.registration.loginLink')}</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
