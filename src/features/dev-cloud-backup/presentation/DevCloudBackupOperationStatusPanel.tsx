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
    <section id='features-dev-cloud-backup-presentation-devcloudbackupoperationstatuspanel-section-1-fot2rm'
      className={`rounded-md border p-3 text-sm ${
        status.phase === "failed"
          ? "border-red-200 bg-red-50 text-red-700"
          : status.phase === "done"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-blue-200 bg-blue-50 text-blue-800"
      }`}
    >
      <div id='features-dev-cloud-backup-presentation-devcloudbackupoperationstatuspanel-div-2-6wk9uh' className="flex flex-wrap items-center justify-between gap-2">
        <div id='features-dev-cloud-backup-presentation-devcloudbackupoperationstatuspanel-div-3-fe4oj2' className="flex min-w-0 items-center gap-2 font-semibold">
          {status.phase === "running" ? (
            <RefreshCw id='features-dev-cloud-backup-presentation-devcloudbackupoperationstatuspanel-refreshcw-4-jbkdat' className="h-4 w-4 animate-spin" />
          ) : (
            <FileArchive id='features-dev-cloud-backup-presentation-devcloudbackupoperationstatuspanel-filearchive-5-ilfonb' className="h-4 w-4" />
          )}
          <span id='features-dev-cloud-backup-presentation-devcloudbackupoperationstatuspanel-text-6-2no5v5'>{backupOperationTitle(status.kind)}</span>
        </div>
        <div id='features-dev-cloud-backup-presentation-devcloudbackupoperationstatuspanel-div-7-ee1xma' className="text-xs opacity-80">
          {formatOperationTime(status.startedAt)}
          {status.finishedAt
            ? ` - ${formatOperationTime(status.finishedAt)}`
            : ""}
        </div>
      </div>
      <div id='features-dev-cloud-backup-presentation-devcloudbackupoperationstatuspanel-div-8-yi1dpp' className="mt-2 break-all" dir="ltr">
        {status.fileName}
      </div>
      <div id='features-dev-cloud-backup-presentation-devcloudbackupoperationstatuspanel-div-9-lqtwhj' className="mt-2">{status.message}</div>
    </section>
  );
}
