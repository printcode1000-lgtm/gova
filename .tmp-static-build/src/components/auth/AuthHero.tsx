'use client';

import { Shield, Smartphone, Lock } from 'lucide-react';

import AppIcon from '@/components/brand/AppIcon';
import { useTranslation } from '@/lib/i18n';

interface AuthHeroProps {
  variant: 'login' | 'registration';
}

export function AuthHero({ variant }: AuthHeroProps) {
  const { t } = useTranslation();

  return (
    <div className="auth-hero hidden lg:flex flex-col justify-between relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 start-20 w-72 h-72 rounded-full bg-on-primary/20 blur-3xl" />
        <div className="absolute bottom-20 end-20 w-96 h-96 rounded-full bg-success/30 blur-3xl" />
      </div>

      <div className="relative z-10 p-12">
        <div className="flex items-center gap-3">
          <AppIcon size="sm" />
          <span className="text-lg font-semibold text-on-primary">{t('header.brand')}</span>
        </div>
      </div>

      <div className="relative z-10 px-12 pb-12">
        <blockquote className="space-y-4">
          {variant === 'login' ? (
            <>
              <p className="text-2xl font-bold text-on-primary/90 leading-relaxed">
                &ldquo;{t('auth.hero.login.quote')}&rdquo;
              </p>
              <footer className="text-sm text-on-primary/70">{t('auth.hero.login.footer')}</footer>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-on-primary/90 leading-relaxed">
                &ldquo;{t('auth.hero.registration.quote')}&rdquo;
              </p>
              <footer className="text-sm text-on-primary/70">{t('auth.hero.registration.footer')}</footer>
            </>
          )}
        </blockquote>
      </div>

      <div className="relative z-10 px-12 pb-12">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-on-primary/70 text-sm">
            <Shield className="h-4 w-4" />
            {t('auth.hero.bankSecurity')}
          </div>
          <div className="flex items-center gap-2 text-on-primary/70 text-sm">
            <Smartphone className="h-4 w-4" />
            {t('auth.hero.phoneVerification')}
          </div>
          <div className="flex items-center gap-2 text-on-primary/70 text-sm">
            <Lock className="h-4 w-4" />
            {t('auth.hero.encryptedData')}
          </div>
        </div>
      </div>
    </div>
  );
}
