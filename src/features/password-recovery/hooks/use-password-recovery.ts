'use client';

import { useState } from 'react';
import { passwordRecoveryApiService } from '../services/password-recovery-api-service';

export type RecoveryStep = 'phone' | 'code' | 'password' | 'success' | 'contactAdmin';

export function usePasswordRecovery() {
  const [step, setStep] = useState<RecoveryStep>('phone');
  const [phone, setPhone] = useState('');
  const [maskedEmail, setMaskedEmail] = useState<string>();
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const run = async (action: () => Promise<void>) => {
    setIsLoading(true);
    setError(undefined);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'passwordRecoveryUnknownError');
    } finally {
      setIsLoading(false);
    }
  };

  const requestCode = (value: string) => run(async () => {
    const normalized = value.replace(/\D/g, '');
    const result = await passwordRecoveryApiService.requestCode({ phone: normalized });
    setPhone(normalized);
    if (result.status === 'contactAdmin') {
      setStep('contactAdmin');
      return;
    }
    setMaskedEmail(result.status === 'sent' ? result.maskedEmail : undefined);
    setStep('code');
  });

  const verifyCode = (code: string) => run(async () => {
    const result = await passwordRecoveryApiService.verifyCode({ phone, code });
    setResetToken(result.resetToken);
    setStep('password');
  });

  const resetPassword = (password: string, confirmPassword: string) => run(async () => {
    await passwordRecoveryApiService.resetPassword({
      phone,
      resetToken,
      password,
      confirmPassword,
    });
    setStep('success');
  });

  const startOver = () => {
    setStep('phone');
    setPhone('');
    setMaskedEmail(undefined);
    setResetToken('');
    setError(undefined);
  };

  return {
    step,
    phone,
    maskedEmail,
    isLoading,
    error,
    requestCode,
    verifyCode,
    resetPassword,
    startOver,
  };
}
