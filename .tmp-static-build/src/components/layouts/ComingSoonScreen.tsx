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
  primary: 'asol-ring-primary',
  secondary: 'asol-ring-secondary',
  tertiary: 'asol-ring-tertiary',
  error: 'asol-ring-error',
};

const TONE_CARD: Record<NonNullable<ComingSoonScreenProps['tone']>, string> = {
  primary: 'asol-card-tonal asol-card-tonal-primary',
  secondary: 'asol-card-tonal asol-card-tonal-secondary',
  tertiary: 'asol-card-tonal asol-card-tonal-tertiary',
  error: '',
};

export default function ComingSoonScreen({ titleKey, title, tone = 'primary' }: ComingSoonScreenProps) {
  const { t, isRTL } = useTranslation();
  const displayTitle = titleKey ? t(titleKey) : (title ?? '');

  return (
    <div className="asol-empty-state" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`asol-empty-state-card ${TONE_CARD[tone]}`}>
        <div className={`asol-empty-state-icon ${tone === 'primary' ? '' : TONE_RING[tone]}`}>
          <Construction className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">{displayTitle}</h1>
        <p className="mt-2 text-on-surface-variant">{t('comingSoon.message')}</p>
        <span className="asol-accent-chip mt-4">{t('comingSoon.badge')}</span>
      </div>
    </div>
  );
}
