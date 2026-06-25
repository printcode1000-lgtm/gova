'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { AuthHero } from '@/components/auth/AuthHero';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { EmailInput } from '@/components/auth/EmailInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { PhoneVerification } from '@/components/auth/PhoneVerification';
import { useGuestSession } from '@/hooks/use-guest-session';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { createRegistrationSchema, type RegistrationFormData } from '@/lib/validation/auth';

export function RegistrationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL } = useTranslation();
  const { endGuestSession } = useGuestSession();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const registrationSchema = React.useMemo(() => createRegistrationSchema(t), [t]);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      phone: '',
      password: '',
      confirmPassword: '',
      email: '',
      phoneVerified: false,
    },
    mode: 'onChange',
  });

  const password = useWatch({ control: form.control, name: 'password' }) ?? '';
  const phoneVerified = useWatch({ control: form.control, name: 'phoneVerified' }) ?? false;

  const onSubmit = async (_data: RegistrationFormData) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setSubmitted(true);
    endGuestSession();
  };

  const handleContinue = () => {
    const redirect = searchParams.get('redirect');
    router.push(redirect ?? '/home');
  };

  if (submitted) {
    return (
      <div className="auth-page flex items-center justify-center px-4">
        <div className="auth-card w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-on-surface">{t('auth.registration.ready')}</h2>
            <p className="text-base text-on-surface-variant">{t('auth.registration.successMessage')}</p>
          </div>
          <button type="button" onClick={handleContinue} className="w-full auth-cta h-12">
            {t('auth.registration.continueToApp')}
            <ArrowRight className="h-4 w-4 ms-2" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero variant="registration" />

        <div
          className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 w-full gova-auth-form-panel"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl space-y-6 sm:space-y-8">
            <AuthMobileBrand />

            <div className="space-y-2 text-center lg:text-start">
              <h1 className="text-3xl font-bold text-on-surface">{t('auth.registration.title')}</h1>
              <p className="text-base text-on-surface-variant">{t('auth.registration.subtitle')}</p>
            </div>

            <FormProvider {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                <PhoneVerification />

                <div className="space-y-4">
                  <PasswordInput name="password" />
                  {password.length > 0 && <PasswordStrength password={password} />}
                  <PasswordInput name="confirmPassword" />
                  <EmailInput />
                </div>

                <div className="space-y-3">
                  {!phoneVerified && (
                    <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      {t('auth.registration.phoneVerificationRequired')}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || !phoneVerified}
                    className={cn('w-full auth-cta h-12 text-sm font-semibold', !phoneVerified && 'opacity-50')}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                        {t('auth.registration.submitting')}
                      </>
                    ) : (
                      <>
                        {t('auth.registration.submit')}
                        <ArrowRight className="h-4 w-4 ms-2" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </FormProvider>

            <p className="text-center text-sm text-on-surface-variant">
              {t('auth.registration.hasAccount')}{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                {t('auth.registration.loginLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
