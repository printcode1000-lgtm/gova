export function normalizeAuthPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('20') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function normalizeAuthEmail(email: string | undefined | null): string | null {
  const normalized = (email ?? '').trim().toLowerCase();
  return normalized || null;
}

/**
 * Every spelling of a phone number a stored row may legitimately hold.
 *
 * Lookups match on any of them because rows written before normalization existed keep the raw
 * value the user typed. Deduplicated and empty-free, so a caller can build an `IN (...)` from it
 * without re-checking either.
 */
export function authPhoneCandidates(phone: unknown): string[] {
  const raw = typeof phone === 'string' ? phone.trim() : '';
  const normalized = normalizeAuthPhone(raw);
  return [...new Set([raw, normalized].filter(Boolean))];
}
