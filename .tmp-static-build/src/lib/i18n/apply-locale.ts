import { isRtlLocale } from './constants';
import type { Locale } from './types';

/** Apply locale attributes to `<html>` (lang, dir, data-locale). */
export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-locale', locale);
  root.setAttribute('lang', locale === 'ar' ? 'ar' : 'en');
  root.setAttribute('dir', isRtlLocale(locale) ? 'rtl' : 'ltr');
}
