import type { Locale } from '@/shared/i18n';

export type AppPreferences = {
  locale: Locale;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  locale: 'ar',
};

/** @deprecated Use `Locale` from `@/shared/i18n` */
export type LocalePreview = Locale;
