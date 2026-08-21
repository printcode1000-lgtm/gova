import { formatAdminClock, formatAdminDateTime } from "@asol/format-core";

import type { BackupOperationKind } from "./dev-cloud-backup-page-types";

export const dateText = formatAdminDateTime;

export function sizeText(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatOperationTime(value?: string) {
  return formatAdminClock(value, { emptyText: "", seconds: true });
}

export function backupOperationTitle(kind: BackupOperationKind) {
  if (kind === "inspect") return "فحص النسخة";
  if (kind === "compare") return "مقارنة النسخة";
  if (kind === "restore") return "استعادة النسخة";
  return "تحديث النسخة";
}

export function operationBusyFor(
  busy: string,
  kind: BackupOperationKind,
  fileName: string,
) {
  const prefix =
    kind === "inspect"
      ? "inspect-saved"
      : kind === "compare"
        ? "compare-saved"
        : kind === "restore"
          ? "restore-saved"
          : "update-saved";
  return busy === `${prefix}:${fileName}`;
}
