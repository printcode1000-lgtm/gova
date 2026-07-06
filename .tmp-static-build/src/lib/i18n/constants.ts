import type { Locale } from './types';

export const SUPPORTED_LOCALES: readonly Locale[] = ['ar', 'en'] as const;

export const DEFAULT_LOCALE: Locale = 'ar';

/** Returns true when the locale uses right-to-left layout. */
export function isRtlLocale(locale: Locale): boolean {
  return locale === 'ar';
}
