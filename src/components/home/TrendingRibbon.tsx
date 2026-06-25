'use client';

import { TrendingUp } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

const TRENDING_ITEM_KEYS = [
  'product.novaPhone',
  'product.timepieceWatch',
  'product.proRunnerShoes',
  'product.scannerV4',
] as const satisfies readonly TranslationKey[];

export function TrendingRibbon() {
  const { t } = useTranslation();
  const loopItems = [...TRENDING_ITEM_KEYS, ...TRENDING_ITEM_KEYS];

  return (
    <div className="gova-section-tonal-error overflow-hidden relative flex items-center py-2 mx-2 sm:mx-4 rounded-xl">
      <div className="flex items-center gap-2 px-4 z-10 border-s border-outline-variant/40 shrink-0 gova-tonal-error rounded-e-xl py-1">
        <TrendingUp className="w-5 h-5 text-error animate-pulse-subtle" aria-hidden />
        <span className="text-xs font-bold text-on-error-container">{t('home.trending.label')}</span>
      </div>

      <div className="flex-1 overflow-hidden" dir="ltr">
        <div className="home-trending-track gap-8 items-center pr-4">
          {loopItems.map((key, i) => (
            <span key={i} className="flex items-center gap-8 shrink-0">
              <span className="text-sm text-on-surface-variant">{t(key)}</span>
              <span className="text-error font-bold">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
