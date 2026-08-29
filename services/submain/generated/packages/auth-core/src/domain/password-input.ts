import { MIN_PASSWORD_LENGTH } from './constants';
import { toAsciiDigits } from './digits';

/**
 * Passwords are opaque strings. JSON numbers must not be accepted — a numeric
 * payload would drop leading zeros (for example 0258 → 258).
 */
export function readPasswordInput(value: unknown): string | null {
  if (typeof value === 'string') return value;
  return null;
}

export function assertPasswordMeetsMinimum(
  value: unknown,
  errorCode = 'passwordTooShort',
): string {
  const password = readPasswordInput(value);
  if (password === null || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(errorCode);
  }
  return password;
}

/**
 * The password as the account stores it: digits in ASCII, everything else as
 * typed.
 *
 * An Arabic or Persian keyboard writes the same number in its own shapes, and
 * `٠٢٥٨` and `0258` look like one password to the person typing them but hash
 * to two different values. Every password field folds through here on the way
 * in, so the same keystrokes always reach the same account.
 */
export function foldPasswordDigits(value: string): string {
  return toAsciiDigits(value);
}
