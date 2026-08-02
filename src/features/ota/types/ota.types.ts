export interface OtaFileEntry {
  sha256: string;
  size: number;
}

export interface OtaBundleEntry {
  path: string;
  sha256: string;
  size: number;
  fromVersion?: string;
}

export interface OtaManifestBundles {
  full: OtaBundleEntry;
  delta?: OtaBundleEntry & { fromVersion: string };
}

export interface OtaManifestPayload {
  schemaVersion: number;
  delivery: "files";
  releaseId: string;
  version: string;
  createdAt: string;
  baseUrl: string;
  size: number;
  fileCount: number;
  minimumNativeVersion: string;
  requiredCapabilities: string[];
  mandatory: boolean;
  notes: string;
  files: Record<string, OtaFileEntry>;
  bundles?: OtaManifestBundles;
}

export interface OtaManifest extends OtaManifestPayload {
  signature?: string;
}

export interface DownloadedOtaUpdate {
  version: string;
  releaseId: string;
  path: string;
  size: number;
  totalBytes: number;
  notes: string;
  downloadedAt: number;
  changedFiles: string[];
  deletedFiles: string[];
  ready: true;
}

export interface OtaStoredState {
  pending?: DownloadedOtaUpdate;
  failedReleaseId?: string;
  activation?: {
    version: string;
    previousPath: string;
    startedAt: number;
    releaseId?: string;
  };
  resume?: OtaResumeState;
  workingBaselineVersion?: string;
  lastSuccessfulCheckAt?: number;
  discovered?: {
    releaseId: string;
    version: string;
    totalBytes: number;
    manifest: OtaManifest;
    changedFiles: string[];
    deletedFiles: string[];
  };
  download?: {
    releaseId: string;
    version: string;
    status: "requested" | "downloading" | "extracting";
    downloadedBytes: number;
    totalBytes: number;
    nativeTaskId?: string;
    expectedSha256?: string;
    bundlePath?: string;
  };
  lastStatusKey?: string;
  nativeUpdateRequired?: boolean;
}

export interface OtaResumeState {
  releaseId: string;
  version: string;
  completed: Record<string, string>;
}

export type OtaDownloadProgress = {
  progress: number;
  statusKey: string;
  detail?: string;
  currentVersion?: string;
  remoteVersion?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  nativeUpdateRequired?: boolean;
};

export interface OtaIdentity {
  uid: string;
  phone: string;
}

export interface OtaReleaseAccess {
  releaseId: string;
  version: string;
  allowed: boolean;
  approved: boolean;
  superAdmin: boolean;
  reason: "approved" | "super_admin" | "awaiting_approval";
}

export interface OtaReleaseSummary {
  releaseId: string;
  version: string;
  manifestCreatedAt: string;
  baseUrl: string;
  size: number;
  fileCount: number;
  minimumNativeVersion: string;
  mandatory: boolean;
  notes: string;
  signature: string;
  approved: boolean;
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
  action: "discovered" | "approved" | "revoked";
  actorUid?: string;
  createdAt: string;
}

export interface OtaAdminCurrentRelease {
  release: OtaReleaseSummary;
  manifest: OtaManifest;
  signatureVerified: boolean;
}

export interface OtaAdminDashboard {
  manifestUrl: string;
  current: OtaAdminCurrentRelease;
  history: OtaReleaseSummary[];
  audit: OtaReleaseAuditEntry[];
}

export type OtaFileChangeKind = "added" | "modified" | "deleted" | "unchanged";

export interface OtaFileChange {
  path: string;
  kind: OtaFileChangeKind;
  previousSize?: number;
  currentSize?: number;
  sizeDelta: number;
  previousSha256?: string;
  currentSha256?: string;
}

export interface OtaReleaseDiff {
  base: {
    releaseId: string;
    version: string;
    size: number;
    fileCount: number;
  };
  target: {
    releaseId: string;
    version: string;
    size: number;
    fileCount: number;
  };
  summary: {
    addedCount: number;
    modifiedCount: number;
    deletedCount: number;
    unchangedCount: number;
    addedBytes: number;
    modifiedDownloadBytes: number;
    deletedBytes: number;
    unchangedBytes: number;
    downloadBytes: number;
    totalSizeDelta: number;
  };
  files: OtaFileChange[];
}

export interface SetOtaReleaseApprovalInput {
  identity: OtaIdentity;
  releaseId: string;
  version: string;
  approved: boolean;
}
