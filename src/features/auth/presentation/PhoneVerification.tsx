'use client';

import { CheckCircle2, Pencil, Smartphone } from 'lucide-react';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { reportPreAuthFailure } from '@/features/system-logs/pre-auth-failure-reporter';
import type { RegistrationFormData } from '@asol/auth-core';

import { OtpInput } from './OtpInput';
import { usePhoneVerification } from '@/hooks/use-phone-verification';
import { canSendPhoneOtp, formatPhoneDisplay } from './phone-verification-model';

interface PhoneVerificationProps {
  // Props mode (for profile)
  phone?: string;
  verified?: boolean;
  error?: string;
  onPhoneChange?: (phone: string) => void;
  onVerifiedChange?: (verified: boolean) => void;
  // Form mode (for registration) - if not provided, uses useFormContext
  useForm?: boolean;
}

export function PhoneVerification({
  phone: propPhone,
  verified: propVerified,
  error: propError,
  onPhoneChange,
  onVerifiedChange,
  useForm = false,
}: PhoneVerificationProps = {}) {
  const { t } = useTranslation();

  // Form mode (registration)
  const formContext = useForm ? useFormContext<RegistrationFormData>() : null;
  const formPhone = formContext?.watch('phone') ?? '';
  const formPhoneVerified = formContext?.watch('phoneVerified') ?? false;
  const formSetValue = formContext?.setValue;
  const formTrigger = formContext?.trigger;

  // Determine which mode to use
  const isFormMode = useForm && formContext;
  const phone = isFormMode ? formPhone : propPhone ?? '';
  const phoneVerified = isFormMode ? formPhoneVerified : propVerified ?? false;
  const error = isFormMode ? undefined : propError;

  const {
    otpSent,
    otp,
    setOtp,
    isSending,
    isVerifying,
    countdown,
    otpError,
    handleSendOtp,
    handleVerifyOtp,
    handleEditPhone,
  } = usePhoneVerification();

  const markVerified = () => {
    if (isFormMode && formSetValue) {
      formSetValue('phoneVerified', true, { shouldValidate: true });
    } else if (onVerifiedChange) {
      onVerifiedChange(true);
    }
  };

  const handleSendOtpWrapper = async () => {
    try {
      if (isFormMode && formTrigger) {
        const isValid = await formTrigger('phone');
        if (!isValid) {
          reportPreAuthFailure(
            'validate-registration-phone',
            new Error('registrationPhoneInvalid'),
            {},
            'warn',
          );
          return;
        }
      }
      await handleSendOtp(phone, markVerified);
    } catch (error) {
      reportPreAuthFailure('start-phone-verification', error);
    }
  };

  const handleVerifyOtpWrapper = async () => {
    try {
      await handleVerifyOtp(otp, markVerified);
    } catch (error) {
      reportPreAuthFailure('complete-phone-verification', error);
    }
  };

  const handleEditPhoneWrapper = () => {
    handleEditPhone();
    if (isFormMode && formSetValue) {
      formSetValue('phoneVerified', false);
    } else if (onVerifiedChange) {
      onVerifiedChange(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    if (isFormMode && formSetValue) {
      formSetValue('phone', value);
      if (phoneVerified) formSetValue('phoneVerified', false);
    } else if (onPhoneChange) {
      onPhoneChange(value);
    }
  };

  const canSend = canSendPhoneOtp(phone);
  const isWaveActive = canSend && !otpSent && !isSending && !phoneVerified;

  if (isFormMode && formContext) {
    // Form mode (registration)
    return (
      <div className="space-y-4">
        <Controller
          name="phone"
          control={formContext.control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <span className="text-sm font-semibold text-on-surface">{t('auth.phone.label')}</span>
              <div className="flex items-center gap-2">
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
                    className={cn(
                      'auth-input ps-12 w-full',
                      phoneVerified && 'asol-field-surface',
                      fieldState.error && 'border-error',
                    )}
                    value={field.value}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                      field.onChange(raw);
                      if (phoneVerified) formSetValue?.('phoneVerified', false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !phoneVerified && !otpSent) {
                        e.preventDefault();
                        void handleSendOtpWrapper();
                      }
                    }}
                  />
                </div>
                {!phoneVerified && (
                  <button
                    type="button"
                    onClick={() => void handleSendOtpWrapper()}
                    disabled={isSending || !canSend}
                    aria-label={otpSent ? t('auth.phone.resend') : t('auth.phone.verify')}
                    className={cn(
                      'asol-control asol-phone-verify-btn relative shrink-0 rounded-full border border-outline asol-surface-neutral text-primary text-xs font-bold disabled:opacity-50',
                      isWaveActive && 'border-primary shadow-sm',
                    )}
                  >
                    {isWaveActive && (
                      <>
                        <span
                          aria-hidden="true"
                          className="asol-phone-verify-wave pointer-events-none absolute inset-0 rounded-full"
                        />
                        <span
                          aria-hidden="true"
                          className="asol-phone-verify-wave asol-phone-verify-wave--delayed pointer-events-none absolute inset-0 rounded-full"
                        />
                      </>
                    )}
                    <span className="relative z-10 text-center leading-none">
                      {isSending ? '...' : otpSent ? t('auth.phone.resend') : t('auth.phone.verify')}
                    </span>
                  </button>
                )}
                {phoneVerified && (
                  <button
                    type="button"
                    onClick={handleEditPhoneWrapper}
                    aria-label={t('auth.phone.edit')}
                    className="asol-control-icon asol-phone-verify-btn shrink-0 flex items-center justify-center rounded-full border border-outline asol-surface-neutral p-0"
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
              {otpError && !otpSent && <p className="text-xs text-error mt-1">{otpError}</p>}
            </div>
          )}
        />

        {otpSent && !phoneVerified && (
          <div className="asol-auth-tonal-panel space-y-4">
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
              onComplete={() => void handleVerifyOtpWrapper()}
              disabled={isVerifying}
              hasError={!!otpError}
            />

            {otpError && <p className="text-xs text-error text-center">{otpError}</p>}

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => void handleVerifyOtpWrapper()}
                disabled={otp.length !== 4 || isVerifying}
                className="flex-1 auth-cta h-10 text-sm"
              >
                {isVerifying ? t('auth.phone.verifying') : t('auth.phone.verifyOtp')}
              </button>
              <button
                type="button"
                onClick={() => void handleSendOtpWrapper()}
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

  // Props mode (profile)
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-on-surface">
          <Smartphone className="h-4 w-4 text-primary" />
          {t('auth.login.phone')}
        </span>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 select-none text-xs sm:text-sm text-on-surface-variant">
              +20
            </span>
            <input
              type="tel"
              inputMode="tel"
              maxLength={11}
              disabled={phoneVerified}
              placeholder={t('auth.login.phonePlaceholder')}
              className={cn(
                'auth-input w-full ps-12 text-sm',
                phoneVerified && 'asol-field-surface',
                error && 'border-error',
              )}
              value={phone}
              onChange={(event) => {
                handlePhoneChange(
                  event.target.value.replace(/\D/g, '').slice(0, 11),
                );
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !phoneVerified && !otpSent) {
                  event.preventDefault();
                  void handleSendOtpWrapper();
                }
              }}
            />
          </div>

          {!phoneVerified ? (
            <button
              type="button"
              onClick={() => void handleSendOtpWrapper()}
              disabled={isSending || !canSend}
              aria-label={otpSent ? t('auth.phone.resend') : t('auth.phone.verify')}
              className={cn(
                'asol-control asol-phone-verify-btn relative shrink-0 rounded-full border border-outline asol-surface-neutral text-xs font-bold text-primary disabled:opacity-50',
                isWaveActive && 'border-primary shadow-sm',
              )}
            >
              {isWaveActive && (
                <>
                  <span
                    aria-hidden="true"
                    className="asol-phone-verify-wave pointer-events-none absolute inset-0 rounded-full"
                  />
                  <span
                    aria-hidden="true"
                    className="asol-phone-verify-wave asol-phone-verify-wave--delayed pointer-events-none absolute inset-0 rounded-full"
                  />
                </>
              )}
              <span className="relative z-10 text-center leading-none">
                {isSending
                  ? '...'
                  : otpSent
                    ? t('auth.phone.resend')
                    : t('auth.phone.verify')}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEditPhoneWrapper}
              aria-label={t('auth.phone.edit')}
              className="asol-control-icon asol-phone-verify-btn flex shrink-0 items-center justify-center rounded-full border border-outline asol-surface-neutral p-0"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {phoneVerified ? (
          <p className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('auth.phone.verified')}
          </p>
        ) : null}
        {error ? <p className="text-[10px] sm:text-xs text-error">{error}</p> : null}
        {otpError && !otpSent ? <p className="text-[10px] sm:text-xs text-error mt-1">{otpError}</p> : null}
      </div>

      {otpSent && !phoneVerified ? (
        <div className="asol-auth-tonal-panel space-y-3 sm:space-y-4">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-semibold text-on-surface">
              {t('auth.phone.enterOtp')}
            </p>
            <p className="text-[10px] sm:text-xs text-on-surface-variant">
              {t('auth.phone.sentTo')}{' '}
              <span className="font-medium text-on-surface">
                {formatPhoneDisplay(phone)}
              </span>
            </p>
          </div>

          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={() => void handleVerifyOtpWrapper()}
            disabled={isVerifying}
            hasError={Boolean(otpError)}
          />
          {otpError ? (
            <p className="text-center text-[10px] sm:text-xs text-error">{otpError}</p>
          ) : null}

          <div className="flex w-full items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => void handleVerifyOtpWrapper()}
              disabled={otp.length !== 4 || isVerifying}
              className="auth-cta h-9 sm:h-10 flex-1 text-xs sm:text-sm"
            >
              {isVerifying
                ? t('auth.phone.verifying')
                : t('auth.phone.verifyOtp')}
            </button>
            <button
              type="button"
              onClick={() => void handleSendOtpWrapper()}
              disabled={countdown > 0 || isSending}
              className="shrink-0 px-2 sm:px-3 py-2 text-[10px] sm:text-sm text-primary disabled:opacity-50"
            >
              {countdown > 0
                ? t('auth.phone.resendIn', { seconds: countdown })
                : t('auth.phone.resend')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
