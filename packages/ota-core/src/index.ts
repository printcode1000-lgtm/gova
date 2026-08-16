export { configureOtaCore, resetOtaCorePorts, type OtaCorePorts, type OtaTelemetryPort, type OtaIdentityPort, type OtaLogEntry } from "./ports";
/**
 * Runtime entry for @asol/ota-core.
 * Browser and Next.js SSR safe.
 * Zero Node builtins, zero backend dependencies.
 */

// ── Versioning & Ordering ──────────────────────────────────────────────────
export {
  compareOtaVersions,
  isOtaVersion,
  shouldSupersedePending,
  OTA_VERSION_PATTERN,
} from "./domain/versioning/version-ordering";

export {
  isNativeVersion,
  assertNativeVersion,
  parseContentVersion,
  releaseContentVersion,
  nextContentVersion,
  assertContentVersionAdvances,
  type ContentVersionParts,
} from "./domain/versioning/content-version";

export {
  nativeVersionFromBaseline,
  nextNativePatchVersion,
  androidVersionCodeFor,
} from "./domain/versioning/native-version";

// ── Domain Types ───────────────────────────────────────────────────────────
export type {
  OtaFileEntry,
  OtaBundleEntry,
  OtaManifestBundles,
  OtaManifestPayload,
  OtaManifest,
  DownloadedOtaUpdate,
  OtaStoredState,
  OtaResumeState,
  OtaDownloadProgress,
  OtaIdentity,
  OtaReleaseAccess,
  OtaReleaseSummary,
  OtaReleaseAuditEntry,
  OtaAdminCurrentRelease,
  OtaAdminDashboard,
  OtaAdoptionSummary,
  OtaFileChangeKind,
  OtaFileChange,
  OtaReleaseDiff,
  SetOtaReleaseApprovalInput,
} from "./domain/release/manifest-types";

// ── Domain Logic & Utilities ───────────────────────────────────────────────
export {
  compareOtaCanonicalStrings,
  sortOtaCanonicalKeys,
} from "./domain/release/canonical-order";
export {
  canonicalOtaManifestPayload,
  legacyOtaManifestPayload,
} from "./domain/release/signature-payload";
export { compareOtaManifests } from "./domain/release/release-diff";
export {
  otaRolloutBucket,
  isOtaRolloutEligible,
} from "./domain/release/rollout";
export {
  OTA_TERMINAL_OUTCOMES,
  summarizeOtaAdoption,
  type OtaLogEntryInput,
} from "./domain/release/adoption";
export {
  canonicalOtaRevocationPayload,
  isValidOtaRevocationDocument,
  verifyOtaRevocationDocument,
  type OtaRevocationDocument,
  type OtaRevocationDocumentPayload,
} from "./domain/release/revocation-document";
export {
  acceptOtaRevocationDocument,
  isPersistedOtaRevocationState,
  type PersistedOtaRevocationState,
  type OtaRevocationAcceptance,
} from "./domain/release/revocation-state";
export {
  evaluateOtaCapabilities,
  type CapabilityLookup,
  type OtaCapabilityDecision,
} from "./domain/release/capability-gate";
export {
  safeBundlePath,
  selectOtaBundle,
  otaBundleCandidates,
  selectOtaBundleAttempt,
  bundleUrl,
  extractOtaBundle,
  type SelectedOtaBundle,
  type OtaBundleSink,
} from "./domain/release/bundle";
export {
  planOtaDelta,
  pendingDeltaFiles,
  runBounded,
  completedFileEntry,
  type OtaDeltaPlan,
} from "./domain/release/delta-plan";
export {
  OTA_DAILY_CHECK_INTERVAL_MS,
  OTA_FREE_SPACE_MARGIN,
  nativeDownloadPollAction,
  shouldPersistNativeDownloadProgress,
  isDailyOtaCheckDue,
  clampFutureOtaCheckTimestamp,
  requiredOtaFreeBytes,
  shouldRunOtaCheck,
  isReadyForOtaActivation,
  migrateOtaState,
  reconcileNativeDownloadTask,
  type OtaCheckMode,
  type NativeDownloadPollAction,
} from "./domain/release/ota-state";
export { OtaStaleRemoteFileError } from "./domain/release/stale-file-error";

// ── Errors & Result ────────────────────────────────────────────────────────
export { OtaCoreError } from "./errors/ota-core-error";
export { ok, err, type Result } from "./errors/result";

// ── Runtime Services ───────────────────────────────────────────────────────
export { otaApiService, OtaApiService } from "./runtime/api-service";
export {
  otaRevocationService,
  otaRevocationsUrl,
} from "./runtime/revocation-service";
export {
  recordOtaOutcome,
  otaFailureReason,
  type OtaOutcome,
} from "./runtime/outcome-logger";
export {
  otaUpdateService,
  OTA_STATE_EVENT,
  OTA_DOWNLOAD_CONCURRENCY,
  OTA_BASELINE_CONCURRENCY,
} from "./runtime/update-service";
export {
  useOtaUpdate,
  OtaUpdateProvider,
} from "./runtime/use-ota-update";
