'use client';

import * as React from 'react';
import { useTranslation } from '@/shared/i18n';
import { reportPreAuthFailure } from '@/features/system-logs';
import { isValidPhone } from '@asol/auth-core';
import { authService } from '../services/auth-service';
import { getPlatformName } from '@asol/native-core';
import { verificationApiService } from '@/features/verification';
import {
  VERIFICATION_CODE_LENGTH,
  type VerificationChannel,
  type VerificationPurpose,
} from '@asol/verification-core';

const RESEND_COUNTDOWN = 60;

function clientRuntime() {
  const platform = getPlatformName();
  return platform === 'android' || platform === 'ios' ? platform : 'web';
}

export function usePhoneVerification(purpose: VerificationPurpose = 'registration', uid?: string | null, email?: string | null) {
  const { t, formatApiError } = useTranslation();
  const [otpSent, setOtpSent] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [otpError, setOtpError] = React.useState('');
  const [challengeId, setChallengeId] = React.useState('');
  const [channel, setChannel] = React.useState<VerificationChannel | null>(null);
  /**
   * A delivery failure the user can act on by retrying, as opposed to a wrong code.
   * The gateway being momentarily unreachable is not the user's mistake and must
   * not read like one.
   */
  const [deliveryFailed, setDeliveryFailed] = React.useState(false);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async (phone: string) => {
    if (!isValidPhone(phone)) return;
    setIsSending(true);
    setOtpError('');

    // An existing challenge is rotated in place so lineage, rate limits and the
    // purpose/target bindings stay attached to one server-owned challenge.
    if (challengeId) {
      try {
        await verificationApiService.resend({
          challengeId,
          purpose,
          phone,
          uid,
          email,
          runtime: clientRuntime(),
        });
        setDeliveryFailed(false);
        setCountdown(RESEND_COUNTDOWN);
      } catch (error) {
        reportPreAuthFailure('resend-phone-verification-code', error);
        setDeliveryFailed(true);
        setOtpError(formatApiError(error));
      } finally {
        setIsSending(false);
      }
      return;
    }

    try {
      if (purpose === 'registration' && (await authService.checkPhone(phone)).exists) {
        reportPreAuthFailure('check-registration-phone', new Error('phoneAlreadyRegistered'), {}, 'warn');
        setOtpError(t('auth.validation.phoneAlreadyRegistered'));
        setIsSending(false);
        return;
      }
    } catch (err) {
      reportPreAuthFailure('check-registration-phone', err);
      setOtpError(formatApiError(err));
      setIsSending(false);
      return;
    }

    try {
      const response = await verificationApiService.request({
        purpose,
        phone,
        uid,
        email,
        runtime: clientRuntime(),
      });
      setChallengeId(response.challengeId);
      setChannel(response.channel);
      setDeliveryFailed(false);
      setOtpSent(true);
      setCountdown(RESEND_COUNTDOWN);
    } catch (error) {
      reportPreAuthFailure('send-phone-verification-code', error);
      setDeliveryFailed(true);
      setOtpError(formatApiError(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (inputOtp: string, phone: string, onVerified: (verificationProof: string) => void) => {
    if (inputOtp.length !== VERIFICATION_CODE_LENGTH || !challengeId) {
      setOtpError(t('auth.phone.otpLength'));
      return;
    }
    setIsVerifying(true);
    setOtpError('');
    try {
      const result = await verificationApiService.verify({
        challengeId,
        purpose,
        phone,
        uid,
        email,
        code: inputOtp,
      });
      onVerified(result.verificationProof);
    } catch (error) {
      reportPreAuthFailure('verify-phone-code', error);
      setOtpError(formatApiError(error, 'errors.api.codes.verificationCodeInvalid'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleEditPhone = () => {
    setOtpSent(false);
    setOtp('');
    setChallengeId('');
    setChannel(null);
    setDeliveryFailed(false);
    setOtpError('');
    setCountdown(0);
  };

  return {
    otpSent,
    otp,
    setOtp,
    isSending,
    isVerifying,
    countdown,
    otpError,
    channel,
    deliveryFailed,
    handleSendOtp,
    handleVerifyOtp,
    handleEditPhone,
  };
}
