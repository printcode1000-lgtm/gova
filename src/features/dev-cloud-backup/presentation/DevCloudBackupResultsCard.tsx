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
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.12-t7UUR0", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.12" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div" className="rounded-md border bg-surface p-4">
      <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.13-fG9CIR", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.13" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.2" className="flex items-center gap-2 font-semibold">
        <GitCompareArrows id="dev-cloud-backup.dev-cloud-backup-results-card.git-compare-arrows" className="h-5 w-5" />
        نتائج أوامر النسخ
      </div>
      {!diff && !updatedZip && !preview ? (
        <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.14-At1dNE", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.14" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.3" className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          استخدم أزرار فحص أو مقارنة أو تحديث من قائمة النسخ المحفوظة. لا توجد أي عملية يدوية أو رفع ملف من هذه الصفحة.
        </div>
      ) : null}
      {diff ? (
        <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.15-BC37GL", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.15" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.4" className="mt-4 space-y-3 rounded-md border bg-surface p-3 text-sm">
          <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.16-SXkG3Z", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.16" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.5" className="flex flex-wrap items-center justify-between gap-2">
            <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.17-Qc0rh6", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.17" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.6" className="font-semibold">نتيجة المقارنة</div>
            <span {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.span.2-BxTG1R", id: "dev-cloud-backup.dev-cloud-backup-results-card.span.2" })} id="dev-cloud-backup.dev-cloud-backup-results-card.span"
              className={`rounded-full px-2 py-1 text-xs ${
                diff.status === "matched"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {diff.status === "matched" ? "متطابقة" : "توجد فروقات"}
            </span>
          </div>
          <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.18-T6CFN1", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.18" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.7" className="grid gap-2 sm:grid-cols-4">
            <DevCloudBackupSummary id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-summary" label="جداول مختلفة" value={diff.summary.changedTables} />
            <DevCloudBackupSummary id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-summary.2" label="صور مختلفة" value={diff.summary.changedR2Objects} />
            <DevCloudBackupSummary id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-summary.3" label="سجلات zip" value={diff.summary.zipRows} />
            <DevCloudBackupSummary id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-summary.4" label="سجلات السحابة" value={diff.summary.cloudRows} />
          </div>
          {diff.databaseDifferences.length ? (
            <DevCloudBackupDiffList id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-diff-list"
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
            <DevCloudBackupDiffList id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-diff-list.2"
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
        <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.19-tKnRA2", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.19" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.8" className="mt-4 grid gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-detail" label="zip المحدث" value={updatedZip.fileName} ltr />
          <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-detail.2" label="الحجم" value={sizeText(updatedZip.sizeBytes)} />
          <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-detail.3" label="الجداول" value={String(updatedZip.tableCount)} />
          <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-detail.4" label="صور R2" value={String(updatedZip.r2ObjectCount)} />
          <Button id="dev-cloud-backup.dev-cloud-backup-results-card.button" ui={{ uid: "dev-cloud-backup.download-result-F5MGOG", id: "dev-cloud-backup.download-result", kind: "action", action: "download-backup", part: "results" }}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDownload(updatedZip.fileName)}
          >
            <Download id="dev-cloud-backup.dev-cloud-backup-results-card.download" className="h-4 w-4" />
            تنزيل zip المحدث
          </Button>
        </div>
      ) : null}
      {preview ? (
        <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.20-Xas35S", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.20" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.9" className="mt-4 space-y-3">
          <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.21-6qekPV", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.21" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.10" className="grid gap-2 rounded-md bg-muted p-3 text-sm">
            <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-detail.5" label="الوضع" value={preview.mode} ltr />
            <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-detail.6" label="القواعد" value={String(preview.databases.length)} />
            <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-detail.7"
              label="السجلات"
              value={String(preview.databases.reduce((sum, item) => sum + item.rowCount, 0))}
            />
            <DevCloudBackupDetail id="dev-cloud-backup.dev-cloud-backup-results-card.dev-cloud-backup-detail.8" label="صور R2" value={String(preview.r2ObjectCount)} />
          </div>
          {preview.warnings.length ? (
            <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.22-cH0Xaf", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.22" })} id="dev-cloud-backup.dev-cloud-backup-results-card.div.11" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {preview.warnings.slice(0, 10).map((warning) => (
                <div key={warning} {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-results-card.div.23-NyOQu3", id: "dev-cloud-backup.dev-cloud-backup-results-card.div.23" , instance: createOpaqueUiInstanceId("iter-a7a6442303", String(warning))})} dir="ltr">
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
