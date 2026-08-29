'use client';

import { ArrowRight, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { FormProvider } from 'react-hook-form';

import { AuthHero } from '@/features/auth/presentation/AuthHero';
import { AuthMobileBrand } from '@/features/auth/presentation/AuthMobileBrand';
import { OptionalRegistrationFields } from '@/features/auth/presentation/OptionalRegistrationFields';
import { PasswordInput } from '@/features/auth/presentation/PasswordInput';
import { PasswordStrength } from '@/features/auth/presentation/PasswordStrength';
import { PhoneVerification } from '@/features/auth/presentation/PhoneVerification';
import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';

import { useRegister } from './hooks/use-register';
import { uiAttributes } from "@asol/ui-registry-core";

export function RegistrationPageContent() {
  const { t, isRTL } = useTranslation();
  const { form, isSubmitting, error, password, phoneVerified, onSubmit } = useRegister();

  return (
    <div {...uiAttributes({ uid: "auth.registration-page-content.div.9-Dg5H2G", id: "auth.registration-page-content.div.9" })} id="auth.registration-page-content.div" className="auth-page">
      <div {...uiAttributes({ uid: "auth.registration-page-content.div.10-e5bfyP", id: "auth.registration-page-content.div.10" })} id="auth.registration-page-content.div.2" className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero id="auth.registration-page-content.auth-hero" variant="registration" />
        <div {...uiAttributes({ uid: "auth.registration-page-content.div.11-mnO4U6", id: "auth.registration-page-content.div.11" })} id="auth.registration-page-content.div.3" className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 w-full asol-auth-form-panel" dir={isRTL ? 'rtl' : 'ltr'}>
          <div {...uiAttributes({ uid: "auth.registration-page-content.div.12-1YiRl7", id: "auth.registration-page-content.div.12" })} id="auth.registration-page-content.div.4" className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl space-y-6 sm:space-y-8">
            <AuthMobileBrand id="auth.registration-page-content.auth-mobile-brand" />
            <div {...uiAttributes({ uid: "auth.registration-page-content.div.13-1IHKfK", id: "auth.registration-page-content.div.13" })} id="auth.registration-page-content.div.5" className="space-y-2 text-center lg:text-start"><h1 {...uiAttributes({ uid: "auth.registration-page-content.h1.2-7ueF3Q", id: "auth.registration-page-content.h1.2" })} id="auth.registration-page-content.h1" className="text-3xl font-bold text-on-surface">{t('auth.registration.title')}</h1></div>
            {error && <div {...uiAttributes({ uid: "auth.registration-page-content.div.14-Vo2pl6", id: "auth.registration-page-content.div.14" })} id="auth.registration-page-content.div.6" className="p-3 text-sm rounded bg-error/15 text-error text-center font-medium animate-in fade-in duration-200">{error}</div>}
            <FormProvider {...form}>
              <form {...uiAttributes({ uid: "registration-submit-AZi3Gy", id: "registration-submit", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "registration-submit" } })} onSubmit={onSubmit} className="space-y-6" noValidate>
                <PhoneVerification id="auth.registration-page-content.phone-verification" useForm={true} />
                <div {...uiAttributes({ uid: "auth.registration-page-content.div.15-HQ75oO", id: "auth.registration-page-content.div.15" })} id="auth.registration-page-content.div.7" className="space-y-4">
                  <PasswordInput id="auth.registration-page-content.password-input" name="password" />
                  {password.length > 0 && <PasswordStrength password={password} />}
                  <PasswordInput id="auth.registration-page-content.password-input.2" name="confirmPassword" />
                  <OptionalRegistrationFields />
                </div>
                <div {...uiAttributes({ uid: "auth.registration-page-content.div.16-uddJ1h", id: "auth.registration-page-content.div.16" })} id="auth.registration-page-content.div.8" className="space-y-3">
                  {!phoneVerified && <p {...uiAttributes({ uid: "auth.registration-page-content.p.3-P3NJp4", id: "auth.registration-page-content.p.3" })} id="auth.registration-page-content.p" className="text-xs text-on-surface-variant flex items-center gap-1.5"><Shield id="auth.registration-page-content.shield" className="h-3.5 w-3.5" />{t('auth.registration.phoneVerificationRequired')}</p>}
                  <button {...uiAttributes({ uid: "auth.registration-page-content.button.2-4nx5jH", id: "auth.registration-page-content.button.2" })} id="auth.registration-page-content.button" type="submit" disabled={isSubmitting || !phoneVerified} className={cn('w-full auth-cta h-12 text-sm font-semibold', !phoneVerified && 'opacity-50')}>
                    {isSubmitting ? <><Loader2 id="auth.registration-page-content.loader2" className="h-4 w-4 animate-spin me-2" />{t('auth.registration.submitting')}</> : <>{t('auth.registration.submit')}<ArrowRight id="auth.registration-page-content.arrow-right" className="h-4 w-4 ms-2" /></>}
                  </button>
                </div>
              </form>
            </FormProvider>
            <p {...uiAttributes({ uid: "auth.registration-page-content.p.4-9g4m6K", id: "auth.registration-page-content.p.4" })} id="auth.registration-page-content.p.2" className="text-center text-sm text-on-surface-variant">{t('auth.registration.hasAccount')}{''}<Link {...uiAttributes({ uid: "registration-login-3FF6n4", id: "registration-login", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "registration-login" } })} href="/login" className="font-medium text-primary">{t('auth.registration.loginLink')}</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
