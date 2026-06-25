'use client';

import { Construction } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

interface ComingSoonScreenProps {
  titleKey?: TranslationKey;
  title?: string;
  /** 30% tonal variant for the card */
  tone?: 'primary' | 'secondary' | 'tertiary' | 'error';
}

const TONE_RING: Record<NonNullable<ComingSoonScreenProps['tone']>, string> = {
  primary: 'gova-ring-primary',
  secondary: 'gova-ring-secondary',
  tertiary: 'gova-ring-tertiary',
  error: 'gova-ring-error',
};

const TONE_CARD: Record<NonNullable<ComingSoonScreenProps['tone']>, string> = {
  primary: 'gova-card-tonal gova-card-tonal-primary',
  secondary: 'gova-card-tonal gova-card-tonal-secondary',
  tertiary: 'gova-card-tonal gova-card-tonal-tertiary',
  error: '',
};

export default function ComingSoonScreen({ titleKey, title, tone = 'primary' }: ComingSoonScreenProps) {
  const { t, isRTL } = useTranslation();
  const displayTitle = titleKey ? t(titleKey) : (title ?? '');

  return (
    <div className="gova-empty-state" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`gova-empty-state-card ${TONE_CARD[tone]}`}>
        <div className={`gova-empty-state-icon ${tone === 'primary' ? '' : TONE_RING[tone]}`}>
          <Construction className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">{displayTitle}</h1>
        <p className="mt-2 text-on-surface-variant">{t('comingSoon.message')}</p>
        <span className="gova-accent-chip mt-4">{t('comingSoon.badge')}</span>
      </div>
    </div>
  );
}
