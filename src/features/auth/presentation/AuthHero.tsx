'use client';

import { Shield, Smartphone, Lock } from 'lucide-react';

import AppIcon from '@/shared/brand/AppIcon';
import { useTranslation } from '@/shared/i18n';

interface AuthHeroProps {
  variant: 'login' | 'registration';
}

export function AuthHero({ id, variant }: AuthHeroProps & { id?: string }) {
  const { t } = useTranslation();

  return (
    <div id={id} className="auth-hero hidden lg:flex flex-col justify-between relative overflow-hidden">
      <div id="features-auth-presentation-authhero-div-2-hrlidk" className="absolute inset-0 opacity-30 pointer-events-none">
        <div id="features-auth-presentation-authhero-div-3-gqcehl" className="absolute top-20 start-20 w-72 h-72 rounded-full bg-on-primary/20 blur-3xl" />
        <div id="features-auth-presentation-authhero-div-4-q4s9wz" className="absolute bottom-20 end-20 w-96 h-96 rounded-full bg-success/30 blur-3xl" />
      </div>

      <div id="features-auth-presentation-authhero-div-5-k1zovw" className="relative z-10 p-12">
        <div id="features-auth-presentation-authhero-div-6-e72gyw" className="flex items-center gap-3">
          <AppIcon size="sm" />
          <span id="features-auth-presentation-authhero-text-7-xkv0xt" className="text-lg font-semibold text-on-primary">{t('header.brand')}</span>
        </div>
      </div>

      <div id="features-auth-presentation-authhero-div-8-gcebx2" className="relative z-10 px-12 pb-12">
        <blockquote id="features-auth-presentation-authhero-blockquote-9-p8ipus" className="space-y-4">
          {variant === 'login' ? (
            <>
              <p id="features-auth-presentation-authhero-text-10-m5lahl" className="text-2xl font-bold text-on-primary/90 leading-relaxed">
                &ldquo;{t('auth.hero.login.quote')}&rdquo;
              </p>
              <footer id="features-auth-presentation-authhero-footer-11-iuuh1i" className="text-sm text-on-primary/70">{t('auth.hero.login.footer')}</footer>
            </>
          ) : (
            <>
              <p id="features-auth-presentation-authhero-text-12-5pchid" className="text-2xl font-bold text-on-primary/90 leading-relaxed">
                &ldquo;{t('auth.hero.registration.quote')}&rdquo;
              </p>
              <footer id="features-auth-presentation-authhero-footer-13-z6dtis" className="text-sm text-on-primary/70">{t('auth.hero.registration.footer')}</footer>
            </>
          )}
        </blockquote>
      </div>

      <div id="features-auth-presentation-authhero-div-14-btjatj" className="relative z-10 px-12 pb-12">
        <div id="features-auth-presentation-authhero-div-15-mgitbe" className="flex flex-wrap gap-6">
          <div id="features-auth-presentation-authhero-div-16-gu5ncb" className="flex items-center gap-2 text-on-primary/70 text-sm">
            <Shield className="h-4 w-4" />
            {t('auth.hero.bankSecurity')}
          </div>
          <div id="features-auth-presentation-authhero-div-17-9l64dn" className="flex items-center gap-2 text-on-primary/70 text-sm">
            <Smartphone className="h-4 w-4" />
            {t('auth.hero.phoneVerification')}
          </div>
          <div id="features-auth-presentation-authhero-div-18-qofcuv" className="flex items-center gap-2 text-on-primary/70 text-sm">
            <Lock className="h-4 w-4" />
            {t('auth.hero.encryptedData')}
          </div>
        </div>
      </div>
    </div>
  );
}
