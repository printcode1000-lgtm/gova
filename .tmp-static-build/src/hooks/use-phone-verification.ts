'use client';

import * as React from 'react';
import { useTranslation } from '@/lib/i18n';
import { publicEnv } from '@/core/config';
import { asolApi, ASOL_API_ROUTES } from '@/core/api';
import { reportPreAuthFailure } from '@/features/system-logs/pre-auth-failure-reporter';
import { shouldBypassPhoneVerification } from '@/features/auth/utils/phone-verification-policy';

const RESEND_COUNTDOWN = 60;
const bypassPhoneVerification = shouldBypassPhoneVerification(publicEnv);

export function usePhoneVerification() {
  const { t } = useTranslation();
  const [otpSent, setOtpSent] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [otpError, setOtpError] = React.useState('');
  const [generatedOtp, setGeneratedOtp] = React.useState('');

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const generateOtp = (): string => {
    if (bypassPhoneVerification) {
      return '0000';
    }
    const digits = Array.from({ length: 4 }, () => 
      Math.floor(Math.random() * 10)
    ).join('');
    return digits;
  };

  const sendWhatsappVerificationCode = async (phone: string, code: string) => {
    const textMsg = t('auth.wa_msg_template', { code });
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`;

    // فتح التطبيق الخاص بالواتساب في نافذة/تبويب جديد
    const openedWindow = window.open(waUrl, '_blank');
    if (!openedWindow) {
      reportPreAuthFailure('open-whatsapp-verification', new Error('popupBlocked'));
    }
    console.log(`[WhatsApp Link] Done Attempt : ${waUrl}`);
  };

  const handleSendOtp = async (phone: string, onDevelopmentVerified?: () => void) => {
    if (!phone || phone.length < 10) return;

    setIsSending(true);
    setOtpError('');

    // Development bypass must happen before network and external-app work.
    // Registration still enforces unique phone ownership on the server.
    if (bypassPhoneVerification) {
      setGeneratedOtp('0000');
      setOtp('');
      setOtpSent(false);
      setCountdown(0);
      onDevelopmentVerified?.();
      setIsSending(false);
      return;
    }

    // In production, reject an already-owned phone before sending the code.
    try {
      const response = await asolApi.get<{ exists: boolean }>(
        `${ASOL_API_ROUTES.auth.checkPhone}?phone=${encodeURIComponent(phone)}`
      );
      if (response.exists) {
        reportPreAuthFailure(
          'check-registration-phone',
          new Error('phoneAlreadyRegistered'),
          {},
          'warn',
        );
        setOtpError(t('auth.validation.phoneAlreadyRegistered'));
        setIsSending(false);
        return;
      }
    } catch (err) {
      reportPreAuthFailure('check-registration-phone', err);
      setOtpError('An error occurred. Please try again.');
      setIsSending(false);
      return;
    }

    const newOtp = generateOtp();
    setGeneratedOtp(newOtp);

    // إرسال عبر واتساب في بيئة الإنتاج
    try {
      await sendWhatsappVerificationCode(phone, newOtp);

    // محاكاة وقت الإرسال
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setOtpSent(true);
    setCountdown(RESEND_COUNTDOWN);

    // في وضع التطوير، تعيين OTP تلقائياً
    } catch (error) {
      reportPreAuthFailure('send-phone-verification-code', error);
      setOtpError('An error occurred. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (inputOtp: string, onVerified: () => void) => {
    if (inputOtp.length !== 4) {
      setOtpError(t('auth.phone.otpLength'));
      return;
    }

    setIsVerifying(true);
    setOtpError('');

    // محاكاة وقت التحقق
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

    // التحقق من الرمز
      if (inputOtp === generatedOtp) {
        onVerified();
      } else {
        reportPreAuthFailure('verify-phone-code', new Error('invalidOtp'), {}, 'warn');
        setOtpError(t('auth.validation.invalidPassword')); // يمكن تغيير هذه الرسالة لخطأ OTP
      }
    } catch (error) {
      reportPreAuthFailure('verify-phone-code', error);
      setOtpError('An error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleEditPhone = () => {
    setOtpSent(false);
    setOtp('');
    setGeneratedOtp('');
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
    generatedOtp,
    handleSendOtp,
    handleVerifyOtp,
    handleEditPhone,
  };
}
