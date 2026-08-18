import { MIN_PASSWORD_LENGTH } from './constants';

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
