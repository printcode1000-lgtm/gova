export interface OtaFileEntry {
  sha256: string;
  size: number;
}

export interface OtaManifestPayload {
  schemaVersion: number;
  delivery: 'files';
  releaseId: string;
  version: string;
  createdAt: string;
  baseUrl: string;
  size: number;
  fileCount: number;
  minimumNativeVersion: string;
  mandatory: boolean;
  notes: string;
  files: Record<string, OtaFileEntry>;
}

export interface OtaManifest extends OtaManifestPayload {
  signature?: string;
}

export interface DownloadedOtaUpdate {
  version: string;
  releaseId: string;
  path: string;
  size: number;
  changedFileCount: number;
  deletedFileCount: number;
  notes: string;
  downloadedAt: number;
  dismissedAt?: number;
}

export interface OtaStoredState {
  pending?: DownloadedOtaUpdate;
  failedReleaseId?: string;
  activation?: {
    version: string;
    previousPath: string;
    startedAt: number;
  };
}

export type OtaDownloadProgress = {
  progress: number;
  statusKey: string;
  detail?: string;
  currentVersion?: string;
  remoteVersion?: string;
  changedFileCount?: number;
  deletedFileCount?: number;
  downloadBytes?: number;
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
  reason: 'approved' | 'super_admin' | 'awaiting_approval';
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
  action: 'discovered' | 'approved' | 'revoked';
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

export type OtaFileChangeKind = 'added' | 'modified' | 'deleted' | 'unchanged';

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
