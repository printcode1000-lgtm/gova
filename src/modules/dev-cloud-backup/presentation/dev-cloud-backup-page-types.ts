import type {
  DevCloudBackupInspectResult,
  DevCloudBackupListItem,
  DevCloudBackupRestorePreview,
} from "@asol/backup-core";

export interface DevCloudBackupListResponse {
  environment: {
    allowed: boolean;
    nodeEnv: string;
    publicMode: string;
    vercel: boolean;
  };
  backups: DevCloudBackupListItem[];
}

export interface DevCloudBackupInspectResponse {
  inspect: DevCloudBackupInspectResult;
  preview: DevCloudBackupRestorePreview;
}

export type BackupOperationKind = "inspect" | "compare" | "update" | "restore";

export interface BackupOperationStatus {
  kind: BackupOperationKind;
  fileName: string;
  phase: "running" | "done" | "failed";
  message: string;
  startedAt: string;
  finishedAt?: string;
}
