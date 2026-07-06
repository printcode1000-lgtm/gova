'use client';

import { useCallback, useMemo } from 'react';

import { useAppPreferences } from '@/lib/preferences';

import { isRtlLocale } from './constants';
import type { TranslationKey } from './dictionaries';
import { translate } from './translate';
import type { Locale, TranslationParams } from './types';

export function useTranslation() {
  const { preferences, updatePreferences } = useAppPreferences();
  const locale = preferences.locale;

  const t = useCallback(
    (key: TranslationKey | string, params?: TranslationParams) =>
      translate(locale, key, params),
    [locale],
  );

  const changeLanguage = useCallback(
    (lang: Locale) => {
      updatePreferences({ locale: lang });
    },
    [updatePreferences],
  );

  return useMemo(
    () => ({
      t,
      locale,
      changeLanguage,
      isRTL: isRtlLocale(locale),
    }),
    [t, locale, changeLanguage],
  );
}
