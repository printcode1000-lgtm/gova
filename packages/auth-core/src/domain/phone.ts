import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';
import mobilePhoneExamples from 'libphonenumber-js/examples.mobile.json';
import { asciiDigitsOnly, toAsciiDigits } from './digits';

/**
 * The canonical phone value of the whole application: E.164, worldwide.
 *
 * One spelling — `+<country><national>` — is what every account row, session
 * claim, device token, and lookup carries, so the same person typed the same
 * number in Cairo, Riyadh, or Berlin resolves to one identity. The `max`
 * metadata set is deliberate: it is the only one that validates the national
 * digits themselves rather than just their count, which is what keeps a
 * mistyped number out of an account identity.
 */

export type PhoneValidationIssue =
  | 'required'
  | 'country'
  | 'length'
  | 'invalid';

/** ISO 3166-1 alpha-2 code of a country the phone metadata knows. */
export type PhoneCountryCode = CountryCode;

/** The country a bare national number is read against when none is written. */
export const DEFAULT_PHONE_COUNTRY: PhoneCountryCode = 'EG';

export interface PhoneParseOptions {
  /** Country for a number typed without a `+` prefix. Defaults to Egypt. */
  defaultCountry?: string;
}

function resolveCountry(country: string | undefined): PhoneCountryCode {
  const candidate = (country ?? '').trim().toUpperCase();
  return candidate && isSupportedCountry(candidate)
    ? (candidate as PhoneCountryCode)
    : DEFAULT_PHONE_COUNTRY;
}

/**
 * The digits and the leading `+`, with every digit shape folded to ASCII.
 *
 * Spaces, dashes, parentheses, and Arabic or Persian digits all survive a user
 * typing them; nothing else reaches the parser.
 */
export function cleanPhoneInput(phone: unknown): string {
  const folded = toAsciiDigits(typeof phone === 'string' ? phone : '');
  const digits = folded.replace(/\D/g, '');
  if (!digits) return '';
  // A `+` anywhere before the first digit is the user writing an international
  // number; `00` is the same intention dialled the old way.
  const plusIndex = folded.indexOf('+');
  const firstDigitIndex = folded.search(/\d/);
  if (plusIndex >= 0 && plusIndex < firstDigitIndex) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  return digits;
}

function parse(phone: unknown, options: PhoneParseOptions = {}) {
  const cleaned = cleanPhoneInput(phone);
  if (!cleaned) return null;
  return (
    parsePhoneNumberFromString(cleaned, resolveCountry(options.defaultCountry)) ??
    null
  );
}

/** Why this value is not a phone number, or `null` when it is one. */
export function phoneValidationIssue(
  phone: unknown,
  options: PhoneParseOptions = {},
): PhoneValidationIssue | null {
  if (typeof phone !== 'string' || phone.trim().length === 0) return 'required';
  const cleaned = cleanPhoneInput(phone);
  if (!cleaned) return 'required';
  const parsed = parse(phone, options);
  if (!parsed) {
    // A `+` with digits nobody assigns is a country problem; anything else is
    // too short or too long to be read at all.
    return cleaned.startsWith('+') ? 'country' : 'length';
  }
  if (!parsed.isValid()) return parsed.isPossible() ? 'invalid' : 'length';
  return null;
}

/** The E.164 spelling of a valid number. Throws `invalidPhone:<issue>` otherwise. */
export function normalizePhone(
  phone: unknown,
  options: PhoneParseOptions = {},
): string {
  const issue = phoneValidationIssue(phone, options);
  if (issue) throw new Error(`invalidPhone:${issue}`);
  return parse(phone, options)!.number;
}

/** The E.164 spelling, or an empty string when the value is not a phone number. */
export function tryNormalizePhone(
  phone: unknown,
  options: PhoneParseOptions = {},
): string {
  const parsed = parse(phone, options);
  return parsed?.isValid() ? parsed.number : '';
}

export function isValidPhone(
  phone: unknown,
  options: PhoneParseOptions = {},
): boolean {
  return phoneValidationIssue(phone, options) === null;
}

/** The country a number belongs to, or `null` when it cannot be read. */
export function phoneCountry(
  phone: unknown,
  options: PhoneParseOptions = {},
): PhoneCountryCode | null {
  return parse(phone, options)?.country ?? null;
}

/** The national part of a number, without its country calling code. */
export function phoneNationalNumber(
  phone: unknown,
  options: PhoneParseOptions = {},
): string {
  return parse(phone, options)?.nationalNumber ?? '';
}

