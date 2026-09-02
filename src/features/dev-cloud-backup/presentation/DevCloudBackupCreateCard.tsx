import { CloudDownload, FileArchive } from "lucide-react";

import { Button } from "@/shared/ui/button";
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
    <div id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-div-1-suk7u9' className="rounded-md border bg-surface p-4">
      <div id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-div-2-ysztgl' className="flex items-center gap-2 font-semibold">
        <CloudDownload id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-clouddownload-3-kh1roz' className="h-5 w-5" />
        إنشاء نسخة جديدة
      </div>
      <div id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-div-4-ad0zns' className="mt-4 grid gap-3">
        <div id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-div-5-l3birb' className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          تحفظ النسخة كل قواعد Turso المتاحة في البيئة وكل كائنات R2 في الحسابين، بلا أي استثناء.
        </div>
        <Button id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-button-6-42gnfr' type="button" onClick={onCreate} disabled={!devAllowed || busy === "create"}>
          <FileArchive id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-filearchive-7-sjnc90' className="h-4 w-4" />
          {busy === "create" ? "جاري إنشاء النسخة" : "إنشاء zip كامل"}
        </Button>
      </div>
      {created ? (
        <div id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-div-8-x0lj48' className="mt-4 grid gap-2 rounded-md bg-muted p-3 text-sm">
          <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-devcloudbackupdetail-9-yltybi' label="الملف" value={created.fileName} ltr />
          <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-devcloudbackupdetail-10-9mluvd' label="الحجم" value={sizeText(created.sizeBytes)} />
          <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-devcloudbackupdetail-11-arkaod' label="الجداول" value={String(created.tableCount)} />
          <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-devcloudbackupdetail-12-cfnhaw' label="السجلات" value={String(created.rowCount)} />
          <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupcreatecard-devcloudbackupdetail-13-lfjn1s' label="صور R2" value={String(created.r2ObjectCount)} />
        </div>
      ) : null}
    </div>
  );
}
