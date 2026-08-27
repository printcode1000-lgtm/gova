import { History, ListPlus, ShieldCheck } from "lucide-react";

import { Button } from "@/shared/ui/button";

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
  onDeleteImage: (id: string) => void;
  onClearQuarantine: () => void;
  onClearRunHistory: () => void;
  onClearCleanupAudit: () => void;
}) {
  return (
    <div id="data-health.data-health-history-panel.div" className="grid gap-4 xl:grid-cols-2">
      <section id="data-health.data-health-history-panel.section" className="overflow-hidden rounded-md border bg-surface">
        <div id="data-health.data-health-history-panel.div.2" className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div id="data-health.data-health-history-panel.div.3" className="flex items-center gap-2 font-semibold">
            <History id="data-health.data-health-history-panel.history" className="h-4 w-4" />
            سجل الفحوصات
          </div>
          <Button id="data-health.data-health-history-panel.button" ui={{ uid: "data-health.history.clear-runs-54IYBD", id: "data-health.history.clear-runs", kind: "action", action: "clear-run-history", part: "history" }}
            type="button"
            size="sm"
            variant="outline"
            disabled={history.runs.length === 0}
            onClick={onClearRunHistory}
          >
            <ListPlus id="data-health.data-health-history-panel.list-plus" className="h-4 w-4" />
            إضافة حذف السجل للحفظ
          </Button>
        </div>
        <div id="data-health.data-health-history-panel.div.4" className="divide-y">
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
            <div id="data-health.data-health-history-panel.div.5" className="p-6 text-center text-sm text-on-surface-variant">
              لا يوجد سجل بعد.
            </div>
          ) : null}
        </div>
      </section>
      <section id="data-health.data-health-history-panel.section.2" className="overflow-hidden rounded-md border bg-surface">
        <div id="data-health.data-health-history-panel.div.6" className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div id="data-health.data-health-history-panel.div.7" className="flex items-center gap-2 font-semibold">
            <ShieldCheck id="data-health.data-health-history-panel.shield-check" className="h-4 w-4" />
            تدقيق التنظيف
          </div>
          <Button id="data-health.data-health-history-panel.button.2" ui={{ uid: "data-health.history.clear-audit-V4POBR", id: "data-health.history.clear-audit", kind: "action", action: "clear-cleanup-audit", part: "history" }}
            type="button"
            size="sm"
            variant="outline"
            disabled={history.audit.length === 0}
            onClick={onClearCleanupAudit}
          >
            <ListPlus id="data-health.data-health-history-panel.list-plus.2" className="h-4 w-4" />
            إضافة حذف التدقيق للحفظ
          </Button>
        </div>
        <div id="data-health.data-health-history-panel.div.8" className="divide-y">
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
            <div id="data-health.data-health-history-panel.div.9" className="p-6 text-center text-sm text-on-surface-variant">
              لم تُنفذ عمليات تنظيف بعد.
            </div>
          ) : null}
        </div>
      </section>
      <section id="data-health.data-health-history-panel.section.3" className="overflow-hidden rounded-md border bg-surface xl:col-span-2">
        <div id="data-health.data-health-history-panel.div.10" className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div id="data-health.data-health-history-panel.div.11" className="flex items-center gap-2 font-semibold">
            <ShieldCheck id="data-health.data-health-history-panel.shield-check.2" className="h-4 w-4" />
            الحجر الصحي
          </div>
          <Button id="data-health.data-health-history-panel.button.3" ui={{ uid: "data-health.history.clear-quarantine-IWlW3x", id: "data-health.history.clear-quarantine", kind: "action", action: "clear-quarantine", part: "history" }}
            type="button"
            size="sm"
            variant="outline"
            disabled={history.quarantine.length === 0}
            onClick={onClearQuarantine}
          >
            <ListPlus id="data-health.data-health-history-panel.list-plus.3" className="h-4 w-4" />
            إضافة تنظيف الحجر للحفظ
          </Button>
        </div>
        <div id="data-health.data-health-history-panel.div.12" className="divide-y">
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
                    variant="outline"
                    disabled={!entry.eligible}
                    onClick={() => onDeleteImage(entry.id)}
                  >
                    <ListPlus className="h-4 w-4" />
                    إضافة للحفظ
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {history.quarantine.length === 0 ? (
            <div id="data-health.data-health-history-panel.div.13" className="p-6 text-center text-sm text-on-surface-variant">
              لا توجد عناصر في الحجر.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
