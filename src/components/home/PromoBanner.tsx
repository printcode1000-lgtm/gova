'use client';

import { Building2 } from 'lucide-react';

import AppIcon from '@/components/brand/AppIcon';
import { useTranslation } from '@/lib/i18n';

export function PromoBanner() {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl p-6 text-on-primary relative overflow-hidden bg-primary">
      <div className="relative z-10 max-w-full md:max-w-2/3">
        <div className="mb-4">
          <AppIcon size="sm" />
        </div>
        <h3 className="text-2xl font-bold">{t('home.promo.title')}</h3>
        <p className="text-sm opacity-90 mt-2">{t('home.promo.description')}</p>
        <button
          type="button"
          className="mt-4 px-4 py-2 rounded-lg font-bold text-sm transition-transform active:scale-95 gova-accent-cta-tertiary"
        >
          {t('home.promo.cta')}
        </button>
      </div>

      <div className="absolute end-0 top-0 h-full w-1/3 opacity-20 flex items-center justify-center pointer-events-none text-on-primary">
        <Building2 className="w-32 h-32 -rotate-12 scale-150" />
      </div>
    </section>
  );
}
