export const DEV_CLOUD_BACKUP_MANIFEST_VERSION = 1;
export const DEV_CLOUD_BACKUP_MODULE_VERSION = "1.0.0";

export type DevCloudBackupScope = "known-project-files" | "all-r2";
export type DevCloudBackupRestoreMode = "merge" | "replace";

export interface DevCloudBackupDatabaseManifest {
  id: string;
  label: string;
  tables: Array<{
    name: string;
    rowCount: number;
    file: string;
  }>;
  schemaFile: string;
  exportedAt: string;
  error?: string;
}

export interface DevCloudBackupR2ObjectManifest {
  storage: "primary" | "products";
  key: string;
  file: string;
  size: number;
  contentType?: string;
  lastModified?: string;
  etag?: string;
}

export interface DevCloudBackupManifest {
  manifestVersion: typeof DEV_CLOUD_BACKUP_MANIFEST_VERSION;
  createdByModuleVersion: string;
  backupId: string;
  createdAt: string;
  environment: "development";
  scope: DevCloudBackupScope;
  databases: DevCloudBackupDatabaseManifest[];
  r2: {
    bucketNames: Partial<Record<"primary" | "products", string>>;
    objectCount: number;
    totalBytes: number;
    objects: DevCloudBackupR2ObjectManifest[];
    prefixes: string[];
    error?: string;
  };
}

export interface DevCloudBackupSummary {
  backupId: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  scope: DevCloudBackupScope;
  databaseCount: number;
  tableCount: number;
  rowCount: number;
  r2ObjectCount: number;
  r2TotalBytes: number;
  downloadUrl: string;
  manifest: DevCloudBackupManifest;
}

export interface DevCloudBackupDiffReport {
  comparedAt: string;
  zipBackupId: string;
  cloudBackupId: string;
  status: "matched" | "different";
  databaseDifferences: Array<{
    databaseId: string;
    table: string;
    status: "missing-in-zip" | "missing-in-cloud" | "changed";
    zipRows: number;
    cloudRows: number;
  }>;
  r2Differences: Array<{
    storage: "primary" | "products";
    key: string;
    status: "missing-in-zip" | "missing-in-cloud" | "changed";
    zipSize?: number;
    cloudSize?: number;
  }>;
  summary: {
    changedTables: number;
    changedR2Objects: number;
    zipRows: number;
    cloudRows: number;
    zipR2Objects: number;
    cloudR2Objects: number;
  };
}

export interface DevCloudBackupUpdateResult extends DevCloudBackupSummary {
  diff: DevCloudBackupDiffReport;
}

export interface DevCloudBackupListItem {
  fileName: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface DevCloudBackupInspectResult {
  valid: true;
  manifest: DevCloudBackupManifest;
  warnings: string[];
}

export interface DevCloudBackupRestorePreview {
  mode: DevCloudBackupRestoreMode;
  confirmationText: string;
  databases: Array<{
    id: string;
    tableCount: number;
    rowCount: number;
  }>;
  r2ObjectCount: number;
  warnings: string[];
}

export interface DevCloudBackupRestoreResult {
  restoredAt: string;
  mode: DevCloudBackupRestoreMode;
  restoredDatabases: number;
  restoredTables: number;
  restoredRows: number;
  uploadedR2Objects: number;
  deletedR2Objects: number;
}
