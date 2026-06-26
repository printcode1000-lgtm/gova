'use client';

import { CheckCircle2, Pencil } from 'lucide-react';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RegistrationFormData } from '@/lib/validation/auth';

import { OtpInput } from './OtpInput';

const RESEND_COUNTDOWN = 60;

export function PhoneVerification() {
  const { t } = useTranslation();
  const { control, setValue, watch, trigger } = useFormContext<RegistrationFormData>();
  const phone = watch('phone');
  const phoneVerified = watch('phoneVerified');

  const [otpSent, setOtpSent] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [otpError, setOtpError] = React.useState('');

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    const isValid = await trigger('phone');
    if (!isValid) return;

    setIsSending(true);
    setOtpError('');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSending(false);
    setOtpSent(true);
    setCountdown(RESEND_COUNTDOWN);

    if (process.env.NODE_ENV === 'development') {
      setOtp('0000');
      await new Promise((resolve) => setTimeout(resolve, 300));
      setValue('phoneVerified', true, { shouldValidate: true });
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      setOtpError(t('auth.phone.otpLength'));
      return;
    }

    setIsVerifying(true);
    setOtpError('');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsVerifying(false);
    setValue('phoneVerified', true, { shouldValidate: true });
  };

  const handleEditPhone = () => {
    setValue('phoneVerified', false);
    setOtpSent(false);
    setOtp('');
    setOtpError('');
    setCountdown(0);
  };

  const formatPhoneDisplay = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 0) return '+20';
    if (digits.length <= 2) return `+20 ${digits}`;
    if (digits.length <= 5) return `+20 ${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 8) {
      return `+20 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    }
    return `+20 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
  };

  return (
    <div className="space-y-4">
      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">{t('auth.phone.label')}</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant select-none">
                  +20
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={11}
                  disabled={phoneVerified}
                  placeholder={t('auth.phone.placeholder')}
                  data-gova-autofill="registration-phone"
                  className={cn(
                    'auth-input ps-12 w-full',
                    phoneVerified && 'gova-field-surface pe-10',
                    fieldState.error && 'border-error',
                  )}
                  value={field.value}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                    field.onChange(raw);
                    if (phoneVerified) setValue('phoneVerified', false);
                    setOtpError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !phoneVerified && !otpSent) {
                      e.preventDefault();
                      void handleSendOtp();
                    }
                  }}
                  onAnimationStart={(e) => {
                    // Detect browser autofill: browsers fire a CSS animation on autofilled fields.
                    // When detected, read the current input value and trigger OTP flow automatically.
                    if (e.animationName === 'onAutoFillStart') {
                      const target = e.currentTarget;
                      // Small delay to let the browser finish populating the value
                      setTimeout(() => {
                        const raw = target.value.replace(/\D/g, '').slice(0, 11);
                        if (raw.length >= 10) {
                          field.onChange(raw);
                          if (!phoneVerified && !otpSent) {
                            void handleSendOtp();
                          }
                        }
                      }, 100);
                    }
                  }}
                />
                {phoneVerified && (
                  <CheckCircle2 className="absolute end-3 top-1/2 -translate-y-1/2 h-5 w-5 text-success" />
                )}
              </div>
              {!phoneVerified && (
                <button
                  type="button"
                  data-gova-autofill="registration-verify-phone"
                  onClick={() => void handleSendOtp()}
                  disabled={isSending || !phone || phone.length < 10}
                  className="gova-control shrink-0 rounded-lg border border-outline gova-surface-neutral text-primary text-sm font-semibold disabled:opacity-50"
                >
                  {isSending ? '...' : otpSent ? t('auth.phone.resend') : t('auth.phone.verify')}
                </button>
              )}
              {phoneVerified && (
                <button
                  type="button"
                  onClick={handleEditPhone}
                  aria-label={t('auth.phone.edit')}
                  className="gova-control-icon shrink-0 flex items-center justify-center rounded-lg border border-outline gova-surface-neutral"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
            {phoneVerified && (
              <p className="text-xs text-success flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('auth.phone.verified')}
              </p>
            )}
            {fieldState.error && <p className="text-xs text-error">{fieldState.error.message}</p>}
          </div>
        )}
      />

      {otpSent && !phoneVerified && (
        <div className="gova-auth-tonal-panel space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-on-surface">{t('auth.phone.enterOtp')}</p>
            <p className="text-xs text-on-surface-variant">
              {t('auth.phone.sentTo')}{' '}
              <span className="font-medium text-on-surface">{formatPhoneDisplay(phone)}</span>
            </p>
          </div>

          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={() => void handleVerifyOtp()}
            disabled={isVerifying}
            hasError={!!otpError}
          />

          {otpError && <p className="text-xs text-error text-center">{otpError}</p>}

          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              data-gova-autofill="registration-verify-otp"
              onClick={() => void handleVerifyOtp()}
              disabled={otp.length !== 4 || isVerifying}
              className="flex-1 auth-cta h-10 text-sm"
            >
              {isVerifying ? t('auth.phone.verifying') : t('auth.phone.verifyOtp')}
            </button>
            <button
              type="button"
              onClick={() => void handleSendOtp()}
              disabled={countdown > 0 || isSending}
              className="shrink-0 px-3 py-2 text-sm text-primary disabled:opacity-50"
            >
              {countdown > 0 ? t('auth.phone.resendIn', { seconds: countdown }) : t('auth.phone.resend')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
