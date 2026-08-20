/** The two languages this application ships. */
export type FormatLocale = 'ar' | 'en';

/**
 * BCP-47 tags per surface, because the answer is not the same for all of them.
 *
 * Money and dates use Egyptian English (`en-EG`) so the currency symbol, the date order and the
 * separators match what an Egyptian reader expects in either language. Counts use `en-US`,
 * which is what the follower and review counters were written against — `en-EG` groups
 * identically today, but pinning the tag keeps the two decisions independent instead of
 * accidentally coupled.
 *
 * Arabic is `ar-EG` everywhere, which is what produces Arabic-Indic digits.
 */
export const MONEY_INTL_LOCALE: Readonly<Record<FormatLocale, string>> = {
  ar: 'ar-EG',
  en: 'en-EG',
};

export const DATE_INTL_LOCALE: Readonly<Record<FormatLocale, string>> = {
  ar: 'ar-EG',
  en: 'en-EG',
};

export const COUNT_INTL_LOCALE: Readonly<Record<FormatLocale, string>> = {
  ar: 'ar-EG',
  en: 'en-US',
};

/** Anything the application hands over — a stored string, a union, `undefined` — narrowed once. */
export function asFormatLocale(value: unknown): FormatLocale {
  return value === 'en' ? 'en' : 'ar';
}
