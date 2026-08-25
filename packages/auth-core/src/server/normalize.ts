import { normalizeEgyptianMobilePhone } from '../domain/phone';

export function normalizeAuthPhone(phone: string): string {
  return normalizeEgyptianMobilePhone(phone);
}

export function normalizeAuthEmail(email: string | undefined | null): string | null {
  const normalized = (email ?? '').trim().toLowerCase();
  return normalized || null;
}

/**
 * Every spelling of a phone number a stored row may legitimately hold.
 *
 * Lookups match on the raw spelling and the canonical Egyptian mobile spelling because rows
 * written before normalization existed may keep the raw value the user typed. Invalid phone
 * numbers are rejected by the same canonical rule used by browser validation and auth writes.
 */
export function authPhoneCandidates(phone: unknown): string[] {
  const raw = typeof phone === 'string' ? phone.trim() : '';
  if (!raw) return [];
  const normalized = normalizeEgyptianMobilePhone(raw);
  return [...new Set([raw, normalized])];
}