/** Human spelling of a valid number (`+20 102 654 6550`); the input otherwise. */
export function formatPhoneInternational(
  phone: unknown,
  options: PhoneParseOptions = {},
): string {
  const parsed = parse(phone, options);
  return parsed?.isValid()
    ? parsed.formatInternational()
    : cleanPhoneInput(phone);
}

/**
 * The lookup key two spellings of one number share.
 *
 * A valid number keys on its E.164 digits. Anything else keys on its digits
 * with leading zeros dropped, so a national spelling stays a suffix of the
 * international one and a `LIKE` search still finds it — including rows
 * written before this application knew about country codes.
 */
export function phoneSearchKey(phone: unknown): string {
  const normalized = tryNormalizePhone(phone);
  if (normalized) return normalized.slice(1);
  return asciiDigitsOnly(phone).replace(/^0+/, '');
}

/** Whether two spellings name the same phone number. */
export function samePhone(left: unknown, right: unknown): boolean {
  const leftKey = phoneSearchKey(left);
  const rightKey = phoneSearchKey(right);
  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey) return true;
  // One side may be a legacy national spelling of the other, stored before the
  // country code was part of the value.
  return leftKey.endsWith(rightKey) || rightKey.endsWith(leftKey);
}

/** The dialling digits for a `wa.me` or `tel:` link: E.164 without the `+`. */
export function phoneDialDigits(phone: unknown): string {
  const normalized = tryNormalizePhone(phone);
  return normalized ? normalized.slice(1) : asciiDigitsOnly(phone);
}

export interface PhoneCountryOption {
  code: PhoneCountryCode;
  callingCode: string;
  flag: string;
}

const REGIONAL_INDICATOR_A = 0x1f1e6;
const LETTER_A = 'A'.charCodeAt(0);

function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...[...code].map(
      (letter) => REGIONAL_INDICATOR_A + (letter.charCodeAt(0) - LETTER_A),
    ),
  );
}

let cachedCountries: PhoneCountryOption[] | null = null;

/** Every country the phone metadata supports, with its calling code and flag. */
export function phoneCountryOptions(): PhoneCountryOption[] {
  cachedCountries ??= getCountries().map((code) => ({
    code,
    callingCode: getCountryCallingCode(code),
    flag: countryFlag(code),
  }));
  return cachedCountries;
}

export function isPhoneCountry(code: unknown): code is PhoneCountryCode {
  return typeof code === 'string' && isSupportedCountry(code.toUpperCase());
}

export function phoneCountryCallingCode(code: string): string {
  return isPhoneCountry(code) ? getCountryCallingCode(resolveCountry(code)) : '';
}

/**
 * The E.164 spelling of a number written before country codes existed here.
 *
 * Every account created then was an Egyptian mobile stored as `01…`, so the
 * migration and the compatibility lookups can name that one rule explicitly
 * instead of guessing a country for arbitrary digits.
 */
export function legacyEgyptianPhoneToE164(phone: unknown): string {
  const digits = asciiDigitsOnly(phone);
  if (digits.length === 11 && digits.startsWith('0')) return `+20${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('20')) return `+${digits}`;
  return '';
}

const exampleCache = new Map<PhoneCountryCode, string>();

/**
 * A real mobile number of the country, spelled the way its own readers write it.
 *
 * The field holds the national number without a trunk prefix, so the example is
 * trimmed to start where the national digits start: `010 01234567` in Egypt is
 * shown as `10 01234567`, and Russia's `8 (912) …` as `(912) …`. It is a
 * placeholder, so a country whose example cannot be trimmed that way falls back
 * to the bare national digits rather than showing a number nobody could type.
 */
export function phoneExampleNationalNumber(country: string): string {
  const resolved = resolveCountry(country);
  const cached = exampleCache.get(resolved);
  if (cached !== undefined) return cached;

  const example = getExampleNumber(resolved, mobilePhoneExamples);
  let placeholder = '';
  if (example) {
    const national = example.formatNational();
    const digits = example.nationalNumber;
    for (let index = 0; index < national.length; index += 1) {
      if (!/\d/.test(national[index]!)) continue;
      if (asciiDigitsOnly(national.slice(index)) !== digits) continue;
      // Keep the bracket the national digits open with, so `(201) 555-0123`
      // does not become `201) 555-0123`.
      const start = index > 0 && '(['.includes(national[index - 1]!) ? index - 1 : index;
      placeholder = national.slice(start);
      break;
    }
    placeholder ||= digits;
  }
  exampleCache.set(resolved, placeholder);
  return placeholder;
}
