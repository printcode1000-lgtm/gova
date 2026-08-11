/** Canonical form used for comparisons and persistence of optional account email addresses. */
export function normalizeAuthEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase() ?? '';
  return normalized || null;
}
