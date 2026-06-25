import type { Locale } from '@/lib/i18n';

export type AppTimezone = 'cairo' | 'mecca' | 'dubai';

export type AppPreferences = {
  locale: Locale;
  timezone: AppTimezone;
};

export const APP_PREFERENCES_STORAGE_KEY = 'gova-app-preferences' as const;
export const APP_PREFERENCES_STORAGE_VERSION = 1 as const;

export type StoredAppPreferences = {
  v: typeof APP_PREFERENCES_STORAGE_VERSION;
  prefs: AppPreferences;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  locale: 'ar',
  timezone: 'cairo',
};

/** @deprecated Use `Locale` from `@/lib/i18n` */
export type LocalePreview = Locale;
