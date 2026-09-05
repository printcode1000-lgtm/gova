export type DataHealthSeverity = "critical" | "warning" | "info";
export type DataHealthCategory =
  | "database"
  | "user"
  | "profile"
  | "product"
  | "image"
  | "order"
  | "relationship"
  | "advertisement"
  | "discount";

export type DataHealthCleanupAction =
  | "archive-product"
  | "archive-order"
  | "delete-broken-relation"
  | "quarantine-record"
  | "quarantine-storage-object"
  | "delete-storage-object"
  | "none";

export type DataHealthCleanupMode =
  | "automatic"
  | "quarantine"
  | "manual"
  | "protected";

export type DataHealthFindingState =
  | "new"
  | "recurring"
  | "quarantined"
  | "ignored";

export interface DataHealthIssue {
  id: string;
  fingerprint: string;
  category: DataHealthCategory;
  severity: DataHealthSeverity;
  database: string;
  table: string;
  recordId: string;
  ownerUid: string;
  title: string;
  details: string;
  evidence: Record<string, unknown>;
  cleanupAction: DataHealthCleanupAction;
  cleanupMode: DataHealthCleanupMode;
  canClean: boolean;
  snapshotHash: string;
  state: DataHealthFindingState;
  relatedId?: string;
  route?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataHealthSchemaDifference {
  database: string;
  status: "matched" | "different" | "skipped" | "error";
  sqliteVersion?: string;
  tursoVersion?: string;
  operations: Array<{
    type: string;
    description: string;
    tableName?: string;
  }>;
  warnings: string[];
  message?: string;
}

export interface DataHealthSchemaComparison {
  available: boolean;
  readOnly: true;
  generatedAt: string;
  databases: DataHealthSchemaDifference[];
}

export type DataHealthTopologyStatus =
  | "ready"
  | "warning"
  | "unavailable"
  | "not-applicable";

export interface DataHealthDatabaseTopologyItem {
  id: string;
  kind: "core" | "profile-shard" | "order-shard";
  tables: string[];
  status: DataHealthTopologyStatus;
  message?: string;
}

export interface DataHealthStorageTopologyItem {
  id: string;
  kind: "primary-r2" | "product-r2" | "product-apparel-pets-r2" | "local-mirror";
  provider: string;
  profiles: string[];
  cloudFolders: string[];
  localFolders: string[];
  referencedObjects: number;
  discoveredObjects: number;
  status: DataHealthTopologyStatus;
  message?: string;
}

export interface DataHealthImageSourceTopologyItem {
  database: string;
  table: string;
  columns: string[];
  ownership: "owned" | "shared-snapshot" | "static-asset" | "deletion-task";
  storageProfileId?: string;
}

export interface DataHealthTopology {
  databases: DataHealthDatabaseTopologyItem[];
  storage: DataHealthStorageTopologyItem[];
  imageSources: DataHealthImageSourceTopologyItem[];
}

export interface DataHealthReport {
  runId: string;
  generatedAt: string;
  durationMs: number;
  environment: "development" | "production";
  execution: {
    runtime: "development-local" | "production-cloud";
    databaseSource: "sqlite" | "turso";
    storageSource: "local" | "r2";
    schemaComparisonAllowed: boolean;
  };
  scannedRecords: number;
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    cleanable: number;
    quarantined: number;
  };
  issues: DataHealthIssue[];
  schemaComparison: DataHealthSchemaComparison;
  topology: DataHealthTopology;
}

export interface DataHealthCleanupPlan {
  id: string;
  runId: string;
  environment: "development" | "production";
  issueIds: string[];
  expiresAt: string;
  confirmationText: string;
  preview: Array<{
    issueId: string;
    title: string;
    action: DataHealthCleanupAction;
    cleanupMode: DataHealthCleanupMode;
  }>;
}

export interface DataHealthCleanupResult {
  cleanedAt: string;
  planId: string;
  cleaned: Array<{
    id: string;
    action: DataHealthCleanupAction;
    recordId: string;
  }>;
  skipped: Array<{ id: string; reason: string }>;
  report: DataHealthReport;
}

export interface DataHealthOrderPurgePlan {
  id: string;
  environment: "development" | "production";
  databaseSource: "sqlite" | "turso";
  storageSource: "local" | "r2";
  orderCount: number;
  tableCounts: Record<string, number>;
  imageCount: number;
  expiresAt: string;
  confirmationText: string;
}

export interface DataHealthOrderPurgeResult {
  purgeId: string;
  environment: "development" | "production";
  deletedOrders: number;
  deletedRows: Record<string, number>;
  deletedImages: number;
  pendingImages: number;
  completedAt: string;
}

export interface DataHealthHistoryEntry {
  id: string;
  environment: string;
  status: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  scannedRecords: number;
  total: number;
  critical: number;
  warning: number;
  info: number;
  cleanable: number;
}

export interface DataHealthAuditEntry {
  id: string;
  planId: string;
  adminUid: string;
  environment: string;
  issueId: string;
  action: string;
  recordId: string;
  status: string;
  reason: string;
  createdAt: string;
}

export interface DataHealthQuarantineEntry {
  id: string;
  fingerprint: string;
  resourceType: string;
  storageProfileId: string;
  resourceKey: string;
  database: string;
  table: string;
  recordId: string;
  reason: string;
  quarantinedBy: string;
  quarantinedAt: string;
  eligibleForDeletionAt: string;
  lastVerifiedAt: string;
  eligible: boolean;
}

export interface DataHealthQuarantineRecordDto {
  id: string; fingerprint: string; resourceType: string; storageProfileId: string;
  resourceKey: string; databaseName: string; tableName: string; recordId: string;
  eligibleForDeletionAt: string; releasedAt: string; deletedAt: string;
}

export interface DataHealthCleanupPlanRecordDto {
  id: string; adminUid: string; environment: string; issueIdsJson: string;
  snapshotsJson: string; expiresAt: string; consumedAt: string;
}

export interface DataHealthOrderPurgePlanRecordDto {
  id: string; adminUid: string; environment: string; orderCount: number;
  tableCountsJson: string; imagesJson: string; snapshotHash: string;
  confirmationText: string; createdAt: string; expiresAt: string; consumedAt: string;
  status: string; errorMessage: string;
}

export interface DataHealthStorageDeletionTaskDto {
  id: string; purgeId: string; storageProfileId: string; imageKey: string; status: string;
  attempts: number; lastError: string; createdAt: string; updatedAt: string; deletedAt: string;
}
