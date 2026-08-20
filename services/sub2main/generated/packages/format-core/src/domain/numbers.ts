import { COUNT_INTL_LOCALE, asFormatLocale } from './locales';

/**
 * A counter — followers, reviews, products in a specialty. Never negative: a count below zero is
 * always a bug upstream, and rendering `-3 متابعين` turns it into a support ticket.
 */
export function formatCount(value: unknown, locale: unknown = 'ar'): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(COUNT_INTL_LOCALE[asFormatLocale(locale)]).format(
    Math.max(0, Number.isFinite(amount) ? amount : 0),
  );
}

/**
 * A byte size for the developer consoles: `812 B`, `47 KB`, `12.4 MB`.
 *
 * Kilobytes round **up** and megabytes keep one decimal. That is the rendering the release
 * console and the bundle analyser have always shown, and their numbers are compared against
 * Play Console figures by eye — a formatting change here would read as a size change there.
 */
export function formatBytes(value: unknown = 0): string {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
