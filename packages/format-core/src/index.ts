/**
 * @asol/format-core — how this application writes numbers, money and dates.
 *
 * It exists because the same three decisions were being retaken in about twenty-five files:
 * which BCP-47 tag Arabic maps to, whether money is `Intl` currency style or a hand-written
 * `ج.م` suffix, and whether an unparseable date renders empty or as `Invalid Date`. Three
 * spellings of the currency and two of the date were already in production side by side.
 *
 * Browser-safe and dependency-free: it holds formatting rules, never data access, and both the
 * hosted application and the service deployments can reach it.
 */
export type { FormatLocale } from './domain/locales';
export {
  MONEY_INTL_LOCALE,
  DATE_INTL_LOCALE,
  COUNT_INTL_LOCALE,
  asFormatLocale,
} from './domain/locales';

export type { MoneyFormatOptions } from './domain/money';
export {
  DEFAULT_CURRENCY,
  formatCurrencyMinor,
  formatCurrencyMajor,
  formatPlainMoneyMinor,
  formatPlainMoneyMajor,
  minorCurrencyToInputValue,
  majorCurrencyInputToMinor,
} from './domain/money';

export { formatCount, formatBytes } from './domain/numbers';

export type { DateInput, AdminDateOptions } from './domain/dates';
export {
  calendarDayKey,
  formatDateTime,
  formatDate,
  formatTime,
  formatDateTimeDefault,
  formatRelativeDay,
  formatAdminDateTime,
  formatAdminDate,
  formatAdminClock,
} from './domain/dates';
