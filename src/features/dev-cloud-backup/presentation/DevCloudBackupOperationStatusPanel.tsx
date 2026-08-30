import { FileArchive, RefreshCw } from "lucide-react";

import {
  backupOperationTitle,
  formatOperationTime,
} from "./dev-cloud-backup-format";
import type { BackupOperationStatus } from "./dev-cloud-backup-page-types";

export function DevCloudBackupOperationStatusPanel({
  status,
}: {
  status: BackupOperationStatus;
}) {
  return (
    <section id="dev-cloud-backup.dev-cloud-backup-operation-status-panel.section"
      className={`rounded-md border p-3 text-sm ${
        status.phase === "failed"
          ? "border-red-200 bg-red-50 text-red-700"
          : status.phase === "done"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-blue-200 bg-blue-50 text-blue-800"
      }`}
    >
      <div id="dev-cloud-backup.dev-cloud-backup-operation-status-panel.div" className="flex flex-wrap items-center justify-between gap-2">
        <div id="dev-cloud-backup.dev-cloud-backup-operation-status-panel.div.2" className="flex min-w-0 items-center gap-2 font-semibold">
          {status.phase === "running" ? (
            <RefreshCw id="dev-cloud-backup.dev-cloud-backup-operation-status-panel.refresh-cw" className="h-4 w-4 animate-spin" />
          ) : (
            <FileArchive id="dev-cloud-backup.dev-cloud-backup-operation-status-panel.file-archive" className="h-4 w-4" />
          )}
          <span id="dev-cloud-backup.dev-cloud-backup-operation-status-panel.span">{backupOperationTitle(status.kind)}</span>
        </div>
        <div id="dev-cloud-backup.dev-cloud-backup-operation-status-panel.div.3" className="text-xs opacity-80">
          {formatOperationTime(status.startedAt)}
          {status.finishedAt
            ? ` - ${formatOperationTime(status.finishedAt)}`
            : ""}
        </div>
      </div>
      <div id="dev-cloud-backup.dev-cloud-backup-operation-status-panel.div.4" className="mt-2 break-all" dir="ltr">
        {status.fileName}
      </div>
      <div id="dev-cloud-backup.dev-cloud-backup-operation-status-panel.div.5" className="mt-2">{status.message}</div>
    </section>
  );
}
