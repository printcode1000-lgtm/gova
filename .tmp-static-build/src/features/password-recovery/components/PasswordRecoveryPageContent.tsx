'use client';

import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthHero } from '@/components/auth/AuthHero';
import { AuthMobileBrand } from '@/components/auth/AuthMobileBrand';
import { useTranslation } from '@/lib/i18n';
import { usePasswordRecovery } from '../hooks/use-password-recovery';

const ERROR_KEYS: Record<string, string> = {
  passwordRecoveryInvalidPhone: 'auth.passwordRecovery.errors.invalidPhone',
  passwordRecoveryRateLimited: 'auth.passwordRecovery.errors.rateLimited',
  passwordRecoveryInvalidCode: 'auth.passwordRecovery.errors.invalidCode',
  passwordRecoveryWeakPassword: 'auth.passwordRecovery.errors.weakPassword',
  passwordRecoveryPasswordMismatch: 'auth.passwordRecovery.errors.passwordMismatch',
  passwordRecoveryInvalidToken: 'auth.passwordRecovery.errors.invalidToken',
  passwordRecoveryNotConfigured: 'auth.passwordRecovery.errors.unavailable',
};

export function PasswordRecoveryPageContent() {
  const { t, isRTL } = useTranslation();
  const recovery = usePasswordRecovery();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submitPhone = (event: FormEvent) => {
    event.preventDefault();
    void recovery.requestCode(phone);
  };
  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    void recovery.verifyCode(code);
  };
  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    void recovery.resetPassword(password, confirmPassword);
  };

  const errorMessage = recovery.error
    ? t(ERROR_KEYS[recovery.error] ?? 'auth.passwordRecovery.errors.unknown')
    : undefined;

  return (
    <div className="auth-page">
      <div className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero variant="login" />
        <div className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-xl space-y-6">
            <AuthMobileBrand />
            <div className="text-center lg:text-start space-y-2">
              <h1 className="text-3xl font-bold text-on-surface">{t('auth.passwordRecovery.title')}</h1>
              <p className="text-on-surface-variant">{t(`auth.passwordRecovery.${recovery.step}.subtitle`)}</p>
            </div>

            {errorMessage && <div className="p-3 rounded bg-error/15 text-error text-sm text-center">{errorMessage}</div>}

            {recovery.step === 'phone' && (
              <form onSubmit={submitPhone} className="auth-card space-y-5">
                <label className="space-y-2 block">
                  <span className="text-sm font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" />{t('auth.passwordRecovery.phone')}</span>
                  <div className="relative">
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">+20</span>
                    <input className="auth-input ps-12 w-full" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="tel" autoComplete="tel" placeholder="01x xxxx xxxx" />
                  </div>
                </label>
                <SubmitButton loading={recovery.isLoading} label={t('auth.passwordRecovery.sendCode')} />
                <Link href="/login" className="block text-center text-sm text-primary hover:underline">{t('auth.passwordRecovery.backToLogin')}</Link>
              </form>
            )}

            {recovery.step === 'code' && (
              <form onSubmit={submitCode} className="auth-card space-y-5">
                <div className="rounded bg-primary/10 p-3 text-sm text-on-surface-variant flex gap-2"><Mail className="h-5 w-5 text-primary shrink-0" /><span>{recovery.maskedEmail ? t('auth.passwordRecovery.sentTo', { email: recovery.maskedEmail }) : t('auth.passwordRecovery.genericSent')}</span></div>
                <label className="space-y-2 block">
                  <span className="text-sm font-semibold">{t('auth.passwordRecovery.code')}</span>
                  <input className="auth-input w-full text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
                </label>
                <SubmitButton loading={recovery.isLoading} label={t('auth.passwordRecovery.verifyCode')} />
                <button type="button" onClick={recovery.startOver} className="w-full text-sm text-primary hover:underline">{t('auth.passwordRecovery.changePhone')}</button>
              </form>
            )}

            {recovery.step === 'password' && (
              <form onSubmit={submitPassword} className="auth-card space-y-5">
                <PasswordField label={t('auth.passwordRecovery.newPassword')} value={password} onChange={setPassword} visible={showPassword} toggle={() => setShowPassword((value) => !value)} />
                <PasswordField label={t('auth.passwordRecovery.confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} />
                <SubmitButton loading={recovery.isLoading} label={t('auth.passwordRecovery.savePassword')} />
              </form>
            )}

            {recovery.step === 'contactAdmin' && (
              <div className="auth-card text-center space-y-5">
                <Mail className="h-12 w-12 text-primary mx-auto" />
                <p className="text-on-surface-variant">{t('auth.passwordRecovery.noEmail')}</p>
                <Link href="/contact-us" className="auth-cta h-12 flex items-center justify-center">{t('auth.passwordRecovery.contactAdmin')}</Link>
                <button type="button" onClick={recovery.startOver} className="text-sm text-primary hover:underline">{t('auth.passwordRecovery.changePhone')}</button>
              </div>
            )}

            {recovery.step === 'success' && (
              <div className="auth-card text-center space-y-5">
                <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
                <h2 className="text-2xl font-bold">{t('auth.passwordRecovery.successTitle')}</h2>
                <p className="text-on-surface-variant">{t('auth.passwordRecovery.successMessage')}</p>
                <Link href="/login" className="auth-cta h-12 flex items-center justify-center">{t('auth.passwordRecovery.loginNow')}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return <button type="submit" disabled={loading} className="auth-cta h-12 w-full disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : label}</button>;
}

function PasswordField({ label, value, onChange, visible, toggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; toggle?: () => void }) {
  return <label className="space-y-2 block"><span className="text-sm font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />{label}</span><div className="relative"><input type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" className="auth-input w-full pe-10" />{toggle && <button type="button" onClick={toggle} className="absolute end-0 top-0 h-full px-3 text-on-surface-variant">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}</div></label>;
}
