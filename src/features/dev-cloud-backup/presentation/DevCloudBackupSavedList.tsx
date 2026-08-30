import {
  ArchiveRestore,
  DatabaseBackup,
  Download,
  FileArchive,
  GitCompareArrows,
  RefreshCw,
  ListPlus,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import type {
  DevCloudBackupListItem,
  DevCloudBackupRestoreMode,
} from "@asol/backup-core";

import {
  dateText,
  operationBusyFor,
  sizeText,
} from "./dev-cloud-backup-format";
import type { BackupOperationStatus } from "./dev-cloud-backup-page-types";

export function DevCloudBackupSavedList({
  backups,
  busy,
  devAllowed,
  savedOperationBusy,
  operationStatus,
  onDownload,
  onInspect,
  onCompare,
  onUpdate,
  onRestore,
  onDelete,
}: {
  backups: DevCloudBackupListItem[];
  busy: string;
  devAllowed: boolean;
  savedOperationBusy: boolean;
  operationStatus: BackupOperationStatus | null;
  onDownload: (fileName: string) => void;
  onInspect: (fileName: string) => void;
  onCompare: (fileName: string) => void;
  onUpdate: (fileName: string) => void;
  onRestore: (fileName: string, mode: DevCloudBackupRestoreMode) => void;
  onDelete: (fileName: string) => void;
}) {
  return (
    <section id="dev-cloud-backup.dev-cloud-backup-saved-list.section" className="overflow-hidden rounded-md border bg-surface">
      <div id="dev-cloud-backup.dev-cloud-backup-saved-list.div" className="flex items-center gap-2 border-b p-3 font-semibold">
        <FileArchive id="dev-cloud-backup.dev-cloud-backup-saved-list.file-archive" className="h-5 w-5" />
        النسخ المحفوظة محليًا
      </div>
      <div id="dev-cloud-backup.dev-cloud-backup-saved-list.div.2" className="divide-y">
        {backups.map((backup) => (
          <SavedBackupRow
            key={backup.fileName}
            backup={backup}
            busy={busy}
            devAllowed={devAllowed}
            savedOperationBusy={savedOperationBusy}
            operationStatus={operationStatus?.fileName === backup.fileName ? operationStatus : null}
            onDownload={onDownload}
            onInspect={onInspect}
            onCompare={onCompare}
            onUpdate={onUpdate}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
        {backups.length === 0 ? (
          <div id="dev-cloud-backup.dev-cloud-backup-saved-list.div.3" className="p-6 text-center text-sm text-on-surface-variant">
            لا توجد نسخ محفوظة بعد.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SavedBackupRow({ id,
  backup,
  busy,
  devAllowed,
  savedOperationBusy,
  operationStatus,
  onDownload,
  onInspect,
  onCompare,
  onUpdate,
  onRestore,
  onDelete,
}: {
  backup: DevCloudBackupListItem;
  busy: string;
  devAllowed: boolean;
  savedOperationBusy: boolean;
  operationStatus: BackupOperationStatus | null;
  onDownload: (fileName: string) => void;
  onInspect: (fileName: string) => void;
  onCompare: (fileName: string) => void;
  onUpdate: (fileName: string) => void;
  onRestore: (fileName: string, mode: DevCloudBackupRestoreMode) => void;
  onDelete: (fileName: string) => void;
} & { id?: string }) {
  const inspectBusy = operationBusyFor(busy, "inspect", backup.fileName);
  const compareBusy = operationBusyFor(busy, "compare", backup.fileName);
  const updateBusy = operationBusyFor(busy, "update", backup.fileName);
  const restoreBusy = busy === `restore-saved:${backup.fileName}`;
  const commandDisabled = !devAllowed || savedOperationBusy;

  return (
    <div id={id} className="grid gap-3 p-3 text-sm md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="break-all font-medium" dir="ltr">
          {backup.fileName}
        </div>
        <div className="mt-1 text-xs text-on-surface-variant">
          {dateText(backup.modifiedAt)}، {sizeText(backup.sizeBytes)}
        </div>
        {operationStatus ? (
          <div
            className={`mt-2 rounded-md border px-2 py-1 text-xs ${
              operationStatus.phase === "failed"
                ? "border-red-200 bg-red-50 text-red-700"
                : operationStatus.phase === "done"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              {operationStatus.phase === "running" ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : null}
              {operationStatus.message}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!devAllowed || busy === `download:${backup.fileName}`}
          onClick={() => onDownload(backup.fileName)}
        >
          <Download className="h-4 w-4" />
          تنزيل
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={commandDisabled}
          onClick={() => onInspect(backup.fileName)}
        >
          <ArchiveRestore className="h-4 w-4" />
          {inspectBusy ? "جاري فحص هذا الملف" : "فحص"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={commandDisabled}
          onClick={() => onCompare(backup.fileName)}
        >
          <GitCompareArrows className="h-4 w-4" />
          {compareBusy ? "جاري مقارنة هذا الملف" : "مقارنة"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={commandDisabled}
          onClick={() => onUpdate(backup.fileName)}
        >
          <RefreshCw className={updateBusy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {updateBusy ? "جاري تحديث هذا الملف" : "تحديث"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-amber-400 text-amber-800"
          disabled={commandDisabled}
          onClick={() => onRestore(backup.fileName, "merge")}
        >
          <DatabaseBackup className="h-4 w-4" />
          {restoreBusy ? "جاري الاستعادة" : "استعادة (دمج)"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="bg-amber-700"
          disabled={commandDisabled}
          onClick={() => onRestore(backup.fileName, "replace")}
        >
          <DatabaseBackup className="h-4 w-4" />
          {restoreBusy ? "جاري الاستعادة" : "استعادة (مطابقة تامة)"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!devAllowed || busy === `delete:${backup.fileName}` || savedOperationBusy}
          onClick={() => onDelete(backup.fileName)}
        >
          <ListPlus className="h-4 w-4" />
          {busy === `delete:${backup.fileName}` ? "جاري الحذف" : "إضافة الحذف للحفظ"}
        </Button>
      </div>
    </div>
  );
}
