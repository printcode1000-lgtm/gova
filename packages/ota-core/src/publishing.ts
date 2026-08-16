/**
 * Node-only publishing entry point for @asol/ota-core/publishing.
 * Zero browser code, full Node filesystem & SDK capabilities.
 */

// ── Errors & Result ────────────────────────────────────────────────────────
export { ok, err, type Result } from "./errors/result";
export { OtaCoreError } from "./errors/ota-core-error";

// ── The Gate ───────────────────────────────────────────────────────────────
export {
  evaluateReleaseGate,
  resolveNativeBaseline,
  inspectNativeCompatibility,
  isNativeSurface,
  isUndeclarableNativeChange,
  undeclarableNativeChanges,
  NATIVE_SURFACE_PATTERNS,
  NATIVE_CONTRACT_FILES,
  type GateDecision,
  type NativeCompatibilityReport,
} from "./publishing/gate/native-gate";
export { formatNativeSurfaceReport } from "./publishing/gate/gate-report";

// ── The Build & Release Orchestrator ───────────────────────────────────────
export {
  buildStaticOut,
  type BuildStaticOutOptions,
  type BuildStaticOutResult,
} from "./publishing/build/build-out";
export {
  publishOtaRelease,
  cutNativeRelease,
  runLocalRefresh,
  revokeOtaVersion,
  type PublishOtaReleaseOptions,
  type PublishOtaReleaseResult,
  type CutNativeReleaseOptions,
  type CutNativeReleaseResult,
  type LocalRefreshResult,
  type RevokeOtaVersionOptions,
  type RevocationResult,
} from "./publishing/release/publish-release";

// ── Truth Readers ──────────────────────────────────────────────────────────
export {
  readLiveOtaRelease,
  type LiveOtaRelease,
} from "./publishing/truth/live-ota-release";
export {
  readLivePlayRelease,
  type LivePlayRelease,
} from "./publishing/truth/live-play-release";
export {
  readCurrentVersions,
  type CurrentVersions,
} from "./publishing/versioning/version-reader";

// ── Version Writers ────────────────────────────────────────────────────────
export {
  writeTreeVersions,
  updateAndroidGradleVersion,
  updateIosProjectVersion,
  updateCommittedVersionConstants,
  type VersionWriteResult,
} from "./publishing/versioning/version-writer";

// ── Keys & Storage ─────────────────────────────────────────────────────────
export {
  generateOtaSigningKeys,
  type GeneratedKeys,
} from "./publishing/release/keygen";
export {
  createOtaR2Client,
  putOtaObject,
  getOtaManifestObject,
  getOtaObjectBytes,
  listOtaObjectKeys,
  deleteOtaObjects,
  deleteOtaObject,
  otaObjectExists,
  isRetryableR2Error,
} from "./publishing/adapters/r2-storage.adapter";
export {
  getOtaPrefix,
  getOtaPublicBaseUrl,
  getOtaManifestUrl,
  getOtaBucketName,
  getOtaPrivateKey,
  getOtaPublicKeyBase64,
  loadOtaEnvironment,
  otaClientBuildEnv,
  canonicalManifestPayload,
  OTA_SCHEMA_VERSION,
  DEFAULT_OTA_PREFIX,
  DEFAULT_NATIVE_VERSION,
} from "./publishing/config/ota-config";

// ── Manifest Guard ─────────────────────────────────────────────────────────
export {
  assertReleaseManifestNotDowngraded,
} from "./publishing/build/release-manifest-guard";
export {
  assertReleaseStaticBundle,
  assertCapBuildInputBundle,
} from "./publishing/build/release-bundle-guard";

// ── Credential Resolution ──────────────────────────────────────────────────
export {
  resolveGooglePlayCredentials,
  readLiveTrackVersionCodes,
  type GooglePlayCredentialStatus,
} from "./publishing/adapters/google-play.adapter";

// ── Capability Scanning & Manifest Assembly ────────────────────────────────
export {
  scanSourceCapabilityReferences,
  scanBuiltCapabilities,
  splitCapabilityRequirements,
  resolveManifestCapabilities,
  resolveOptionalCapabilities,
  detectableCapabilityKeys,
  assertDetectionCoverage,
  CAPABILITY_METADATA_FILE,
  type CapabilityRequirements,
  type ResolvedManifestCapabilities,
  type ScannableBuiltFile,
} from "./publishing/release/capability-scan";
export {
  assembleAndSignManifest,
  type AssembleManifestOptions,
  type CollectedFileEntry,
} from "./publishing/release/manifest-assembly";
export {
  readTrackedRevokedVersions,
  writeTrackedRevokedVersions,
  mergeRevokedVersions,
  createSignedRevocationDocument,
  verifySignedRevocationDocument,
  normalizeRevokedVersions,
  OTA_REVOCATIONS_FILE,
} from "./publishing/release/revocation";
export {
  readVerifiedLiveRevocationDocument,
} from "./publishing/release/live-revocation";
export {
  selectRecentHistoryKeys,
  changedPathsFromHistory,
  staleBundleKeys,
  historyVersion,
} from "./publishing/release/history";
export { filesystemAdapter } from "./publishing/adapters/filesystem.adapter";
export { processAdapter } from "./publishing/adapters/process.adapter";
