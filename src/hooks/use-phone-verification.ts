'use client';

import * as React from 'react';
import { useTranslation } from '@/lib/i18n';
import { isDevelopment } from '@/core/config';
import { govaApi, GOVA_API_ROUTES } from '@/core/api';

const RESEND_COUNTDOWN = 60;

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
    if (isDevelopment) {
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
    window.open(waUrl, '_blank');
    console.log(`[WhatsApp Link] Done Attempt : ${waUrl}`);
  };

  const handleSendOtp = async (phone: string) => {
    if (!phone || phone.length < 10) return;

    setIsSending(true);
    setOtpError('');

    // Check if the phone number is already registered in both development and production
    try {
      const response = await govaApi.get<{ exists: boolean }>(
        `${GOVA_API_ROUTES.auth.checkPhone}?phone=${encodeURIComponent(phone)}`
      );
      if (response.exists) {
        setOtpError(t('auth.validation.phoneAlreadyRegistered'));
        setIsSending(false);
        return;
      }
    } catch (err) {
      console.error('Error checking phone registration:', err);
      setOtpError('An error occurred. Please try again.');
      setIsSending(false);
      return;
    }

    const newOtp = generateOtp();
    setGeneratedOtp(newOtp);

    // إرسال عبر واتساب في بيئة الإنتاج
    if (!isDevelopment) {
      await sendWhatsappVerificationCode(phone, newOtp);
    }

    // محاكاة وقت الإرسال
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSending(false);
    setOtpSent(true);
    setCountdown(RESEND_COUNTDOWN);

    // في وضع التطوير، تعيين OTP تلقائياً
    if (isDevelopment) {
      setOtp(newOtp);
      await new Promise((resolve) => setTimeout(resolve, 300));
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
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setIsVerifying(false);

    // التحقق من الرمز
    if (inputOtp === generatedOtp) {
      onVerified();
    } else {
      setOtpError(t('auth.validation.invalidPassword')); // يمكن تغيير هذه الرسالة لخطأ OTP
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
