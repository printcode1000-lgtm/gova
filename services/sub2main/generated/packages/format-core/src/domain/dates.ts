import { DATE_INTL_LOCALE, asFormatLocale, type FormatLocale } from './locales';

export type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(value: DateInput, locale: unknown, options: Intl.DateTimeFormatOptions): string {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(DATE_INTL_LOCALE[asFormatLocale(locale)], options).format(date);
}

/**
 * Every date this application shows returns `''` for an unparseable input rather than throwing or
 * printing `Invalid Date`. A timestamp column that renders empty is a missing value; one that
 * renders `Invalid Date` reads as a broken page.
 */
export function formatDateTime(value: DateInput, locale: unknown = 'ar'): string {
  return format(value, locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Date only, medium style: `١٢ أغسطس ٢٠٢٦`. */
export function formatDate(value: DateInput, locale: unknown = 'ar'): string {
  return format(value, locale, { dateStyle: 'medium' });
}

/** Clock time only: `٣:٤٥ م`. */
export function formatTime(value: DateInput, locale: unknown = 'ar'): string {
  return format(value, locale, { hour: 'numeric', minute: '2-digit' });
}

/**
 * The runtime default rendering — `Date.prototype.toLocaleString` with no options.
 *
 * Kept as its own function because the developer consoles and the super-admin tables were
 * written against it, and `dateStyle: 'medium'` is a visibly different string. Naming it stops
 * the two from being merged by someone who assumes they are the same call.
 */
export function formatDateTimeDefault(value: DateInput, locale: unknown = 'ar'): string {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleString(DATE_INTL_LOCALE[asFormatLocale(locale)]);
}

/**
 * The admin and developer surfaces render a timestamp column differently from the customer
 * pages: a missing value is an explicit `-` rather than blank, and an unparseable one is shown
 * **as stored** so an operator can see the bad row instead of an empty cell.
 *
 * Same rule, three renderings — date+time, date only, clock — because the tables that use them
 * were each hand-rolling it with a different fallback.
 */
export interface AdminDateOptions {
  locale?: unknown;
  /** Rendered when the value is absent. */
  emptyText?: string;
  /** Include seconds in the clock rendering. */
  seconds?: boolean;
}

function adminFormat(
  value: DateInput,
  options: AdminDateOptions,
  intlOptions: Intl.DateTimeFormatOptions,
): string {
  const emptyText = options.emptyText ?? '-';
  if (value === null || value === undefined || value === '') return emptyText;
  const date = toDate(value);
  if (!date) return String(value);
  return new Intl.DateTimeFormat(DATE_INTL_LOCALE[asFormatLocale(options.locale)], intlOptions).format(date);
}

/** `-` when absent, the raw value when unparseable, otherwise a medium date and short time. */
export function formatAdminDateTime(value: DateInput, options: AdminDateOptions = {}): string {
  return adminFormat(value, options, { dateStyle: 'medium', timeStyle: 'short' });
}

/** The same fallbacks, date only — the runtime default rendering used by the users table. */
export function formatAdminDate(value: DateInput, options: AdminDateOptions = {}): string {
  return adminFormat(value, options, {});
}

/** The same fallbacks, clock only. `seconds: true` for the operation timeline. */
export function formatAdminClock(value: DateInput, options: AdminDateOptions = {}): string {
  return adminFormat(value, options, {
    hour: '2-digit',
    minute: '2-digit',
    ...(options.seconds ? { second: '2-digit' } : {}),
  });
}

const RELATIVE_DAY_LABELS: Readonly<Record<FormatLocale, { today: string; yesterday: string }>> = {
  ar: { today: 'اليوم', yesterday: 'أمس' },
  en: { today: 'Today', yesterday: 'Yesterday' },
};

/**
 * A stable key for "the same calendar day, local time".
 *
 * Exported because grouping a list by day and labelling the group have to agree: a chat thread
 * that buckets by one rule and prints `اليوم` by another shows two separators for one day.
 * Returns `''` for an unparseable input so it never collides with a real day.
 */
export function calendarDayKey(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayKey(date: Date): string {
  return calendarDayKey(date);
}

/** `اليوم` / `أمس`, falling back to a medium date. Used for chat day separators. */
export function formatRelativeDay(value: DateInput, locale: unknown = 'ar'): string {
  const date = toDate(value);
  if (!date) return '';
  const resolved = asFormatLocale(locale);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return RELATIVE_DAY_LABELS[resolved].today;
  if (dayKey(date) === dayKey(yesterday)) return RELATIVE_DAY_LABELS[resolved].yesterday;
  return formatDate(date, resolved);
}
