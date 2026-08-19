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
