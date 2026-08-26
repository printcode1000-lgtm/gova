const EGYPTIAN_MOBILE_PREFIXES = ['010', '011', '012', '015'] as const;

export type EgyptianMobilePhoneValidationIssue = 'required' | 'length' | 'prefix';

function phoneDigits(phone: unknown): string {
  return typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
}

function toLocalEgyptianPhoneDigits(phone: unknown): string {
  const digits = phoneDigits(phone);
  if (digits.startsWith('20') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function egyptianMobilePhoneValidationIssue(
  phone: unknown,
): EgyptianMobilePhoneValidationIssue | null {
  if (typeof phone !== 'string' || phone.trim().length === 0) return 'required';
  const normalized = toLocalEgyptianPhoneDigits(phone);
  if (normalized.length !== 11) return 'length';
  return EGYPTIAN_MOBILE_PREFIXES.includes(
    normalized.slice(0, 3) as (typeof EGYPTIAN_MOBILE_PREFIXES)[number],
  )
    ? null
    : 'prefix';
}

export function normalizeEgyptianMobilePhone(phone: unknown): string {
  const issue = egyptianMobilePhoneValidationIssue(phone);
  if (issue) throw new Error(`invalidEgyptianMobilePhone:${issue}`);
  return toLocalEgyptianPhoneDigits(phone);
}

export function isEgyptianMobilePhone(phone: unknown): boolean {
  return egyptianMobilePhoneValidationIssue(phone) === null;
}
