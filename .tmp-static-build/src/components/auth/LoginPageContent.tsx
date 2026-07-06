'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Shield,
  Smartphone,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';

import { AuthHero } from '@/components/auth/AuthHero';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { useGuestSession } from '@/hooks/use-guest-session';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { createLoginSchema, type LoginFormData } from '@/lib/validation/auth';

import { useLogin } from '@/features/auth/hooks/use-login';
import { LOGIN_AUTOFILL_EVENT } from '@/lib/autofill/dom-input';

export function LoginPageContent() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { startGuestSession } = useGuestSession();
  const [showPassword, setShowPassword] = React.useState(false);

  const { form, isSubmitting, error, submitted, onSubmit } = useLogin();

  React.useEffect(() => {
    const syncAfterAutofill = () => {
      void form.trigger(['phone', 'password']);
    };
    window.addEventListener(LOGIN_AUTOFILL_EVENT, syncAfterAutofill);
    return () => window.removeEventListener(LOGIN_AUTOFILL_EVENT, syncAfterAutofill);
  }, [form]);

  if (submitted) {
    return (
      <div className="auth-page flex items-center justify-center px-4">
        <div className="auth-card w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
            <Shield className="h-10 w-10 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-on-surface">{t('auth.login.welcomeBack')}</h2>
            <p className="text-base text-on-surface-variant">{t('auth.login.successMessage')}</p>
          </div>
          <button type="button" onClick={() => router.push('/home')} className="w-full auth-cta h-12">
            {t('auth.login.continueToApp')}
            <ArrowRight className="h-4 w-4 ms-2" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero variant="login" />

        <div
          className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 w-full gova-auth-form-panel"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl space-y-6 sm:space-y-8">
            <AuthMobileBrand />

            <div className="space-y-2 text-center lg:text-start">
              <h1 className="text-3xl font-bold text-on-surface">{t('auth.login.title')}</h1>
              <p className="text-base text-on-surface-variant">{t('auth.login.subtitle')}</p>
            </div>

            {error && (
              <div className="p-3 text-sm rounded bg-error/15 text-error text-center font-medium animate-in fade-in duration-200">
                {error}
              </div>
            )}

            <FormProvider {...form}>
              <form onSubmit={onSubmit} className="space-y-6" noValidate>
                <Controller
                  name="phone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <span className="text-sm font-semibold flex items-center gap-2 text-on-surface">
                        <Smartphone className="h-4 w-4 text-primary" />
                        {t('auth.login.phone')}
                      </span>
                      <div className="relative">
                        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant select-none">
                          +20
                        </span>
                        <input
                          type="tel"
                          inputMode="tel"
                          maxLength={11}
                          placeholder={t('auth.login.phonePlaceholder')}
                          data-gova-autofill="login-phone"
                          className={cn('auth-input ps-12 w-full', fieldState.error && 'border-error')}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))
                          }
                        />
                      </div>
                      {fieldState.error && (
                        <p className="text-xs text-error">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />

                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-2 text-on-surface">
                          <Lock className="h-4 w-4 text-primary" />
                          {t('auth.login.password')}
                        </span>
                        <Link
                          href="/forgot-password"
                          className="text-xs text-primary hover:underline"
                        >
                          {t('auth.login.forgotPassword')}
                        </Link>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('auth.login.passwordPlaceholder')}
                          data-gova-autofill="login-password"
                          className={cn('auth-input pe-10 w-full', fieldState.error && 'border-error')}
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <button
                          type="button"
                          className="absolute end-0 top-0 h-full px-3 text-on-surface-variant"
                          onClick={() => setShowPassword((s) => !s)}
                          tabIndex={-1}
                          aria-label={t('auth.login.showPassword')}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldState.error && (
                        <p className="text-xs text-error">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />

                <button
                  type="submit"
                  disabled={isSubmitting || !form.formState.isValid}
                  className="w-full auth-cta h-12 text-sm font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                      {t('auth.login.submitting')}
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 me-2" />
                      {t('auth.login.submit')}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="gova-auth-secondary-btn gova-control h-12 text-sm"
                  onClick={() => {
                    startGuestSession();
                    router.push('/home');
                  }}
                >
                  <User className="h-4 w-4 inline me-2" />
                  {t('auth.login.continueAsGuest')}
                </button>
              </form>
            </FormProvider>

            <div className="text-center space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-outline-variant" />
                </div>
                <div className="relative flex justify-center">
                  <span className="gova-field-surface px-2 text-xs text-on-surface-variant uppercase">
                    {t('auth.login.newHere')}
                  </span>
                </div>
              </div>
              <Link href="/registration" className="block">
                <button
                  type="button"
                  className="gova-auth-outline-btn gova-control h-12 text-sm group"
                >
                  {t('auth.login.createAccount')}
                  <ArrowRight className="h-4 w-4 inline ms-2 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
