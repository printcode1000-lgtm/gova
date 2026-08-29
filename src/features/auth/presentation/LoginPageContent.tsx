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
import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";
import { foldPasswordDigits } from '@asol/auth-core';

const LOGIN_PHONE_UI: UiDescriptor = { uid: "login-phone-ChBI52", id: "login-phone", kind: "field", interaction: { type: "type", valueContract: "phone-number" }, simulation: { kind: "field", id: "login-phone" } };

export function LoginPageContent() {
  const router = useRouter();
  const { t, isRTL, locale } = useTranslation();
  const phoneLabels = phoneFieldLabels(t, locale);
  const { startGuestSession } = useGuestSession();
  const [showPassword, setShowPassword] = React.useState(false);
  const { form, isSubmitting, error, onSubmit } = useLogin();

  return (
    <div id="auth.login-page-content.div" className="auth-page">
      <div id="auth.login-page-content.div.2" className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero id="auth.login-page-content.auth-hero" variant="login" />
        <div id="auth.login-page-content.div.3" className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 w-full asol-auth-form-panel" dir={isRTL ? 'rtl' : 'ltr'}>
          <div id="auth.login-page-content.div.4" className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl space-y-6 sm:space-y-8">
            <AuthMobileBrand id="auth.login-page-content.auth-mobile-brand" />
            <div id="auth.login-page-content.div.5" className="space-y-2 text-center lg:text-start">
              <h1 id="auth.login-page-content.h1" className="text-3xl font-bold text-on-surface">{t('auth.login.title')}</h1>
              <p id="auth.login-page-content.p" className="text-base text-on-surface-variant">{t('auth.login.subtitle')}</p>
            </div>
            {error && <div id="auth.login-page-content.div.6" className="p-3 text-sm rounded bg-error/15 text-error text-center font-medium animate-in fade-in duration-200">{error}</div>}
            <FormProvider {...form}>
              <form {...uiAttributes({ uid: "login-submit-T5809e", id: "login-submit", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "login-submit" } })} onSubmit={onSubmit} className="space-y-6" noValidate>
                <Controller name="phone" control={form.control} render={({ field, fieldState }) => (
                  <div id="auth.login-page-content.div.7" className="space-y-2">
                    <span id="auth.login-page-content.span" className="text-sm font-semibold flex items-center gap-2 text-on-surface"><Smartphone id="auth.login-page-content.smartphone" className="h-4 w-4 text-primary" />{t('auth.login.phone')}</span>
                    <PhoneField id="auth.login-page-content.div.8"
                      ui={LOGIN_PHONE_UI}
                      labels={phoneLabels}
                      value={field.value}
                      invalid={Boolean(fieldState.error)}
                      inputClassName="auth-input w-full"
                      onChange={field.onChange}
                    />
                    {fieldState.error && <p id="auth.login-page-content.p.2" className="text-xs text-error">{fieldState.error.message}</p>}
                  </div>
                )} />
                <Controller name="password" control={form.control} render={({ field, fieldState }) => (
                  <div id="auth.login-page-content.div.9" className="space-y-2">
                    <div id="auth.login-page-content.div.10" className="flex items-center justify-between">
                      <span id="auth.login-page-content.span.3" className="text-sm font-semibold flex items-center gap-2 text-on-surface"><Lock id="auth.login-page-content.lock" className="h-4 w-4 text-primary" />{t('auth.login.password')}</span>
                      <Link {...uiAttributes({ uid: "login-forgot-password-ryS56k", id: "login-forgot-password", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "login-forgot-password" } })} href="/forgot-password" className="text-xs text-primary">{t('auth.login.forgotPassword')}</Link>
                    </div>
                    <div id="auth.login-page-content.div.11" className="relative">
                      <input {...uiAttributes({ uid: 'login-password-34nKhf', id: 'login-password', kind: 'field', interaction: { type: 'type', valueContract: 'password' }, simulation: { kind: 'field', id: 'login-password' } })} name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} placeholder={t('auth.login.passwordPlaceholder')} className={cn('auth-input pe-10 w-full', fieldState.error && 'border-error')} value={field.value} onChange={(event) => field.onChange(foldPasswordDigits(event.target.value))} />
                      <button id="auth.login-page-content.button" type="button" className="absolute end-0 top-0 h-full px-3 text-on-surface-variant" onClick={() => setShowPassword((s) => !s)} tabIndex={-1} aria-label={t('auth.login.showPassword')}>{showPassword ? <EyeOff id="auth.login-page-content.eye-off" className="h-4 w-4" /> : <Eye id="auth.login-page-content.eye" className="h-4 w-4" />}</button>
                    </div>
                    {fieldState.error && <p id="auth.login-page-content.p.3" className="text-xs text-error">{fieldState.error.message}</p>}
                  </div>
                )} />
                <button id="auth.login-page-content.button.2" type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full auth-cta h-12 text-sm font-semibold">
                  {isSubmitting ? <><Loader2 id="auth.login-page-content.loader2" className="h-4 w-4 animate-spin me-2" />{t('auth.login.submitting')}</> : <><LogIn id="auth.login-page-content.log-in" className="h-4 w-4 me-2" />{t('auth.login.submit')}</>}
                </button>
                <button {...uiAttributes({ uid: "login-as-guest-vWqA9D", id: "login-as-guest", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "login-as-guest" } })} type="button" className="asol-auth-secondary-btn asol-control h-12 text-sm" onClick={() => { startGuestSession(); router.push('/home'); }}><User id="auth.login-page-content.user" className="h-4 w-4 inline me-2" />{t('auth.login.continueAsGuest')}</button>
              </form>
            </FormProvider>
            <div id="auth.login-page-content.div.12" className="text-center space-y-3">
              <div id="auth.login-page-content.div.13" className="relative"><div id="auth.login-page-content.div.14" className="absolute inset-0 flex items-center"><span id="auth.login-page-content.span.4" className="w-full border-t border-outline-variant" /></div><div id="auth.login-page-content.div.15" className="relative flex justify-center"><span id="auth.login-page-content.span.5" className="asol-field-surface px-2 text-xs text-on-surface-variant uppercase">{t('auth.login.newHere')}</span></div></div>
              <Link {...uiAttributes({ uid: "login-registration-L8f73Y", id: "login-registration", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "login-registration" } })} href="/registration" className="block"><button id="auth.login-page-content.button.3" type="button" className="asol-auth-outline-btn asol-control h-12 text-sm group">{t('auth.login.createAccount')}<ArrowRight id="auth.login-page-content.arrow-right" className="h-4 w-4 inline ms-2 transition-transform" /></button></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
