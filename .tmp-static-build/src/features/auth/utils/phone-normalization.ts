export function normalizeAuthPhone(phone: unknown): string {
  const digits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  if (digits.length === 12 && digits.startsWith("20")) return `0${digits.slice(2)}`;
  if (digits.length === 13 && digits.startsWith("020")) return `0${digits.slice(3)}`;
  return digits;
}

export function authPhoneCandidates(phone: unknown): string[] {
  const raw = typeof phone === "string" ? phone.trim() : "";
  const normalized = normalizeAuthPhone(raw);
  return [...new Set([raw, normalized].filter(Boolean))];
}
