import { History, ListPlus, ShieldCheck } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { dateText } from "./data-health-labels";
import type { HistoryResponse } from "./data-health-page-types";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.14-y2PSrh", id: "data-health.data-health-history-panel.div.14" })} id="data-health.data-health-history-panel.div" className="grid gap-4 xl:grid-cols-2">
      <section {...uiAttributes({ uid: "data-health.data-health-history-panel.section.4-0aXW59", id: "data-health.data-health-history-panel.section.4" })} id="data-health.data-health-history-panel.section" className="overflow-hidden rounded-md border bg-surface">
        <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.15-J6j6Kw", id: "data-health.data-health-history-panel.div.15" })} id="data-health.data-health-history-panel.div.2" className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.16-F5RP6G", id: "data-health.data-health-history-panel.div.16" })} id="data-health.data-health-history-panel.div.3" className="flex items-center gap-2 font-semibold">
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
        <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.17-Dj5GLV", id: "data-health.data-health-history-panel.div.17" })} id="data-health.data-health-history-panel.div.4" className="divide-y">
          {history.runs.map((run) => (
            <div key={run.id} {...uiAttributes({ uid: "data-health.data-health-history-panel.div.18-gV49Ri", id: "data-health.data-health-history-panel.div.18" })} className="grid grid-cols-[1fr_auto] gap-2 p-3 text-sm">
              <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.19-xHgfs6", id: "data-health.data-health-history-panel.div.19" })}>
                <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.20-BYK0j7", id: "data-health.data-health-history-panel.div.20" })}>{dateText(run.completedAt || run.startedAt)}</div>
                <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.21-65i1fD", id: "data-health.data-health-history-panel.div.21" })} className="mt-1 text-xs text-on-surface-variant">
                  {run.scannedRecords} سجل، {run.total} مشكلة، {run.critical} حرجة
                </div>
              </div>
              <span {...uiAttributes({ uid: "data-health.data-health-history-panel.span-wXoLy6", id: "data-health.data-health-history-panel.span" })} className="text-xs text-on-surface-variant">{run.durationMs} ms</span>
            </div>
          ))}
          {history.runs.length === 0 ? (
            <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.22-6F2I7O", id: "data-health.data-health-history-panel.div.22" })} id="data-health.data-health-history-panel.div.5" className="p-6 text-center text-sm text-on-surface-variant">
              لا يوجد سجل بعد.
            </div>
          ) : null}
        </div>
      </section>
      <section {...uiAttributes({ uid: "data-health.data-health-history-panel.section.5-6q0g0D", id: "data-health.data-health-history-panel.section.5" })} id="data-health.data-health-history-panel.section.2" className="overflow-hidden rounded-md border bg-surface">
        <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.23-K0XMI0", id: "data-health.data-health-history-panel.div.23" })} id="data-health.data-health-history-panel.div.6" className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.24-2JTW2n", id: "data-health.data-health-history-panel.div.24" })} id="data-health.data-health-history-panel.div.7" className="flex items-center gap-2 font-semibold">
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
        <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.25-uNDiS1", id: "data-health.data-health-history-panel.div.25" })} id="data-health.data-health-history-panel.div.8" className="divide-y">
          {history.audit.map((entry) => (
            <div key={entry.id} {...uiAttributes({ uid: "data-health.data-health-history-panel.div.26-qUmo0J", id: "data-health.data-health-history-panel.div.26" })} className="p-3 text-sm">
              <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.27-Vpj0TZ", id: "data-health.data-health-history-panel.div.27" })} className="flex items-center justify-between gap-2">
                <span {...uiAttributes({ uid: "data-health.data-health-history-panel.span.2-FxIU3v", id: "data-health.data-health-history-panel.span.2" })}>{entry.action}</span>
                <span {...uiAttributes({ uid: "data-health.data-health-history-panel.span.3-VAC69R", id: "data-health.data-health-history-panel.span.3" })} className={entry.status === "cleaned" ? "text-green-700" : "text-amber-700"}>
                  {entry.status === "cleaned" ? "تم" : "تم التجاوز"}
                </span>
              </div>
              <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.28-ya62zI", id: "data-health.data-health-history-panel.div.28" })} className="mt-1 break-all text-xs text-on-surface-variant" dir="ltr">
                {entry.recordId}
              </div>
              <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.29-WoS3Q0", id: "data-health.data-health-history-panel.div.29" })} className="mt-1 text-xs text-on-surface-variant">
                {dateText(entry.createdAt)}، المسؤول {entry.adminUid}
              </div>
            </div>
          ))}
          {history.audit.length === 0 ? (
            <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.30-23NEcM", id: "data-health.data-health-history-panel.div.30" })} id="data-health.data-health-history-panel.div.9" className="p-6 text-center text-sm text-on-surface-variant">
              لم تُنفذ عمليات تنظيف بعد.
            </div>
          ) : null}
        </div>
      </section>
      <section {...uiAttributes({ uid: "data-health.data-health-history-panel.section.6-Uo9E3i", id: "data-health.data-health-history-panel.section.6" })} id="data-health.data-health-history-panel.section.3" className="overflow-hidden rounded-md border bg-surface xl:col-span-2">
        <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.31-Y0JS2H", id: "data-health.data-health-history-panel.div.31" })} id="data-health.data-health-history-panel.div.10" className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.32-roJqr3", id: "data-health.data-health-history-panel.div.32" })} id="data-health.data-health-history-panel.div.11" className="flex items-center gap-2 font-semibold">
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
        <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.33-9cPNoz", id: "data-health.data-health-history-panel.div.33" })} id="data-health.data-health-history-panel.div.12" className="divide-y">
          {history.quarantine.map((entry) => (
            <div key={entry.id} {...uiAttributes({ uid: "data-health.data-health-history-panel.div.34-AY23W4", id: "data-health.data-health-history-panel.div.34" })} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.35-ytWi0h", id: "data-health.data-health-history-panel.div.35" })} className="min-w-0 flex-1">
                <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.36-xBq5tG", id: "data-health.data-health-history-panel.div.36" })} className="font-medium">
                  {entry.resourceType === "image" ? "ملف صورة" : "سجل"} في الحجر
                </div>
                <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.37-a9nx0O", id: "data-health.data-health-history-panel.div.37" })} className="mt-1 break-all text-xs text-on-surface-variant" dir="ltr">
                  {entry.resourceKey || `${entry.database}.${entry.table}:${entry.recordId}`}
                </div>
                <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.38-6TgEKR", id: "data-health.data-health-history-panel.div.38" })} className="mt-1 text-xs text-on-surface-variant">
                  مؤهل للحذف {dateText(entry.eligibleForDeletionAt)}
                </div>
              </div>
              <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.39-2w0qM8", id: "data-health.data-health-history-panel.div.39" })} className="flex gap-2">
                <Button ui={{ uid: "data-health.data-health-history-panel.button.4-ZHo5iu", id: "data-health.data-health-history-panel.button.4" }} size="sm" variant="outline" onClick={() => void onRelease(entry.id)}>
                  إخراج من الحجر
                </Button>
                {entry.resourceType === "image" ? (
                  <Button ui={{ uid: "data-health.data-health-history-panel.button.5-I8eTuI", id: "data-health.data-health-history-panel.button.5" }}
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
            <div {...uiAttributes({ uid: "data-health.data-health-history-panel.div.40-RZ6G5K", id: "data-health.data-health-history-panel.div.40" })} id="data-health.data-health-history-panel.div.13" className="p-6 text-center text-sm text-on-surface-variant">
              لا توجد عناصر في الحجر.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
