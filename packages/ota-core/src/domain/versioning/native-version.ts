/**
 * Single responsibility: native version manipulation and Android versionCode derivation.
 */

export function nativeVersionFromBaseline(baseline: string): string | null {
  return /^native-v(\d+\.\d+\.\d+)$/.exec(baseline.trim())?.[1] ?? null;
}

export function nextNativePatchVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) throw new Error(`Invalid native version: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

export function androidVersionCodeFor(version: string): number {
  const [major = 0, minor = 0, patch = 0] = version
    .split(".")
    .map((part) => Number(part) || 0);
  return major * 10000 + minor * 100 + patch;
}
