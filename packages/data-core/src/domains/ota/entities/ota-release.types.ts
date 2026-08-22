/**
 * OTA persistence shapes, owned here rather than imported from `@asol/ota-core`.
 *
 * These are row projections: what the release tables store and hand back. The
 * repository previously typed its signatures with `@asol/ota-core`'s versions,
 * which closed a package cycle — ota-core reads and writes through this package,
 * and this package reached back for the types. `@asol/ota-core` re-exports these
 * under its own door, so consumers are unchanged and one definition remains.
 */
export interface OtaReleaseSummary {
  releaseId: string;
  version: string;
  manifestCreatedAt: string;
  baseUrl: string;
  size: number;
  fileCount: number;
  minimumNativeVersion: string;
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  mandatory: boolean;
  notes: string;
  signature: string;
  approved: boolean;
  rolloutPercentage: number;
  approvedAt?: string;
  approvedByUid?: string;
  revokedAt?: string;
  revokedByUid?: string;
  discoveredAt: string;
  lastSeenAt: string;
}

export interface OtaReleaseAuditEntry {
  id: string;
  releaseId: string;
  version: string;
  action: "discovered" | "approved" | "revoked" | "rollout_changed";
  actorUid?: string;
  createdAt: string;
}

/**
 * The manifest fields the release tables actually read. `OtaManifest` in
 * `@asol/ota-core` is the richer runtime type and satisfies this structurally,
 * so nothing at the call site changes — but the repository no longer needs to
 * know the whole manifest schema to store a row.
 */
export interface OtaReleaseManifestRecord {
  releaseId: string;
  version: string;
  createdAt: string;
  baseUrl: string;
  size: number;
  fileCount: number;
  minimumNativeVersion: string;
  requiredCapabilities?: string[];
  optionalCapabilities?: string[];
  mandatory?: boolean;
  notes?: string;
  signature?: string;
}
