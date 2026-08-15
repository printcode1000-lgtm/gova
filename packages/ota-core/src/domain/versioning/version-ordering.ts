/**
 * Single responsibility: canonical version comparison for OTA releases and content versions.
 */

export const OTA_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/;

export function isOtaVersion(value: unknown): value is string {
  return typeof value === "string" && OTA_VERSION_PATTERN.test(value);
}

export function compareOtaVersions(left: string, right: string): number {
  const parse = (value: string) =>
    value.split("-")[0]!.split(".").map((part) => Number(part) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

export function shouldSupersedePending(
  pendingVersion: string,
  remoteVersion: string,
): boolean {
  return compareOtaVersions(remoteVersion, pendingVersion) > 0;
}
