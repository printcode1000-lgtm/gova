import { isRtlLocale } from './constants';
import type { Locale } from './types';

/**
 * Fired on `window` after the document locale changes.
 *
 * Lets modules that live outside the preferences React tree — the push
 * controllers, for example — react to a language switch.
 */
export const LOCALE_CHANGED_EVENT = 'asol:locale:changed';

/** Apply locale attributes to `<html>` (lang, dir, data-locale). */
export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const previous = root.getAttribute('data-locale');
  root.setAttribute('data-locale', locale);
  root.setAttribute('lang', locale === 'ar' ? 'ar' : 'en');
  root.setAttribute('dir', isRtlLocale(locale) ? 'rtl' : 'ltr');

  if (previous !== locale && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<{ locale: Locale }>(LOCALE_CHANGED_EVENT, {
        detail: { locale },
      }),
    );
  }
}
