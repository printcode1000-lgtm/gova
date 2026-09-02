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

export function RegistrationPageContent() {
  const { t, isRTL } = useTranslation();
  const { form, isSubmitting, error, password, phoneVerified, onSubmit } = useRegister();

  return (
    <div id='features-auth-presentation-registrationpagecontent-div-1-bczxxi' className="auth-page">
      <div id='features-auth-presentation-registrationpagecontent-div-2-xwdy2k' className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero id='features-auth-presentation-registrationpagecontent-authhero-3-fahyxb' variant="registration" />
        <div id='features-auth-presentation-registrationpagecontent-div-4-hmqvut' className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 w-full asol-auth-form-panel" dir={isRTL ? 'rtl' : 'ltr'}>
          <div id='features-auth-presentation-registrationpagecontent-div-5-qinvot' className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl space-y-6 sm:space-y-8">
            <AuthMobileBrand id='features-auth-presentation-registrationpagecontent-authmobilebrand-6-lfxy1o' />
            <div id='features-auth-presentation-registrationpagecontent-div-7-ig5eju' className="space-y-2 text-center lg:text-start"><h1 id='features-auth-presentation-registrationpagecontent-heading-8-jdaoww' className="text-3xl font-bold text-on-surface">{t('auth.registration.title')}</h1></div>
            {error && <div id='features-auth-presentation-registrationpagecontent-div-9-mk8aty' className="p-3 text-sm rounded bg-error/15 text-error text-center font-medium animate-in fade-in duration-200">{error}</div>}
            <FormProvider {...form}>
              <form id="features-auth-presentation-registrationpagecontent-form-10-huygr9" onSubmit={onSubmit} className="space-y-6" noValidate>
                <PhoneVerification id='features-auth-presentation-registrationpagecontent-phoneverification-11-bprbx3' useForm={true} />
                <div id='features-auth-presentation-registrationpagecontent-div-12-psjevn' className="space-y-4">
                  <PasswordInput id='features-auth-presentation-registrationpagecontent-passwordinput-13-cpjxwy' name="password" />
                  {password.length > 0 && <PasswordStrength password={password} />}
                  <PasswordInput id='features-auth-presentation-registrationpagecontent-passwordinput-14-spyd5y' name="confirmPassword" />
                  <OptionalRegistrationFields />
                </div>
                <div id='features-auth-presentation-registrationpagecontent-div-15-7a5pe5' className="space-y-3">
                  {!phoneVerified && <p id='features-auth-presentation-registrationpagecontent-text-16-4jcd1v' className="text-xs text-on-surface-variant flex items-center gap-1.5"><Shield id='features-auth-presentation-registrationpagecontent-shield-17-65jxbt' className="h-3.5 w-3.5" />{t('auth.registration.phoneVerificationRequired')}</p>}
                  <button id='features-auth-presentation-registrationpagecontent-button-18-i0iwxr' type="submit" disabled={isSubmitting || !phoneVerified} className={cn('w-full auth-cta h-12 text-sm font-semibold', !phoneVerified && 'opacity-50')}>
                    {isSubmitting ? <><Loader2 id='features-auth-presentation-registrationpagecontent-loader2-19-ohwurx' className="h-4 w-4 animate-spin me-2" />{t('auth.registration.submitting')}</> : <>{t('auth.registration.submit')}<ArrowRight id='features-auth-presentation-registrationpagecontent-arrowright-20-kh20wl' className="h-4 w-4 ms-2" /></>}
                  </button>
                </div>
              </form>
            </FormProvider>
            <p id='features-auth-presentation-registrationpagecontent-text-21-g5zzoy' className="text-center text-sm text-on-surface-variant">{t('auth.registration.hasAccount')}{''}<Link href="/login" className="font-medium text-primary">{t('auth.registration.loginLink')}</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
