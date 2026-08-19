import { normalizeAuthPhone } from '@asol/auth-core/server';

/** @deprecated Import from `@asol/auth-core/server` */
export { normalizeAuthPhone };

export function authPhoneCandidates(phone: unknown): string[] {
  const raw = typeof phone === 'string' ? phone.trim() : '';
  const normalized = normalizeAuthPhone(raw);
  return [...new Set([raw, normalized].filter(Boolean))];
}
