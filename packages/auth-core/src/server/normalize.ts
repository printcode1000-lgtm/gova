import { legacyEgyptianPhoneToE164, normalizePhone, phoneSearchKey } from '../domain/phone';

export function normalizeAuthPhone(phone: string): string {
  return normalizePhone(phone);
}

export function normalizeAuthEmail(email: string | undefined | null): string | null {
  const normalized = (email ?? '').trim().toLowerCase();
  return normalized || null;
}

/**
 * Every spelling of a phone number a stored row may legitimately hold.
 *
 * Lookups match on the raw spelling, the canonical E.164 spelling, and the
 * national spelling this application stored before it knew about country codes,
 * because a row written then still carries `01…`. Invalid phone numbers are
 * rejected by the same canonical rule used by browser validation and auth
 * writes.
 */
export function authPhoneCandidates(phone: unknown): string[] {
  const raw = typeof phone === 'string' ? phone.trim() : '';
  if (!raw) return [];
  const normalized = normalizePhone(raw);
  const candidates = [raw, normalized];
  // The legacy national spelling of an Egyptian number, for rows the phone
  // migration has not rewritten yet.
  const digits = phoneSearchKey(normalized);
  if (digits.startsWith('20')) candidates.push(`0${digits.slice(2)}`);
  return [...new Set(candidates.filter(Boolean))];
}

/**
 * The E.164 spelling of a value that may be a legacy national number.
 *
 * Used by the phone migration and by reads of rows it has not reached; a value
 * that is already valid keeps its own country.
 */
export function migrateLegacyAuthPhone(phone: unknown): string {
  const raw = typeof phone === 'string' ? phone.trim() : '';
  if (!raw) return '';
  return legacyEgyptianPhoneToE164(raw) || normalizePhone(raw);
}
