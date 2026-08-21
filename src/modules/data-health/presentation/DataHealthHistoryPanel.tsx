import { History, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { dateText } from "./data-health-labels";
import type { HistoryResponse } from "./data-health-page-types";

export function DataHealthHistoryPanel({
  history,
  onRelease,
  onDeleteImage,
  onClearQuarantine,
  onClearRunHistory,
  onClearCleanupAudit,
}: {
  history: HistoryResponse;
  onRelease: (id: string) => Promise<void>;
  onDeleteImage: (id: string) => Promise<void>;
  onClearQuarantine: () => Promise<void>;
  onClearRunHistory: () => Promise<void>;
  onClearCleanupAudit: () => Promise<void>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="overflow-hidden rounded-md border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2 font-semibold">
            <History className="h-4 w-4" />
            سجل الفحوصات
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={history.runs.length === 0}
            onClick={() => void onClearRunHistory()}
          >
            <Trash2 className="h-4 w-4" />
            حذف السجل
          </Button>
        </div>
        <div className="divide-y">
          {history.runs.map((run) => (
            <div key={run.id} className="grid grid-cols-[1fr_auto] gap-2 p-3 text-sm">
              <div>
                <div>{dateText(run.completedAt || run.startedAt)}</div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  {run.scannedRecords} سجل، {run.total} مشكلة، {run.critical} حرجة
                </div>
              </div>
              <span className="text-xs text-on-surface-variant">{run.durationMs} ms</span>
            </div>
          ))}
          {history.runs.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              لا يوجد سجل بعد.
            </div>
          ) : null}
        </div>
      </section>
      <section className="overflow-hidden rounded-md border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            تدقيق التنظيف
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={history.audit.length === 0}
            onClick={() => void onClearCleanupAudit()}
          >
            <Trash2 className="h-4 w-4" />
            حذف التدقيق
          </Button>
        </div>
        <div className="divide-y">
          {history.audit.map((entry) => (
            <div key={entry.id} className="p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>{entry.action}</span>
                <span className={entry.status === "cleaned" ? "text-green-700" : "text-amber-700"}>
                  {entry.status === "cleaned" ? "تم" : "تم التجاوز"}
                </span>
              </div>
              <div className="mt-1 break-all text-xs text-on-surface-variant" dir="ltr">
                {entry.recordId}
              </div>
              <div className="mt-1 text-xs text-on-surface-variant">
                {dateText(entry.createdAt)}، المسؤول {entry.adminUid}
              </div>
            </div>
          ))}
          {history.audit.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              لم تُنفذ عمليات تنظيف بعد.
            </div>
          ) : null}
        </div>
      </section>
      <section className="overflow-hidden rounded-md border bg-surface xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            الحجر الصحي
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={history.quarantine.length === 0}
            onClick={() => void onClearQuarantine()}
          >
            <Trash2 className="h-4 w-4" />
            تنظيف الحجر
          </Button>
        </div>
        <div className="divide-y">
          {history.quarantine.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {entry.resourceType === "image" ? "ملف صورة" : "سجل"} في الحجر
                </div>
                <div className="mt-1 break-all text-xs text-on-surface-variant" dir="ltr">
                  {entry.resourceKey || `${entry.database}.${entry.table}:${entry.recordId}`}
                </div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  مؤهل للحذف {dateText(entry.eligibleForDeletionAt)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void onRelease(entry.id)}>
                  إخراج من الحجر
                </Button>
                {entry.resourceType === "image" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!entry.eligible}
                    onClick={() => void onDeleteImage(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف فعلي
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {history.quarantine.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              لا توجد عناصر في الحجر.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
