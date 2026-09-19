const LEGACY_PUBLIC_ORDER_PREFIX = /^(?:ASOL|GOVA)-/i;

export function formatPublicOrderNumber(
  value: unknown,
  fallback: unknown = "",
): string {
  const raw = String(value ?? fallback ?? "");
  return raw.replace(LEGACY_PUBLIC_ORDER_PREFIX, "Pbook-");
}
