import { COUNT_INTL_LOCALE, MONEY_INTL_LOCALE, asFormatLocale, type FormatLocale } from './locales';

export const DEFAULT_CURRENCY = 'EGP';

/** Currency symbols written by hand where `Intl`'s currency style is not wanted. */
const PLAIN_CURRENCY_SUFFIX: Readonly<Record<FormatLocale, string>> = {
  ar: 'ج.م',
  en: 'EGP',
};

export interface MoneyFormatOptions {
  locale?: unknown;
  currency?: string;
  maximumFractionDigits?: number;
}

/**
 * Minor units (piastres) rendered as currency: `١٬٢٣٤٫٥٠ ج.م` / `EGP 1,234.50`.
 *
 * Minor units are how every amount is stored — an order total, a discount, a shipping quote —
 * so this takes them directly rather than making each caller divide and risk a float drifting.
 * A non-numeric input formats as zero, because a price cell that renders `NaN` is worse than
 * one that renders a zero next to an order that is visibly wrong.
 */
export function formatCurrencyMinor(minor: unknown, options: MoneyFormatOptions = {}): string {
  return formatCurrencyMajor(Number(minor ?? 0) / 100, options);
}

/** The same, for a value already in major units. */
export function formatCurrencyMajor(value: unknown, options: MoneyFormatOptions = {}): string {
  const locale = asFormatLocale(options.locale);
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(MONEY_INTL_LOCALE[locale], {
    style: 'currency',
    currency: options.currency ?? DEFAULT_CURRENCY,
    ...(options.maximumFractionDigits === undefined
      ? {}
      : { maximumFractionDigits: options.maximumFractionDigits }),
  }).format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Minor units with the currency written as a plain suffix: `١٢٣٤٫٥ ج.م` / `1,234.5 EGP`.
 *
 * Kept apart from `formatCurrencyMinor` because it is a different output, not a different
 * spelling of the same one: no currency-style grouping rules, no forced two decimals, and a
 * negative value is clamped to zero — seller discounts and profile summaries read as a price
 * tag rather than as an accounting figure.
 */
export function formatPlainMoneyMinor(minor: unknown, locale: unknown = 'ar'): string {
  const resolved = asFormatLocale(locale);
  const amount = Math.max(0, Number(minor ?? 0)) / 100;
  return `${amount.toLocaleString(COUNT_INTL_LOCALE[resolved])} ${PLAIN_CURRENCY_SUFFIX[resolved]}`;
}

/** A whole-unit amount with the plain suffix — the profile preview's price line. */
export function formatPlainMoneyMajor(value: unknown, locale: unknown = 'ar'): string {
  const resolved = asFormatLocale(locale);
  const amount = Number(value ?? 0);
  return `${(Number.isFinite(amount) ? amount : 0).toLocaleString(
    COUNT_INTL_LOCALE[resolved],
  )} ${PLAIN_CURRENCY_SUFFIX[resolved]}`;
}

/** Minor units for a form field: empty for zero, so a placeholder shows instead of `0`. */
export function minorCurrencyToInputValue(value: number): string {
  return value === 0 ? '' : String(value / 100);
}

/** A form field back to minor units, never negative and never fractional. */
export function majorCurrencyInputToMinor(value: string): number {
  return Math.max(0, Math.round((Number(value) || 0) * 100));
}
