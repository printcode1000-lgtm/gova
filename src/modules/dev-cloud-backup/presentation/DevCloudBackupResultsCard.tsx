import { Download, GitCompareArrows } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <div className="rounded-md border bg-surface p-4">
      <div className="flex items-center gap-2 font-semibold">
        <GitCompareArrows className="h-5 w-5" />
        نتائج أوامر النسخ
      </div>
      {!diff && !updatedZip && !preview ? (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          استخدم أزرار فحص أو مقارنة أو تحديث من قائمة النسخ المحفوظة. لا توجد أي عملية يدوية أو رفع ملف من هذه الصفحة.
        </div>
      ) : null}
      {diff ? (
        <div className="mt-4 space-y-3 rounded-md border bg-surface p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">نتيجة المقارنة</div>
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                diff.status === "matched"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {diff.status === "matched" ? "متطابقة" : "توجد فروقات"}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <DevCloudBackupSummary label="جداول مختلفة" value={diff.summary.changedTables} />
            <DevCloudBackupSummary label="صور مختلفة" value={diff.summary.changedR2Objects} />
            <DevCloudBackupSummary label="سجلات zip" value={diff.summary.zipRows} />
            <DevCloudBackupSummary label="سجلات السحابة" value={diff.summary.cloudRows} />
          </div>
          {diff.databaseDifferences.length ? (
            <DevCloudBackupDiffList
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
            <DevCloudBackupDiffList
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
        <div className="mt-4 grid gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <DevCloudBackupDetail label="zip المحدث" value={updatedZip.fileName} ltr />
          <DevCloudBackupDetail label="الحجم" value={sizeText(updatedZip.sizeBytes)} />
          <DevCloudBackupDetail label="الجداول" value={String(updatedZip.tableCount)} />
          <DevCloudBackupDetail label="صور R2" value={String(updatedZip.r2ObjectCount)} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDownload(updatedZip.fileName)}
          >
            <Download className="h-4 w-4" />
            تنزيل zip المحدث
          </Button>
        </div>
      ) : null}
      {preview ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 rounded-md bg-muted p-3 text-sm">
            <DevCloudBackupDetail label="الوضع" value={preview.mode} ltr />
            <DevCloudBackupDetail label="القواعد" value={String(preview.databases.length)} />
            <DevCloudBackupDetail
              label="السجلات"
              value={String(preview.databases.reduce((sum, item) => sum + item.rowCount, 0))}
            />
            <DevCloudBackupDetail label="صور R2" value={String(preview.r2ObjectCount)} />
          </div>
          {preview.warnings.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
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
