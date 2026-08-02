/** Single responsibility: reproduce current and authenticated legacy OTA signature payloads. */
import type { OtaManifest, OtaManifestPayload } from "../types/ota.types";
import { compareOtaCanonicalStrings } from "./ota-canonical-order";

function sortedFiles(
  files: OtaManifestPayload["files"],
): OtaManifestPayload["files"] {
  return Object.fromEntries(
    Object.entries(files).sort(([left], [right]) => compareOtaCanonicalStrings(left, right)),
  );
}

export function canonicalOtaManifestPayload(
  manifest: OtaManifestPayload,
): string {
  const bundles = manifest.bundles
    ? {
        full: {
          path: manifest.bundles.full.path,
          sha256: manifest.bundles.full.sha256,
          size: manifest.bundles.full.size,
        },
        deltas: [...manifest.bundles.deltas]
          .sort((left, right) => compareOtaCanonicalStrings(left.fromVersion, right.fromVersion))
          .map((delta) => ({
            path: delta.path,
            fromVersion: delta.fromVersion,
            sha256: delta.sha256,
            size: delta.size,
          })),
      }
    : undefined;
  return JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    delivery: manifest.delivery,
    releaseId: manifest.releaseId,
    version: manifest.version,
    createdAt: manifest.createdAt,
    baseUrl: manifest.baseUrl,
    size: manifest.size,
    fileCount: manifest.fileCount,
    minimumNativeVersion: manifest.minimumNativeVersion,
    requiredCapabilities: [...(manifest.requiredCapabilities ?? [])].sort(compareOtaCanonicalStrings),
    mandatory: manifest.mandatory,
    notes: manifest.notes,
    files: sortedFiles(manifest.files),
    bundles,
  });
}

export function legacyOtaManifestPayload(
  manifest: OtaManifest,
): string | null {
  const runtimeManifest = manifest as OtaManifest & {
    requiredCapabilities?: string[];
  };
  // Temporary dashboard-only compatibility for the published pre-capabilities
  // schema. Delete after the live manifest has moved to the current schema.
  if (runtimeManifest.requiredCapabilities !== undefined || manifest.bundles !== undefined)
    return null;

  return JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    delivery: manifest.delivery,
    releaseId: manifest.releaseId,
    version: manifest.version,
    createdAt: manifest.createdAt,
    baseUrl: manifest.baseUrl,
    size: manifest.size,
    fileCount: manifest.fileCount,
    minimumNativeVersion: manifest.minimumNativeVersion,
    mandatory: manifest.mandatory,
    notes: manifest.notes,
    files: sortedFiles(manifest.files),
  });
}
