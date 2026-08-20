import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  asFormatLocale,
  calendarDayKey,
  formatAdminClock,
  formatAdminDate,
  formatAdminDateTime,
  formatBytes,
  formatCount,
  formatCurrencyMajor,
  formatCurrencyMinor,
  formatDate,
  formatDateTime,
  formatDateTimeDefault,
  formatPlainMoneyMajor,
  formatPlainMoneyMinor,
  formatRelativeDay,
  formatTime,
  majorCurrencyInputToMinor,
  minorCurrencyToInputValue,
} from '../index';

// ── Door contract ───────────────────────────────────────────────────────────
const manifest = JSON.parse(
  readFileSync(path.join(process.cwd(), 'packages/format-core/package.json'), 'utf8'),
) as { exports: Record<string, unknown> };
assert.deepEqual(
  Object.keys(manifest.exports),
  ['.'],
  'One door. A second entry here means a second load-time contract, which this package does ' +
    'not have — it reads nothing and imports nothing.',
);

// The package must stay dependency-free: it is reached from the browser bundle, from the server,
// and from every service mirror. A single node builtin here would break the first of those.
const sources = ['domain/locales.ts', 'domain/money.ts', 'domain/numbers.ts', 'domain/dates.ts', 'index.ts'];
for (const file of sources) {
  const text = readFileSync(path.join(process.cwd(), 'packages/format-core/src', file), 'utf8');
  for (const specifier of text.matchAll(/from\s+'([^']+)'/g)) {
    assert.ok(
      specifier[1]!.startsWith('.'),
      `${file} imports ${specifier[1]}. This package has no dependencies by design.`,
    );
  }
}

// ── Money ───────────────────────────────────────────────────────────────────
//
// Asserted through Intl rather than against a literal string: the exact digits depend on the
// runtime's ICU data, and pinning them would make the suite fail on a Node upgrade for a reason
// that has nothing to do with this package. What must hold is that the locale mapping and the
// minor-unit division are the ones the application had before this package existed.
assert.equal(
  formatCurrencyMinor(123450, { locale: 'en' }),
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(1234.5),
  'English money is Egyptian English with the currency style.',
);
assert.equal(
  formatCurrencyMinor(123450, { locale: 'ar' }),
  new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(1234.5),
  'Arabic money is ar-EG, which is what produces Arabic-Indic digits.',
);
assert.equal(formatCurrencyMinor(null), formatCurrencyMinor(0), 'A missing amount formats as zero.');
assert.equal(
  formatCurrencyMinor(NaN, { locale: 'en' }),
  formatCurrencyMinor(0, { locale: 'en' }),
  'A non-numeric amount never reaches the page as NaN.',
);
assert.equal(
  formatCurrencyMajor(10, { locale: 'en', currency: 'USD' }),
  new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'USD' }).format(10),
  'The currency is a parameter, not a constant.',
);
assert.match(formatPlainMoneyMinor(123450, 'ar'), /ج\.م$/, 'Arabic plain money keeps the ج.م suffix.');
assert.match(formatPlainMoneyMinor(123450, 'en'), /EGP$/, 'English plain money keeps the EGP suffix.');
assert.equal(
  formatPlainMoneyMinor(-500, 'en'),
  formatPlainMoneyMinor(0, 'en'),
  'Plain money clamps at zero — a negative price tag is always an upstream bug.',
);
assert.match(formatPlainMoneyMajor(1200, 'en'), /^1,200 EGP$/, 'Major plain money does not divide.');

assert.equal(minorCurrencyToInputValue(0), '', 'Zero shows the placeholder, not a literal 0.');
assert.equal(minorCurrencyToInputValue(12345), '123.45');
assert.equal(majorCurrencyInputToMinor('123.45'), 12345);
assert.equal(majorCurrencyInputToMinor('-9'), 0, 'A negative input clamps rather than inverting.');
assert.equal(majorCurrencyInputToMinor('abc'), 0, 'Unparseable input is zero, never NaN.');
assert.equal(majorCurrencyInputToMinor('1.006'), 101, 'Fractional piastres round rather than truncate.');
// 1.005 * 100 is 100.49999999999999 in IEEE-754, so it rounds down. Pinned rather than "fixed":
// this is the behaviour every discount form has had, and changing it would move real prices.
assert.equal(majorCurrencyInputToMinor('1.005'), 100);

