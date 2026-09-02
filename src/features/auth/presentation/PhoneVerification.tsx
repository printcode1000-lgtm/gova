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
            <div id='features-auth-presentation-phoneverification-div-2-sklcso' className="space-y-2">
              <span id='features-auth-presentation-phoneverification-text-3-g4yvnh' className="text-sm font-semibold text-on-surface">{t('auth.phone.label')}</span>
              <div id='features-auth-presentation-phoneverification-div-4-wsvtrn' className="flex items-center gap-2">
                <PhoneField id='features-auth-presentation-phoneverification-phonefield-5-ul2zil'
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
                  <button id='features-auth-presentation-phoneverification-button-6-v3zqur'
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
                        <span id='features-auth-presentation-phoneverification-text-7-gmzkmz'
                          aria-hidden="true"
                          className="asol-phone-verify-wave pointer-events-none absolute inset-0 rounded-full"
                        />
                        <span id='features-auth-presentation-phoneverification-text-8-ncjhr3'
                          aria-hidden="true"
                          className="asol-phone-verify-wave asol-phone-verify-wave--delayed pointer-events-none absolute inset-0 rounded-full"
                        />
                      </>
                    )}
                    <span id='features-auth-presentation-phoneverification-text-9-rmmj8j' className="relative z-10 text-center leading-none">
                      {isSending ? '...' : otpSent ? t('auth.phone.resend') : t('auth.phone.verify')}
                    </span>
                  </button>
                )}
                {phoneVerified && (
                  <button id='features-auth-presentation-phoneverification-button-10-1d9wpd'
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
                <p id='features-auth-presentation-phoneverification-text-11-2wndnf' className="text-xs text-success flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('auth.phone.verified')}
                </p>
              )}
              {fieldState.error && <p id='features-auth-presentation-phoneverification-text-12-wnia5x' className="text-xs text-error">{fieldState.error.message}</p>}
              {otpError && !otpSent && <p id='features-auth-presentation-phoneverification-text-13-jo1pgi' className="text-xs text-error mt-1">{otpError}</p>}
            </div>
          )}
        />

        {otpSent && !phoneVerified && (
          <div id='features-auth-presentation-phoneverification-div-14-hg05tu' className="asol-auth-tonal-panel space-y-4">
            <div id='features-auth-presentation-phoneverification-div-15-dscmxt' className="space-y-1">
              <p id='features-auth-presentation-phoneverification-text-16-xebcwm' className="text-sm font-semibold text-on-surface">{t('auth.phone.enterOtp')}</p>
              <p id='features-auth-presentation-phoneverification-text-17-wkh9mv' className="text-xs text-on-surface-variant">
                {t('auth.phone.sentTo')}{' '}
                <span id='features-auth-presentation-phoneverification-text-18-vqmncc' className="font-medium text-on-surface">{formatPhoneDisplay(phone)}</span>
              </p>
            </div>

            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={() => void handleVerifyOtpWrapper()}
              disabled={isVerifying}
              hasError={!!otpError}
            />

            {otpError && <p id='features-auth-presentation-phoneverification-text-19-ekmwyp' className="text-xs text-error text-center">{otpError}</p>}

            <div id='features-auth-presentation-phoneverification-div-20-v9cuej' className="flex items-center gap-3 w-full">
              <button id='features-auth-presentation-phoneverification-button-21-da01ho'
                type="button"
                onClick={() => void handleVerifyOtpWrapper()}
                disabled={otp.length !== 4 || isVerifying}
                className="flex-1 auth-cta h-10 text-sm"
              >
                {isVerifying ? t('auth.phone.verifying') : t('auth.phone.verifyOtp')}
              </button>
              <button id='features-auth-presentation-phoneverification-button-22-a0z14b'
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
      <div id='features-auth-presentation-phoneverification-div-24-t66hmf' className="space-y-2">
        <span id='features-auth-presentation-phoneverification-text-25-rtj7kk' className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-on-surface">
          <Smartphone className="h-4 w-4 text-primary" />
          {t('auth.login.phone')}
        </span>
        <div id='features-auth-presentation-phoneverification-div-26-ui51kk' className="flex items-center gap-2">
          <PhoneField id='features-auth-presentation-phoneverification-phonefield-27-xueps7'
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
            <button id='features-auth-presentation-phoneverification-button-28-mq18yu'
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
                  <span id='features-auth-presentation-phoneverification-text-29-fbbdoc'
                    aria-hidden="true"
                    className="asol-phone-verify-wave pointer-events-none absolute inset-0 rounded-full"
                  />
                  <span id='features-auth-presentation-phoneverification-text-30-dng558'
                    aria-hidden="true"
                    className="asol-phone-verify-wave asol-phone-verify-wave--delayed pointer-events-none absolute inset-0 rounded-full"
                  />
                </>
              )}
              <span id='features-auth-presentation-phoneverification-text-31-e4fi4j' className="relative z-10 text-center leading-none">
                {isSending
                  ? '...'
                  : otpSent
                    ? t('auth.phone.resend')
                    : t('auth.phone.verify')}
              </span>
            </button>
          ) : (
            <button id='features-auth-presentation-phoneverification-button-32-olkips'
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
          <p id='features-auth-presentation-phoneverification-text-33-clp9cd' className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('auth.phone.verified')}
          </p>
        ) : null}
        {error ? <p id='features-auth-presentation-phoneverification-text-34-3f2w7c' className="text-[10px] sm:text-xs text-error">{error}</p> : null}
        {otpError && !otpSent ? <p id='features-auth-presentation-phoneverification-text-35-mdkvjy' className="text-[10px] sm:text-xs text-error mt-1">{otpError}</p> : null}
      </div>

      {otpSent && !phoneVerified ? (
        <div id='features-auth-presentation-phoneverification-div-36-38w7zx' className="asol-auth-tonal-panel space-y-3 sm:space-y-4">
          <div id='features-auth-presentation-phoneverification-div-37-ktbg2b' className="space-y-1">
            <p id='features-auth-presentation-phoneverification-text-38-lwkknn' className="text-xs sm:text-sm font-semibold text-on-surface">
              {t('auth.phone.enterOtp')}
            </p>
            <p id='features-auth-presentation-phoneverification-text-39-6waurh' className="text-[10px] sm:text-xs text-on-surface-variant">
              {t('auth.phone.sentTo')}{' '}
              <span id='features-auth-presentation-phoneverification-text-40-rcz1tl' className="font-medium text-on-surface">
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
            <p id='features-auth-presentation-phoneverification-text-41-wmd9mv' className="text-center text-[10px] sm:text-xs text-error">{otpError}</p>
          ) : null}

          <div id='features-auth-presentation-phoneverification-div-42-d4hud2' className="flex w-full items-center gap-2 sm:gap-3">
            <button id='features-auth-presentation-phoneverification-button-43-fs1i65'
              type="button"
              onClick={() => void handleVerifyOtpWrapper()}
              disabled={otp.length !== 4 || isVerifying}
              className="auth-cta h-9 sm:h-10 flex-1 text-xs sm:text-sm"
            >
              {isVerifying
                ? t('auth.phone.verifying')
                : t('auth.phone.verifyOtp')}
            </button>
            <button id='features-auth-presentation-phoneverification-button-44-tce4gr'
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
