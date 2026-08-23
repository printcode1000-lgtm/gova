'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useAppPreferences } from '@/shared/preferences';

import { isArabicOnlyRoute } from './arabic-only-routes';
import { isRtlLocale } from './constants';
import type { TranslationKey } from './dictionaries';
import { formatUserFacingApiError } from '@/core/api/user-facing-api-error';
import { translate } from './translate';
import type { Locale, TranslationParams } from './types';

export function useTranslation() {
  const pathname = usePathname();
  const { preferences, updatePreferences } = useAppPreferences();
  const locale: Locale = isArabicOnlyRoute(pathname) ? 'ar' : preferences.locale;

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

  const formatApiError = useCallback(
    (error: unknown, fallbackKey?: string) =>
      formatUserFacingApiError(t, error, fallbackKey),
    [t],
  );

  return useMemo(
    () => ({
      t,
      locale,
      changeLanguage,
      isRTL: isRtlLocale(locale),
      formatApiError,
    }),
    [t, locale, changeLanguage, formatApiError],
  );
}
