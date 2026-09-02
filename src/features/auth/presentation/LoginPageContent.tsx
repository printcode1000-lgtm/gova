'use client';

import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Smartphone,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, FormProvider } from 'react-hook-form';

import { AuthHero } from '@/features/auth/presentation/AuthHero';
import { AuthMobileBrand } from '@/features/auth/presentation/AuthMobileBrand';
import { useGuestSession } from '@/features/auth/application/hooks/use-guest-session';
import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';

import { useLogin } from './hooks/use-login';
import { PhoneField } from '@/shared/ui/phone-field';
import { phoneFieldLabels } from '@/shared/phone/phone-field-labels';
import { foldPasswordDigits } from '@asol/auth-core';


export function LoginPageContent() {
  const router = useRouter();
  const { t, isRTL, locale } = useTranslation();
  const phoneLabels = phoneFieldLabels(t, locale);
  const { startGuestSession } = useGuestSession();
  const [showPassword, setShowPassword] = React.useState(false);
  const { form, isSubmitting, error, onSubmit } = useLogin();

  return (
    <div id='features-auth-presentation-loginpagecontent-div-1-hdmukc' className="auth-page">
      <div id='features-auth-presentation-loginpagecontent-div-2-icbnaf' className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero id='features-auth-presentation-loginpagecontent-authhero-3-qmilgr' variant="login" />
        <div id='features-auth-presentation-loginpagecontent-div-4-ennfcj' className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 w-full asol-auth-form-panel" dir={isRTL ? 'rtl' : 'ltr'}>
          <div id='features-auth-presentation-loginpagecontent-div-5-5ooe3g' className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl space-y-6 sm:space-y-8">
            <AuthMobileBrand id='features-auth-presentation-loginpagecontent-authmobilebrand-6-hlois9' />
            <div id='features-auth-presentation-loginpagecontent-div-7-tx7uuj' className="space-y-2 text-center lg:text-start">
              <h1 id='features-auth-presentation-loginpagecontent-heading-8-1lxxev' className="text-3xl font-bold text-on-surface">{t('auth.login.title')}</h1>
              <p id='features-auth-presentation-loginpagecontent-text-9-rz9coi' className="text-base text-on-surface-variant">{t('auth.login.subtitle')}</p>
            </div>
            {error && <div id='features-auth-presentation-loginpagecontent-div-10-sjrer2' className="p-3 text-sm rounded bg-error/15 text-error text-center font-medium animate-in fade-in duration-200">{error}</div>}
            <FormProvider {...form}>
              <form id="features-auth-presentation-loginpagecontent-form-11-xz0g05" onSubmit={onSubmit} className="space-y-6" noValidate>
                <Controller name="phone" control={form.control} render={({ field, fieldState }) => (
                  <div id='features-auth-presentation-loginpagecontent-div-12-nhiyjh' className="space-y-2">
                    <span id='features-auth-presentation-loginpagecontent-text-13-anrf58' className="text-sm font-semibold flex items-center gap-2 text-on-surface"><Smartphone id='features-auth-presentation-loginpagecontent-smartphone-14-pbukyw' className="h-4 w-4 text-primary" />{t('auth.login.phone')}</span>
                    <PhoneField id='features-auth-presentation-loginpagecontent-phonefield-15-8xwlbq'
                      labels={phoneLabels}
                      value={field.value}
                      invalid={Boolean(fieldState.error)}
                      inputClassName="auth-input w-full"
                      onChange={field.onChange}
                    />
                    {fieldState.error && <p id='features-auth-presentation-loginpagecontent-text-16-ioqayt' className="text-xs text-error">{fieldState.error.message}</p>}
                  </div>
                )} />
                <Controller name="password" control={form.control} render={({ field, fieldState }) => (
                  <div id='features-auth-presentation-loginpagecontent-div-17-dsk46q' className="space-y-2">
                    <div id='features-auth-presentation-loginpagecontent-div-18-f0pkya' className="flex items-center justify-between">
                      <span id='features-auth-presentation-loginpagecontent-text-19-l3ngag' className="text-sm font-semibold flex items-center gap-2 text-on-surface"><Lock id='features-auth-presentation-loginpagecontent-lock-20-pvtqee' className="h-4 w-4 text-primary" />{t('auth.login.password')}</span>
                      <Link href="/forgot-password" className="text-xs text-primary">{t('auth.login.forgotPassword')}</Link>
                    </div>
                    <div id='features-auth-presentation-loginpagecontent-div-21-aoqw3s' className="relative">
                      <input id="features-auth-presentation-loginpagecontent-input-22-qwnzd2" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} placeholder={t('auth.login.passwordPlaceholder')} className={cn('auth-input pe-10 w-full', fieldState.error && 'border-error')} value={field.value} onChange={(event) => field.onChange(foldPasswordDigits(event.target.value))} />
                      <button id='features-auth-presentation-loginpagecontent-button-23-st5h5w' type="button" className="absolute end-0 top-0 h-full px-3 text-on-surface-variant" onClick={() => setShowPassword((s) => !s)} tabIndex={-1} aria-label={t('auth.login.showPassword')}>{showPassword ? <EyeOff id='features-auth-presentation-loginpagecontent-eyeoff-24-iy2mik' className="h-4 w-4" /> : <Eye id='features-auth-presentation-loginpagecontent-eye-25-enbeq9' className="h-4 w-4" />}</button>
                    </div>
                    {fieldState.error && <p id='features-auth-presentation-loginpagecontent-text-26-6prkti' className="text-xs text-error">{fieldState.error.message}</p>}
                  </div>
                )} />
                <button id='features-auth-presentation-loginpagecontent-button-27-40e52j' type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full auth-cta h-12 text-sm font-semibold">
                  {isSubmitting ? <><Loader2 id='features-auth-presentation-loginpagecontent-loader2-28-ezhoz2' className="h-4 w-4 animate-spin me-2" />{t('auth.login.submitting')}</> : <><LogIn id='features-auth-presentation-loginpagecontent-login-29-ppzwyr' className="h-4 w-4 me-2" />{t('auth.login.submit')}</>}
                </button>
                <button id="features-auth-presentation-loginpagecontent-button-30-jf4rwp" type="button" className="asol-auth-secondary-btn asol-control h-12 text-sm" onClick={() => { startGuestSession(); router.push('/home'); }}><User id='features-auth-presentation-loginpagecontent-user-31-o23lp4' className="h-4 w-4 inline me-2" />{t('auth.login.continueAsGuest')}</button>
              </form>
            </FormProvider>
            <div id='features-auth-presentation-loginpagecontent-div-32-6pwq9f' className="text-center space-y-3">
              <div id='features-auth-presentation-loginpagecontent-div-33-gl1i4b' className="relative"><div id='features-auth-presentation-loginpagecontent-div-34-8qljx4' className="absolute inset-0 flex items-center"><span id='features-auth-presentation-loginpagecontent-text-35-6b4pue' className="w-full border-t border-outline-variant" /></div><div id='features-auth-presentation-loginpagecontent-div-36-pfvthc' className="relative flex justify-center"><span id='features-auth-presentation-loginpagecontent-text-37-xrq3ia' className="asol-field-surface px-2 text-xs text-on-surface-variant uppercase">{t('auth.login.newHere')}</span></div></div>
              <Link href="/registration" className="block"><button id='features-auth-presentation-loginpagecontent-button-38-rppxnk' type="button" className="asol-auth-outline-btn asol-control h-12 text-sm group">{t('auth.login.createAccount')}<ArrowRight id='features-auth-presentation-loginpagecontent-arrowright-39-cg87mr' className="h-4 w-4 inline ms-2 transition-transform" /></button></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
