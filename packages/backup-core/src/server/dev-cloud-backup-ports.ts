import type {
  DevCloudBackupEnvironment,
  DevCloudBackupManifest,
  DevCloudBackupRestoreMode,
} from "../domain/types";

export interface BackupDatabaseSource {
  id: string;
  label: string;
  urlKey: string;
  tokenKey: string;
}

export interface BackupDatabasePort {
  sources(): BackupDatabaseSource[];
  exportDatabase(source: BackupDatabaseSource): Promise<{
    manifest: DevCloudBackupManifest["databases"][number];
    files: Record<string, Uint8Array>;
    rowCount: number;
  }>;
  restoreDatabase(
    manifest: DevCloudBackupManifest["databases"][number],
    files: Record<string, Uint8Array>,
    mode: DevCloudBackupRestoreMode,
  ): Promise<{ tableCount: number; rowCount: number }>;
}

export interface DevCloudBackupPorts {
  assertAllowed(): void;
  environment(): DevCloudBackupEnvironment;
  database: BackupDatabasePort;
}
