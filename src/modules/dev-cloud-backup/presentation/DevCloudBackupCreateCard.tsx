import { CloudDownload, FileArchive } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DevCloudBackupSummary as DevCloudBackupSummaryType } from "@asol/backup-core";

import { sizeText } from "./dev-cloud-backup-format";
import { DevCloudBackupDetail } from "./DevCloudBackupDetail";

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
    <div className="rounded-md border bg-surface p-4">
      <div className="flex items-center gap-2 font-semibold">
        <CloudDownload className="h-5 w-5" />
        إنشاء نسخة جديدة
      </div>
      <div className="mt-4 grid gap-3">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          تحفظ النسخة كل قواعد Turso المتاحة في البيئة وكل كائنات R2 في الحسابين، بلا أي استثناء.
        </div>
        <Button type="button" onClick={onCreate} disabled={!devAllowed || busy === "create"}>
          <FileArchive className="h-4 w-4" />
          {busy === "create" ? "جاري إنشاء النسخة" : "إنشاء zip كامل"}
        </Button>
      </div>
      {created ? (
        <div className="mt-4 grid gap-2 rounded-md bg-muted p-3 text-sm">
          <DevCloudBackupDetail label="الملف" value={created.fileName} ltr />
          <DevCloudBackupDetail label="الحجم" value={sizeText(created.sizeBytes)} />
          <DevCloudBackupDetail label="الجداول" value={String(created.tableCount)} />
          <DevCloudBackupDetail label="السجلات" value={String(created.rowCount)} />
          <DevCloudBackupDetail label="صور R2" value={String(created.r2ObjectCount)} />
        </div>
      ) : null}
    </div>
  );
}
