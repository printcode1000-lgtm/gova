'use client';

import { CheckCircle2, Pencil, Smartphone } from 'lucide-react';
import * as React from 'react';

import { OtpInput } from '@/components/auth/OtpInput';
import { isDevelopment } from '@/core/config';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const RESEND_COUNTDOWN = 60;

interface ProfilePhoneVerificationProps {
  phone: string;
  verified: boolean;
  error?: string;
  onPhoneChange: (phone: string) => void;
  onVerifiedChange: (verified: boolean) => void;
}

export function ProfilePhoneVerification({
  phone,
  verified,
  error,
  onPhoneChange,
  onVerifiedChange,
}: ProfilePhoneVerificationProps) {
  const { t } = useTranslation();
  const [otpSent, setOtpSent] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [otpError, setOtpError] = React.useState('');

  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const canSend = phone.replace(/\D/g, '').length === 11;

  const handleSendOtp = async () => {
    if (!canSend) return;
    setIsSending(true);
    setOtpError('');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSending(false);
    setOtpSent(true);
    setCountdown(RESEND_COUNTDOWN);

    if (isDevelopment) {
      setOtp('0000');
      await new Promise((resolve) => setTimeout(resolve, 300));
      onVerifiedChange(true);
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
    onVerifiedChange(true);
  };

  const handleEditPhone = () => {
    onVerifiedChange(false);
    setOtpSent(false);
    setOtp('');
    setOtpError('');
    setCountdown(0);
  };

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits ? `+20 ${digits}` : '+20';
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-on-surface">
          <Smartphone className="h-4 w-4 text-primary" />
          {t('auth.login.phone')}
        </span>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 select-none text-xs sm:text-sm text-on-surface-variant">
              +20
            </span>
            <input
              type="tel"
              inputMode="tel"
              maxLength={11}
              disabled={verified}
              placeholder={t('auth.login.phonePlaceholder')}
              className={cn(
                'auth-input w-full ps-12 text-sm',
                verified && 'gova-field-surface pe-10',
                error && 'border-error',
              )}
              value={phone}
              onChange={(event) => {
                onPhoneChange(
                  event.target.value.replace(/\D/g, '').slice(0, 11),
                );
                setOtpError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !verified && !otpSent) {
                  event.preventDefault();
                  void handleSendOtp();
                }
              }}
            />
            {verified ? (
              <CheckCircle2 className="absolute end-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-success" />
            ) : null}
          </div>

          {!verified ? (
            <button
              type="button"
              onClick={() => void handleSendOtp()}
              disabled={isSending || !canSend}
              className="gova-control shrink-0 rounded-lg border border-outline gova-surface-neutral text-xs sm:text-sm font-semibold text-primary disabled:opacity-50 px-3 sm:px-4"
            >
              {isSending
                ? '...'
                : otpSent
                  ? t('auth.phone.resend')
                  : t('auth.phone.verify')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEditPhone}
              aria-label={t('auth.phone.edit')}
              className="gova-control-icon flex shrink-0 items-center justify-center rounded-lg border border-outline gova-surface-neutral h-9 w-9 sm:h-10 sm:w-10"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {verified ? (
          <p className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs text-success">
            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {t('auth.phone.verified')}
          </p>
        ) : null}
        {error ? <p className="text-[10px] sm:text-xs text-error">{error}</p> : null}
      </div>

      {otpSent && !verified ? (
        <div className="gova-auth-tonal-panel space-y-3 sm:space-y-4">
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
            onComplete={() => void handleVerifyOtp()}
            disabled={isVerifying}
            hasError={Boolean(otpError)}
          />
          {otpError ? (
            <p className="text-center text-[10px] sm:text-xs text-error">{otpError}</p>
          ) : null}

          <div className="flex w-full items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => void handleVerifyOtp()}
              disabled={otp.length !== 4 || isVerifying}
              className="auth-cta h-9 sm:h-10 flex-1 text-xs sm:text-sm"
            >
              {isVerifying
                ? t('auth.phone.verifying')
                : t('auth.phone.verifyOtp')}
            </button>
            <button
              type="button"
              onClick={() => void handleSendOtp()}
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
