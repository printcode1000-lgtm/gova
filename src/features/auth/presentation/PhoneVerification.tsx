'use client';

import { CheckCircle2, Pencil, Smartphone } from 'lucide-react';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';
import { reportPreAuthFailure } from '@/features/system-logs';
import type { RegistrationFormData } from '@asol/auth-core';

import { PhoneField } from '@/shared/ui/phone-field';
import { phoneFieldLabels } from '@/shared/phone/phone-field-labels';
import { OtpInput } from './OtpInput';
import { usePhoneVerification } from '@/features/auth/application/hooks/use-phone-verification';
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

export function PhoneVerification({ id,
  phone: propPhone,
  verified: propVerified,
  error: propError,
  onPhoneChange,
  onVerifiedChange,
  useForm = false,
}: PhoneVerificationProps & { id?: string } = {}) {
  const { t, locale } = useTranslation();
  const phoneLabels = phoneFieldLabels(t, locale);

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
      <div id={id} className="space-y-4">
        <Controller
          name="phone"
          control={formContext.control}
          render={({ field, fieldState }) => (
            <div id="auth.phone-verification.div.2" className="space-y-2">
              <span id="auth.phone-verification.span" className="text-sm font-semibold text-on-surface">{t('auth.phone.label')}</span>
              <div id="auth.phone-verification.div.3" className="flex items-center gap-2">
                <PhoneField id="auth.phone-verification.div.4"
                  className="flex-1"
                  labels={phoneLabels}
                  disabled={phoneVerified}
                  invalid={Boolean(fieldState.error)}
                  inputClassName={cn(
                    'auth-input w-full',
                    phoneVerified && 'asol-field-surface',
                  )}
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next);
                    if (phoneVerified) formSetValue?.('phoneVerified', false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !phoneVerified && !otpSent) {
                      event.preventDefault();
                      void handleSendOtpWrapper();
                    }
                  }}
                />
                {!phoneVerified && (
                  <button id="auth.phone-verification.button"
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
                        <span id="auth.phone-verification.span.3"
                          aria-hidden="true"
                          className="asol-phone-verify-wave pointer-events-none absolute inset-0 rounded-full"
                        />
                        <span id="auth.phone-verification.span.4"
                          aria-hidden="true"
                          className="asol-phone-verify-wave asol-phone-verify-wave--delayed pointer-events-none absolute inset-0 rounded-full"
                        />
                      </>
                    )}
                    <span id="auth.phone-verification.span.5" className="relative z-10 text-center leading-none">
                      {isSending ? '...' : otpSent ? t('auth.phone.resend') : t('auth.phone.verify')}
                    </span>
                  </button>
                )}
                {phoneVerified && (
                  <button id="auth.phone-verification.button.2"
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
                <p id="auth.phone-verification.p" className="text-xs text-success flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('auth.phone.verified')}
                </p>
              )}
              {fieldState.error && <p id="auth.phone-verification.p.2" className="text-xs text-error">{fieldState.error.message}</p>}
              {otpError && !otpSent && <p id="auth.phone-verification.p.3" className="text-xs text-error mt-1">{otpError}</p>}
            </div>
          )}
        />

        {otpSent && !phoneVerified && (
          <div id="auth.phone-verification.div.5" className="asol-auth-tonal-panel space-y-4">
            <div id="auth.phone-verification.div.6" className="space-y-1">
              <p id="auth.phone-verification.p.4" className="text-sm font-semibold text-on-surface">{t('auth.phone.enterOtp')}</p>
              <p id="auth.phone-verification.p.5" className="text-xs text-on-surface-variant">
                {t('auth.phone.sentTo')}{' '}
                <span id="auth.phone-verification.span.6" className="font-medium text-on-surface">{formatPhoneDisplay(phone)}</span>
              </p>
            </div>

            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={() => void handleVerifyOtpWrapper()}
              disabled={isVerifying}
              hasError={!!otpError}
            />

            {otpError && <p id="auth.phone-verification.p.6" className="text-xs text-error text-center">{otpError}</p>}

            <div id="auth.phone-verification.div.7" className="flex items-center gap-3 w-full">
              <button id="auth.phone-verification.button.3"
                type="button"
                onClick={() => void handleVerifyOtpWrapper()}
                disabled={otp.length !== 4 || isVerifying}
                className="flex-1 auth-cta h-10 text-sm"
              >
                {isVerifying ? t('auth.phone.verifying') : t('auth.phone.verifyOtp')}
              </button>
              <button id="auth.phone-verification.button.4"
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
    <div id={id} className="space-y-4">
      <div id="auth.phone-verification.div.9" className="space-y-2">
        <span id="auth.phone-verification.span.7" className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-on-surface">
          <Smartphone className="h-4 w-4 text-primary" />
          {t('auth.login.phone')}
        </span>
        <div id="auth.phone-verification.div.10" className="flex items-center gap-2">
          <PhoneField id="auth.phone-verification.div.11"
            className="min-w-0 flex-1"
            labels={phoneLabels}
            disabled={phoneVerified}
            invalid={Boolean(error)}
            inputClassName={cn(
              'auth-input w-full text-sm',
              phoneVerified && 'asol-field-surface',
            )}
            value={phone}
            onChange={handlePhoneChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !phoneVerified && !otpSent) {
                event.preventDefault();
                void handleSendOtpWrapper();
              }
            }}
          />

          {!phoneVerified ? (
            <button id="auth.phone-verification.button.5"
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
                  <span id="auth.phone-verification.span.9"
                    aria-hidden="true"
                    className="asol-phone-verify-wave pointer-events-none absolute inset-0 rounded-full"
                  />
                  <span id="auth.phone-verification.span.10"
                    aria-hidden="true"
                    className="asol-phone-verify-wave asol-phone-verify-wave--delayed pointer-events-none absolute inset-0 rounded-full"
                  />
                </>
              )}
              <span id="auth.phone-verification.span.11" className="relative z-10 text-center leading-none">
                {isSending
                  ? '...'
                  : otpSent
                    ? t('auth.phone.resend')
                    : t('auth.phone.verify')}
              </span>
            </button>
          ) : (
            <button id="auth.phone-verification.button.6"
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
          <p id="auth.phone-verification.p.7" className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('auth.phone.verified')}
          </p>
        ) : null}
        {error ? <p id="auth.phone-verification.p.8" className="text-[10px] sm:text-xs text-error">{error}</p> : null}
        {otpError && !otpSent ? <p id="auth.phone-verification.p.9" className="text-[10px] sm:text-xs text-error mt-1">{otpError}</p> : null}
      </div>

      {otpSent && !phoneVerified ? (
        <div id="auth.phone-verification.div.12" className="asol-auth-tonal-panel space-y-3 sm:space-y-4">
          <div id="auth.phone-verification.div.13" className="space-y-1">
            <p id="auth.phone-verification.p.10" className="text-xs sm:text-sm font-semibold text-on-surface">
              {t('auth.phone.enterOtp')}
            </p>
            <p id="auth.phone-verification.p.11" className="text-[10px] sm:text-xs text-on-surface-variant">
              {t('auth.phone.sentTo')}{' '}
              <span id="auth.phone-verification.span.12" className="font-medium text-on-surface">
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
            <p id="auth.phone-verification.p.12" className="text-center text-[10px] sm:text-xs text-error">{otpError}</p>
          ) : null}

          <div id="auth.phone-verification.div.14" className="flex w-full items-center gap-2 sm:gap-3">
            <button id="auth.phone-verification.button.7"
              type="button"
              onClick={() => void handleVerifyOtpWrapper()}
              disabled={otp.length !== 4 || isVerifying}
              className="auth-cta h-9 sm:h-10 flex-1 text-xs sm:text-sm"
            >
              {isVerifying
                ? t('auth.phone.verifying')
                : t('auth.phone.verifyOtp')}
            </button>
            <button id="auth.phone-verification.button.8"
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
