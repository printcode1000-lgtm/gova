import { CloudDownload, FileArchive } from "lucide-react";

import { Button } from "@/shared/ui/button";
import type { DevCloudBackupSummary as DevCloudBackupSummaryType } from "@asol/backup-core";

import { sizeText } from "./dev-cloud-backup-format";
import { DevCloudBackupDetail } from "./DevCloudBackupDetail";
import { uiAttributes } from "@asol/ui-registry-core";

export function DevCloudBackupCreateCard({
  created,
  devAllowed,
  busy,
  onCreate,
}: {
  created: DevCloudBackupSummaryType | null;
  devAllowed: boolean;
  busy: string;
  onCreate: () => void;
}) {
  return (
    <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-create-card.div.6-JGDY6g", id: "dev-cloud-backup.dev-cloud-backup-create-card.div.6" })} id="dev-cloud-backup.dev-cloud-backup-create-card.div" className="rounded-md border bg-surface p-4">
      <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-create-card.div.7-C7p1Lg", id: "dev-cloud-backup.dev-cloud-backup-create-card.div.7" })} id="dev-cloud-backup.dev-cloud-backup-create-card.div.2" className="flex items-center gap-2 font-semibold">
        <CloudDownload id="dev-cloud-backup.dev-cloud-backup-create-card.cloud-download" className="h-5 w-5" />
        إنشاء نسخة جديدة
      </div>
      <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-create-card.div.8-E04PFN", id: "dev-cloud-backup.dev-cloud-backup-create-card.div.8" })} id="dev-cloud-backup.dev-cloud-backup-create-card.div.3" className="mt-4 grid gap-3">
        <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-create-card.div.9-vE9i7q", id: "dev-cloud-backup.dev-cloud-backup-create-card.div.9" })} id="dev-cloud-backup.dev-cloud-backup-create-card.div.4" className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          تحفظ النسخة كل قواعد Turso المتاحة في البيئة وكل كائنات R2 في الحسابين، بلا أي استثناء.
        </div>
        <Button id="dev-cloud-backup.dev-cloud-backup-create-card.button" ui={{ uid: "dev-cloud-backup.create-s71BQD", id: "dev-cloud-backup.create", kind: "action", action: "create-backup", part: "create" }} type="button" onClick={onCreate} disabled={!devAllowed || busy === "create"}>
          <FileArchive id="dev-cloud-backup.dev-cloud-backup-create-card.file-archive" className="h-4 w-4" />
          {busy === "create" ? "جاري إنشاء النسخة" : "إنشاء zip كامل"}
        </Button>
      </div>
      {created ? (
        <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-create-card.div.10-0fCxWF", id: "dev-cloud-backup.dev-cloud-backup-create-card.div.10" })} id="dev-cloud-backup.dev-cloud-backup-create-card.div.5" className="mt-4 grid gap-2 rounded-md bg-muted p-3 text-sm">
          <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-create-card.dev-cloud-backup-detail" label="الملف" value={created.fileName} ltr />
          <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-create-card.dev-cloud-backup-detail.2" label="الحجم" value={sizeText(created.sizeBytes)} />
          <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-create-card.dev-cloud-backup-detail.3" label="الجداول" value={String(created.tableCount)} />
          <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-create-card.dev-cloud-backup-detail.4" label="السجلات" value={String(created.rowCount)} />
          <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-create-card.dev-cloud-backup-detail.5" label="صور R2" value={String(created.r2ObjectCount)} />
        </div>
      ) : null}
    </div>
  );
}
