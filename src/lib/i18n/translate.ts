import { dictionaries } from './dictionaries';
import { DEFAULT_LOCALE } from './constants';
import type { Locale, TranslationParams } from './types';

const warnedKeys = new Set<string>();

/**
 * Replace `{{param}}` placeholders in a translation string.
 *
 * @example interpolate("Hello {{name}}", { name: "Ali" }) → "Hello Ali"
 */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{{${key}}}` : String(value);
  });
}

/**
 * Translate a key for the given locale.
 * Falls back to Arabic, then to the key itself.
 * Logs a dev warning when a key is missing.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: TranslationParams,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  let text = dict[key] ?? dictionaries[DEFAULT_LOCALE][key];

  if (text === undefined) {
    if (process.env.NODE_ENV === 'development' && !warnedKeys.has(key)) {
      warnedKeys.add(key);
      console.warn(`[i18n] Missing translation key: "${key}"`);
    }
    return key;
  }

  return interpolate(text, params);
}
