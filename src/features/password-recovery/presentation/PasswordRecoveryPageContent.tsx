'use client';

import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthHero } from '@/features/auth/ui';
import { AuthMobileBrand } from '@/features/auth/ui';
import { useTranslation } from '@/shared/i18n';
import { usePasswordRecovery } from './hooks/use-password-recovery';
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div id="password-recovery.password-recovery-page-content.div" className="auth-page">
      <div id="password-recovery.password-recovery-page-content.div.2" className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero id="password-recovery.password-recovery-page-content.auth-hero" variant="login" />
        <div id="password-recovery.password-recovery-page-content.div.3" className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12" dir={isRTL ? 'rtl' : 'ltr'}>
          <div id="password-recovery.password-recovery-page-content.div.4" className="w-full max-w-xl space-y-6">
            <AuthMobileBrand id="password-recovery.password-recovery-page-content.auth-mobile-brand" />
            <div id="password-recovery.password-recovery-page-content.div.5" className="text-center lg:text-start space-y-2">
              <h1 id="password-recovery.password-recovery-page-content.h1" className="text-3xl font-bold text-on-surface">{t('auth.passwordRecovery.title')}</h1>
              <p id="password-recovery.password-recovery-page-content.p" className="text-on-surface-variant">{t(`auth.passwordRecovery.${recovery.step}.subtitle`)}</p>
            </div>

            {errorMessage && <div id="password-recovery.password-recovery-page-content.div.6" className="p-3 rounded bg-error/15 text-error text-sm text-center">{errorMessage}</div>}

            {recovery.step === 'phone' && (
              <form {...uiAttributes({ uid: "password-request-7rA870", id: "password-request", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "password-request" } })} onSubmit={submitPhone} className="auth-card space-y-5">
                <label id="password-recovery.password-recovery-page-content.label" className="space-y-2 block">
                  <span id="password-recovery.password-recovery-page-content.span" className="text-sm font-semibold flex items-center gap-2"><Smartphone id="password-recovery.password-recovery-page-content.smartphone" className="h-4 w-4 text-primary" />{t('auth.passwordRecovery.phone')}</span>
                  <div id="password-recovery.password-recovery-page-content.div.7" className="relative">
                    <span id="password-recovery.password-recovery-page-content.span.2" className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">+20</span>
                    <input {...uiAttributes({ uid: "password-request-phone-O5wE84", id: "password-request-phone", kind: "field", interaction: { type: "type", valueContract: "phone-number" }, simulation: { kind: "field", id: "password-request-phone" } })} className="auth-input ps-12 w-full" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="tel" autoComplete="tel" placeholder="01x xxxx xxxx" />
                  </div>
                </label>
                <SubmitButton id="password-recovery.password-recovery-page-content.submit-button" loading={recovery.isLoading} label={t('auth.passwordRecovery.sendCode')} />
                <Link id="password-recovery.password-recovery-page-content.link" href="/login" className="block text-center text-sm text-primary">{t('auth.passwordRecovery.backToLogin')}</Link>
              </form>
            )}

            {recovery.step === 'code' && (
              <form {...uiAttributes({ uid: "password-verify-CIW9vy", id: "password-verify", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "password-verify" } })} onSubmit={submitCode} className="auth-card space-y-5">
                <div id="password-recovery.password-recovery-page-content.div.8" className="rounded bg-primary/10 p-3 text-sm text-on-surface-variant flex gap-2"><Mail id="password-recovery.password-recovery-page-content.mail" className="h-5 w-5 text-primary shrink-0" /><span id="password-recovery.password-recovery-page-content.span.3">{recovery.maskedEmail ? t('auth.passwordRecovery.sentTo', { email: recovery.maskedEmail }) : t('auth.passwordRecovery.genericSent')}</span></div>
                <label id="password-recovery.password-recovery-page-content.label.2" className="space-y-2 block">
                  <span id="password-recovery.password-recovery-page-content.span.4" className="text-sm font-semibold">{t('auth.passwordRecovery.code')}</span>
                  <input id="password-recovery.password-recovery-page-content.input" className="auth-input w-full text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
                </label>
                <SubmitButton id="password-recovery.password-recovery-page-content.submit-button.2" loading={recovery.isLoading} label={t('auth.passwordRecovery.verifyCode')} />
                <button id="password-recovery.password-recovery-page-content.button" type="button" onClick={recovery.startOver} className="w-full text-sm text-primary">{t('auth.passwordRecovery.changePhone')}</button>
              </form>
            )}

            {recovery.step === 'password' && (
              <form {...uiAttributes({ uid: "password-reset-yR7C9J", id: "password-reset", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "password-reset" } })} onSubmit={submitPassword} className="auth-card space-y-5">
                <PasswordField id="password-recovery.password-recovery-page-content.password-field" label={t('auth.passwordRecovery.newPassword')} value={password} onChange={setPassword} visible={showPassword} toggle={() => setShowPassword((value) => !value)} />
                <PasswordField id="password-recovery.password-recovery-page-content.password-field.2" label={t('auth.passwordRecovery.confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} />
                <SubmitButton id="password-recovery.password-recovery-page-content.submit-button.3" loading={recovery.isLoading} label={t('auth.passwordRecovery.savePassword')} />
              </form>
            )}

            {recovery.step === 'contactAdmin' && (
              <div id="password-recovery.password-recovery-page-content.div.9" className="auth-card text-center space-y-5">
                <Mail id="password-recovery.password-recovery-page-content.mail.2" className="h-12 w-12 text-primary mx-auto" />
                <p id="password-recovery.password-recovery-page-content.p.2" className="text-on-surface-variant">{t('auth.passwordRecovery.noEmail')}</p>
                <Link id="password-recovery.password-recovery-page-content.link.2" href="/contact-us" className="auth-cta h-12 flex items-center justify-center">{t('auth.passwordRecovery.contactAdmin')}</Link>
                <button id="password-recovery.password-recovery-page-content.button.2" type="button" onClick={recovery.startOver} className="text-sm text-primary">{t('auth.passwordRecovery.changePhone')}</button>
              </div>
            )}

            {recovery.step === 'success' && (
              <div id="password-recovery.password-recovery-page-content.div.10" className="auth-card text-center space-y-5">
                <CheckCircle2 id="password-recovery.password-recovery-page-content.check-circle2" className="h-16 w-16 text-success mx-auto" />
                <h2 id="password-recovery.password-recovery-page-content.h2" className="text-2xl font-bold">{t('auth.passwordRecovery.successTitle')}</h2>
                <p id="password-recovery.password-recovery-page-content.p.3" className="text-on-surface-variant">{t('auth.passwordRecovery.successMessage')}</p>
                <Link id="password-recovery.password-recovery-page-content.link.3" href="/login" className="auth-cta h-12 flex items-center justify-center">{t('auth.passwordRecovery.loginNow')}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ id, loading, label }: { loading: boolean; label: string } & { id?: string }) {
  return <button id={id} type="submit" disabled={loading} className="auth-cta h-12 w-full disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : label}</button>;
}

function PasswordField({ id, label, value, onChange, visible, toggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; toggle?: () => void } & { id?: string }) {
  return <label id={id} className="space-y-2 block"><span className="text-sm font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />{label}</span><div className="relative"><input type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" className="auth-input w-full pe-10" />{toggle && <button type="button" onClick={toggle} className="absolute end-0 top-0 h-full px-3 text-on-surface-variant">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}</div></label>;
}
