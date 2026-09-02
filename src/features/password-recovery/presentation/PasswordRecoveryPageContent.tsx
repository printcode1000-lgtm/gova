'use client';

import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthHero } from '@/features/auth/ui';
import { AuthMobileBrand } from '@/features/auth/ui';
import { useTranslation } from '@/shared/i18n';
import { usePasswordRecovery } from './hooks/use-password-recovery';
import { asciiDigitsOnly, foldPasswordDigits } from '@asol/auth-core';
import { PhoneField } from '@/shared/ui/phone-field';
import { phoneFieldLabels } from '@/shared/phone/phone-field-labels';


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
  const { t, isRTL, locale } = useTranslation();
  const recovery = usePasswordRecovery();
  const phoneLabels = phoneFieldLabels(t, locale);
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
    <div id='features-password-recovery-presentation-passwordrecoverypagecontent-div-1-fvg8pt' className="auth-page">
      <div id='features-password-recovery-presentation-passwordrecoverypagecontent-div-2-od37jd' className="min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-5.5rem)] grid lg:grid-cols-[1fr_2fr]">
        <AuthHero id='features-password-recovery-presentation-passwordrecoverypagecontent-authhero-3-zsvjsx' variant="login" />
        <div id='features-password-recovery-presentation-passwordrecoverypagecontent-div-4-ljdion' className="flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12" dir={isRTL ? 'rtl' : 'ltr'}>
          <div id='features-password-recovery-presentation-passwordrecoverypagecontent-div-5-upx0ay' className="w-full max-w-xl space-y-6">
            <AuthMobileBrand id='features-password-recovery-presentation-passwordrecoverypagecontent-authmobilebrand-6-cdwp3r' />
            <div id='features-password-recovery-presentation-passwordrecoverypagecontent-div-7-tvjclf' className="text-center lg:text-start space-y-2">
              <h1 id='features-password-recovery-presentation-passwordrecoverypagecontent-heading-8-wvbor3' className="text-3xl font-bold text-on-surface">{t('auth.passwordRecovery.title')}</h1>
              <p id='features-password-recovery-presentation-passwordrecoverypagecontent-text-9-yomslq' className="text-on-surface-variant">{t(`auth.passwordRecovery.${recovery.step}.subtitle`)}</p>
            </div>

            {errorMessage && <div id='features-password-recovery-presentation-passwordrecoverypagecontent-div-10-7rpguv' className="p-3 rounded bg-error/15 text-error text-sm text-center">{errorMessage}</div>}

            {recovery.step === 'phone' && (
              <form id="features-password-recovery-presentation-passwordrecoverypagecontent-form-11-tubdpm" onSubmit={submitPhone} className="auth-card space-y-5">
                <label id='features-password-recovery-presentation-passwordrecoverypagecontent-label-12-sl55fs' className="space-y-2 block">
                  <span id='features-password-recovery-presentation-passwordrecoverypagecontent-text-13-brg8dn' className="text-sm font-semibold flex items-center gap-2"><Smartphone id='features-password-recovery-presentation-passwordrecoverypagecontent-smartphone-14-tlrbyz' className="h-4 w-4 text-primary" />{t('auth.passwordRecovery.phone')}</span>
                  <PhoneField id='features-password-recovery-presentation-passwordrecoverypagecontent-phonefield-15-p8a5ax'
                    labels={phoneLabels}
                    value={phone}
                    inputClassName="auth-input w-full"
                    onChange={setPhone}
                  />
                </label>
                <SubmitButton id='features-password-recovery-presentation-passwordrecoverypagecontent-submitbutton-16-k0rvgj' loading={recovery.isLoading} label={t('auth.passwordRecovery.sendCode')} />
                <Link id='features-password-recovery-presentation-passwordrecoverypagecontent-link-17-axfjan' href="/login" className="block text-center text-sm text-primary">{t('auth.passwordRecovery.backToLogin')}</Link>
              </form>
            )}

            {recovery.step === 'code' && (
              <form id="features-password-recovery-presentation-passwordrecoverypagecontent-form-18-nis9ke" onSubmit={submitCode} className="auth-card space-y-5">
                <div id='features-password-recovery-presentation-passwordrecoverypagecontent-div-19-unx29t' className="rounded bg-primary/10 p-3 text-sm text-on-surface-variant flex gap-2"><Mail id='features-password-recovery-presentation-passwordrecoverypagecontent-mail-20-jbgiyy' className="h-5 w-5 text-primary shrink-0" /><span id='features-password-recovery-presentation-passwordrecoverypagecontent-text-21-diyyzt'>{recovery.maskedEmail ? t('auth.passwordRecovery.sentTo', { email: recovery.maskedEmail }) : t('auth.passwordRecovery.genericSent')}</span></div>
                <label id='features-password-recovery-presentation-passwordrecoverypagecontent-label-22-clhqxk' className="space-y-2 block">
                  <span id='features-password-recovery-presentation-passwordrecoverypagecontent-text-23-5xgniy' className="text-sm font-semibold">{t('auth.passwordRecovery.code')}</span>
                  <input id='features-password-recovery-presentation-passwordrecoverypagecontent-input-24-c7pn79' className="auth-input w-full text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(asciiDigitsOnly(e.target.value).slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
                </label>
                <SubmitButton id='features-password-recovery-presentation-passwordrecoverypagecontent-submitbutton-25-syaft5' loading={recovery.isLoading} label={t('auth.passwordRecovery.verifyCode')} />
                <button id='features-password-recovery-presentation-passwordrecoverypagecontent-button-26-cuvrwx' type="button" onClick={recovery.startOver} className="w-full text-sm text-primary">{t('auth.passwordRecovery.changePhone')}</button>
              </form>
            )}

            {recovery.step === 'password' && (
              <form id="features-password-recovery-presentation-passwordrecoverypagecontent-form-27-yqdrei" onSubmit={submitPassword} className="auth-card space-y-5">
                <PasswordField id='features-password-recovery-presentation-passwordrecoverypagecontent-passwordfield-28-44bosu' label={t('auth.passwordRecovery.newPassword')} value={password} onChange={setPassword} visible={showPassword} toggle={() => setShowPassword((value) => !value)} />
                <PasswordField id='features-password-recovery-presentation-passwordrecoverypagecontent-passwordfield-29-6isdpy' label={t('auth.passwordRecovery.confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} />
                <SubmitButton id='features-password-recovery-presentation-passwordrecoverypagecontent-submitbutton-30-lwwoao' loading={recovery.isLoading} label={t('auth.passwordRecovery.savePassword')} />
              </form>
            )}

            {recovery.step === 'contactAdmin' && (
              <div id='features-password-recovery-presentation-passwordrecoverypagecontent-div-31-qbhen7' className="auth-card text-center space-y-5">
                <Mail id='features-password-recovery-presentation-passwordrecoverypagecontent-mail-32-fmv7j3' className="h-12 w-12 text-primary mx-auto" />
                <p id='features-password-recovery-presentation-passwordrecoverypagecontent-text-33-z0htdt' className="text-on-surface-variant">{t('auth.passwordRecovery.noEmail')}</p>
                <Link id='features-password-recovery-presentation-passwordrecoverypagecontent-link-34-pp1ap9' href="/contact-us" className="auth-cta h-12 flex items-center justify-center">{t('auth.passwordRecovery.contactAdmin')}</Link>
                <button id='features-password-recovery-presentation-passwordrecoverypagecontent-button-35-tqejse' type="button" onClick={recovery.startOver} className="text-sm text-primary">{t('auth.passwordRecovery.changePhone')}</button>
              </div>
            )}

            {recovery.step === 'success' && (
              <div id='features-password-recovery-presentation-passwordrecoverypagecontent-div-36-rl1n2q' className="auth-card text-center space-y-5">
                <CheckCircle2 id='features-password-recovery-presentation-passwordrecoverypagecontent-checkcircle2-37-yddrem' className="h-16 w-16 text-success mx-auto" />
                <h2 id='features-password-recovery-presentation-passwordrecoverypagecontent-heading-38-yiqkbq' className="text-2xl font-bold">{t('auth.passwordRecovery.successTitle')}</h2>
                <p id='features-password-recovery-presentation-passwordrecoverypagecontent-text-39-bkfw4f' className="text-on-surface-variant">{t('auth.passwordRecovery.successMessage')}</p>
                <Link id='features-password-recovery-presentation-passwordrecoverypagecontent-link-40-fdnhxg' href="/login" className="auth-cta h-12 flex items-center justify-center">{t('auth.passwordRecovery.loginNow')}</Link>
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
  return <label id={id} className="space-y-2 block"><span id="features-password-recovery-presentation-passwordrecoverypagecontent-text-43-siilck" className="text-sm font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />{label}</span><div id="features-password-recovery-presentation-passwordrecoverypagecontent-div-44-o8nvvv" className="relative"><input id="features-password-recovery-presentation-passwordrecoverypagecontent-input-45-po1zdo" type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(foldPasswordDigits(e.target.value))} autoComplete="new-password" className="auth-input w-full pe-10" />{toggle && <button id="features-password-recovery-presentation-passwordrecoverypagecontent-button-46-lrhoob" type="button" onClick={toggle} className="absolute end-0 top-0 h-full px-3 text-on-surface-variant">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}</div></label>;
}