// ── Counts ──────────────────────────────────────────────────────────────────
assert.equal(formatCount(1234, 'en'), '1,234');
assert.equal(formatCount(-4, 'en'), '0', 'A negative count renders as zero.');
assert.equal(formatCount(undefined, 'en'), '0');
assert.equal(formatBytes(0), '0 B');
assert.equal(formatBytes(900), '900 B');
assert.equal(formatBytes(1024), '1 KB', 'Kilobytes round up and carry no decimal.');
assert.equal(formatBytes(1025), '2 KB');
assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB', 'Megabytes keep exactly one decimal.');

// ── Dates ───────────────────────────────────────────────────────────────────
const stamp = '2026-08-20T10:30:00.000Z';
assert.equal(
  formatDateTime(stamp, 'en'),
  new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(stamp)),
);
assert.equal(
  formatDate(stamp, 'en'),
  new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium' }).format(new Date(stamp)),
);
assert.equal(
  formatTime(stamp, 'en'),
  new Intl.DateTimeFormat('en-EG', { hour: 'numeric', minute: '2-digit' }).format(new Date(stamp)),
);
assert.equal(
  formatDateTimeDefault(stamp, 'ar'),
  new Date(stamp).toLocaleString('ar-EG'),
  'The default rendering is the runtime default, not dateStyle: medium. They are different strings.',
);
for (const empty of ['', null, undefined, 'not-a-date']) {
  assert.equal(formatDateTime(empty as string), '', 'An unparseable date renders empty, never Invalid Date.');
  assert.equal(formatDateTimeDefault(empty as string), '');
  assert.equal(formatRelativeDay(empty as string), '');
}
assert.equal(formatRelativeDay(new Date(), 'ar'), 'اليوم');
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
assert.equal(formatRelativeDay(yesterday, 'en'), 'Yesterday');
const longAgo = new Date('2020-01-05T09:00:00.000Z');
assert.equal(formatRelativeDay(longAgo, 'en'), formatDate(longAgo, 'en'), 'Older days fall back to a date.');

// ── Locale narrowing ────────────────────────────────────────────────────────
assert.equal(asFormatLocale('en'), 'en');
for (const value of ['ar', 'fr', '', null, undefined, 7]) {
  assert.equal(asFormatLocale(value), 'ar', 'Anything that is not "en" is Arabic — the app default.');
}

// Admin fallbacks: absent is an explicit dash, unparseable is shown as stored.
assert.equal(formatAdminDateTime(undefined), '-');
assert.equal(formatAdminDateTime('', { emptyText: '—' }), '—');
assert.equal(formatAdminDateTime('not-a-date'), 'not-a-date', 'A bad row stays visible to the operator.');
assert.equal(formatAdminDate(null), '-');
assert.equal(formatAdminClock(''), '-');
assert.equal(
  formatAdminDateTime(stamp, { locale: 'en' }),
  new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(stamp)),
);
assert.match(formatAdminClock(stamp, { locale: 'en', seconds: true }), /\d{2}:\d{2}:\d{2}/);

assert.equal(calendarDayKey(''), '', 'An unparseable day never collides with a real one.');
assert.equal(
  calendarDayKey('2026-08-20T23:00:00.000Z'),
  calendarDayKey(new Date('2026-08-20T23:00:00.000Z')),
  'A string and a Date for the same instant bucket together.',
);
assert.notEqual(
  calendarDayKey('2026-08-20T10:00:00.000Z'),
  calendarDayKey('2026-08-21T10:00:00.000Z'),
);

console.log('@asol/format-core contract: 1 door, zero dependencies, money/count/date rules pinned.');
