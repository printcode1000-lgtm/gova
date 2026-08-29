'use client';

import { Shield, Smartphone, Lock } from 'lucide-react';

import AppIcon from '@/shared/brand/AppIcon';
import { useTranslation } from '@/shared/i18n';
import { uiAttributes } from "@asol/ui-registry-core";

interface AuthHeroProps {
  variant: 'login' | 'registration';
}

export function AuthHero({ id, variant }: AuthHeroProps & { id?: string }) {
  const { t } = useTranslation();

  return (
    <div {...uiAttributes({ uid: "auth.auth-hero.div-1lHX8W", id: "auth.auth-hero.div" })} id={id} className="auth-hero hidden lg:flex flex-col justify-between relative overflow-hidden">
      <div {...uiAttributes({ uid: "auth.auth-hero.div.2-s8SlUc", id: "auth.auth-hero.div.2" })} className="absolute inset-0 opacity-30 pointer-events-none">
        <div {...uiAttributes({ uid: "auth.auth-hero.div.3-8B72oD", id: "auth.auth-hero.div.3" })} className="absolute top-20 start-20 w-72 h-72 rounded-full bg-on-primary/20 blur-3xl" />
        <div {...uiAttributes({ uid: "auth.auth-hero.div.4-OunE9a", id: "auth.auth-hero.div.4" })} className="absolute bottom-20 end-20 w-96 h-96 rounded-full bg-success/30 blur-3xl" />
      </div>

      <div {...uiAttributes({ uid: "auth.auth-hero.div.5-D7SKt3", id: "auth.auth-hero.div.5" })} className="relative z-10 p-12">
        <div {...uiAttributes({ uid: "auth.auth-hero.div.6-XVDKt1", id: "auth.auth-hero.div.6" })} className="flex items-center gap-3">
          <AppIcon size="sm" />
          <span {...uiAttributes({ uid: "auth.auth-hero.span-ZTHnM1", id: "auth.auth-hero.span" })} className="text-lg font-semibold text-on-primary">{t('header.brand')}</span>
        </div>
      </div>

      <div {...uiAttributes({ uid: "auth.auth-hero.div.7-U3Yz3Q", id: "auth.auth-hero.div.7" })} className="relative z-10 px-12 pb-12">
        <blockquote {...uiAttributes({ uid: "auth.auth-hero.blockquote-yvF0JT", id: "auth.auth-hero.blockquote" })} className="space-y-4">
          {variant === 'login' ? (
            <>
              <p {...uiAttributes({ uid: "auth.auth-hero.p-mQaN3M", id: "auth.auth-hero.p" })} className="text-2xl font-bold text-on-primary/90 leading-relaxed">
                &ldquo;{t('auth.hero.login.quote')}&rdquo;
              </p>
              <footer {...uiAttributes({ uid: "auth.auth-hero.footer-gIDR0G", id: "auth.auth-hero.footer" })} className="text-sm text-on-primary/70">{t('auth.hero.login.footer')}</footer>
            </>
          ) : (
            <>
              <p {...uiAttributes({ uid: "auth.auth-hero.p.2-Rl0Xms", id: "auth.auth-hero.p.2" })} className="text-2xl font-bold text-on-primary/90 leading-relaxed">
                &ldquo;{t('auth.hero.registration.quote')}&rdquo;
              </p>
              <footer {...uiAttributes({ uid: "auth.auth-hero.footer.2-69ZPH2", id: "auth.auth-hero.footer.2" })} className="text-sm text-on-primary/70">{t('auth.hero.registration.footer')}</footer>
            </>
          )}
        </blockquote>
      </div>

      <div {...uiAttributes({ uid: "auth.auth-hero.div.8-Lbg81w", id: "auth.auth-hero.div.8" })} className="relative z-10 px-12 pb-12">
        <div {...uiAttributes({ uid: "auth.auth-hero.div.9-QS9glB", id: "auth.auth-hero.div.9" })} className="flex flex-wrap gap-6">
          <div {...uiAttributes({ uid: "auth.auth-hero.div.10-V3wDpP", id: "auth.auth-hero.div.10" })} className="flex items-center gap-2 text-on-primary/70 text-sm">
            <Shield className="h-4 w-4" />
            {t('auth.hero.bankSecurity')}
          </div>
          <div {...uiAttributes({ uid: "auth.auth-hero.div.11-7e3tKA", id: "auth.auth-hero.div.11" })} className="flex items-center gap-2 text-on-primary/70 text-sm">
            <Smartphone className="h-4 w-4" />
            {t('auth.hero.phoneVerification')}
          </div>
          <div {...uiAttributes({ uid: "auth.auth-hero.div.12-gedH8I", id: "auth.auth-hero.div.12" })} className="flex items-center gap-2 text-on-primary/70 text-sm">
            <Lock className="h-4 w-4" />
            {t('auth.hero.encryptedData')}
          </div>
        </div>
      </div>
    </div>
  );
}
