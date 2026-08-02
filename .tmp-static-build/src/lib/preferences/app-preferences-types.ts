import type { Locale } from '@/lib/i18n';

export type AppPreferences = {
  locale: Locale;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  locale: 'ar',
};

/** @deprecated Use `Locale` from `@/lib/i18n` */
export type LocalePreview = Locale;
