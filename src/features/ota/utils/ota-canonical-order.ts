/** Single responsibility: define deterministic string ordering for signed OTA payloads. */
export function compareOtaCanonicalStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
