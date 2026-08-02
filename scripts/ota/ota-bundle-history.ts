/** Single responsibility: select the retained OTA history and stale R2 bundle objects. */
import type { OtaManifest } from "./ota-config";
import { compareOtaCanonicalStrings } from "../../src/features/ota/utils/ota-canonical-order";

function compareVersions(left: string, right: string): number {
  const parse = (value: string) => value.split("-")[0]!.split(".").map(Number);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return compareOtaCanonicalStrings(left, right);
}

export function historyVersion(key: string, historyPrefix: string): string | null {
  if (!key.startsWith(`${historyPrefix}/`) || !key.endsWith(".json")) return null;
  const version = key.slice(historyPrefix.length + 1, -5);
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version) ? version : null;
}

export function selectRecentHistoryKeys(
  keys: readonly string[],
  historyPrefix: string,
  limit = 3,
): string[] {
  return keys
    .map((key) => ({ key, version: historyVersion(key, historyPrefix) }))
    .filter((entry): entry is { key: string; version: string } => Boolean(entry.version))
    .sort((left, right) => compareVersions(right.version, left.version))
    .slice(0, limit)
    .map((entry) => entry.key);
}

export function changedPathsFromHistory(
  currentFiles: Readonly<Record<string, { sha256: string; size: number }>>,
  base: OtaManifest,
  baseUrl: string,
): string[] {
  const sameLayout = base.baseUrl.replace(/\/$/, "") === baseUrl.replace(/\/$/, "");
  return Object.entries(currentFiles)
    .filter(([filePath, file]) => {
      const previous = base.files[filePath];
      return !sameLayout || previous?.sha256 !== file.sha256 || previous.size !== file.size;
    })
    .map(([filePath]) => filePath);
}

export function staleBundleKeys(
  keys: readonly string[],
  currentBundlePrefix: string,
): string[] {
  return keys.filter((key) => !key.startsWith(`${currentBundlePrefix}/`));
}
