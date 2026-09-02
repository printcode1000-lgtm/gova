import { Download, GitCompareArrows } from "lucide-react";

import { Button } from "@/shared/ui/button";
import type {
  DevCloudBackupDiffReport,
  DevCloudBackupUpdateResult,
} from "@asol/backup-core";

import { sizeText } from "./dev-cloud-backup-format";
import type { DevCloudBackupInspectResponse } from "./dev-cloud-backup-page-types";
import {
  DevCloudBackupDetail,
  DevCloudBackupDiffList,
  DevCloudBackupSummary,
} from "./DevCloudBackupDetail";

export function DevCloudBackupResultsCard({
  diff,
  updatedZip,
  inspection,
  onDownload,
}: {
  diff: DevCloudBackupDiffReport | null;
  updatedZip: DevCloudBackupUpdateResult | null;
  inspection: DevCloudBackupInspectResponse | null;
  onDownload: (fileName: string) => void;
}) {
  const preview = inspection?.preview;

  return (
    <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-1-xpbxvk' className="rounded-md border bg-surface p-4">
      <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-2-szsrqb' className="flex items-center gap-2 font-semibold">
        <GitCompareArrows id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-gitcomparearrows-3-qzagil' className="h-5 w-5" />
        نتائج أوامر النسخ
      </div>
      {!diff && !updatedZip && !preview ? (
        <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-4-f9rcvr' className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          استخدم أزرار فحص أو مقارنة أو تحديث من قائمة النسخ المحفوظة. لا توجد أي عملية يدوية أو رفع ملف من هذه الصفحة.
        </div>
      ) : null}
      {diff ? (
        <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-5-yhomov' className="mt-4 space-y-3 rounded-md border bg-surface p-3 text-sm">
          <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-6-ke9mni' className="flex flex-wrap items-center justify-between gap-2">
            <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-7-yiipyh' className="font-semibold">نتيجة المقارنة</div>
            <span id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-text-8-xixbdp'
              className={`rounded-full px-2 py-1 text-xs ${
                diff.status === "matched"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {diff.status === "matched" ? "متطابقة" : "توجد فروقات"}
            </span>
          </div>
          <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-9-jpnrff' className="grid gap-2 sm:grid-cols-4">
            <DevCloudBackupSummary id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupsummary-10-bvt6zo' label="جداول مختلفة" value={diff.summary.changedTables} />
            <DevCloudBackupSummary id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupsummary-11-xc6uo0' label="صور مختلفة" value={diff.summary.changedR2Objects} />
            <DevCloudBackupSummary id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupsummary-12-shoi24' label="سجلات zip" value={diff.summary.zipRows} />
            <DevCloudBackupSummary id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupsummary-13-o0bneo' label="سجلات السحابة" value={diff.summary.cloudRows} />
          </div>
          {diff.databaseDifferences.length ? (
            <DevCloudBackupDiffList id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdifflist-14-c7gopz'
              title="فروقات الجداول"
              items={diff.databaseDifferences
                .slice(0, 12)
                .map(
                  (item) =>
                    `${item.databaseId}.${item.table}: ${item.status} (${item.zipRows} / ${item.cloudRows})`,
                )}
            />
          ) : null}
          {diff.r2Differences.length ? (
            <DevCloudBackupDiffList id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdifflist-15-s58hic'
              title="فروقات R2"
              items={diff.r2Differences
                .slice(0, 12)
                .map(
                  (item) =>
                    `${item.key}: ${item.status} (${item.zipSize ?? 0} / ${item.cloudSize ?? 0})`,
                )}
            />
          ) : null}
        </div>
      ) : null}
      {updatedZip ? (
        <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-16-yj0lws' className="mt-4 grid gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdetail-17-b2qiuo' label="zip المحدث" value={updatedZip.fileName} ltr />
          <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdetail-18-d7exev' label="الحجم" value={sizeText(updatedZip.sizeBytes)} />
          <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdetail-19-tetxqd' label="الجداول" value={String(updatedZip.tableCount)} />
          <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdetail-20-gpbwe8' label="صور R2" value={String(updatedZip.r2ObjectCount)} />
          <Button id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-button-21-xdeksv'
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDownload(updatedZip.fileName)}
          >
            <Download id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-download-22-kdsheo' className="h-4 w-4" />
            تنزيل zip المحدث
          </Button>
        </div>
      ) : null}
      {preview ? (
        <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-23-vlkwef' className="mt-4 space-y-3">
          <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-24-rllhsj' className="grid gap-2 rounded-md bg-muted p-3 text-sm">
            <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdetail-25-kpvnbm' label="الوضع" value={preview.mode} ltr />
            <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdetail-26-zacfks' label="القواعد" value={String(preview.databases.length)} />
            <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdetail-27-fxjkmd'
              label="السجلات"
              value={String(preview.databases.reduce((sum, item) => sum + item.rowCount, 0))}
            />
            <DevCloudBackupDetail id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-devcloudbackupdetail-28-3p2n9z' label="صور R2" value={String(preview.r2ObjectCount)} />
          </div>
          {preview.warnings.length ? (
            <div id='features-dev-cloud-backup-presentation-devcloudbackupresultscard-div-29-a9psyl' className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {preview.warnings.slice(0, 10).map((warning) => (
                <div key={warning} dir="ltr">
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
