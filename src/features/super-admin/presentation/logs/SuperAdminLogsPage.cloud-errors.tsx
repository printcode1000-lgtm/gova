"use client";

import { formatAdminClock, formatDateTimeDefault } from "@asol/format-core";

import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ClipboardCopy,
  CloudAlert,
  FileJson,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/shared/ui/button";
import { NativeCore } from "@asol/native-core";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import {
  clearAllSystemLogs,
  clearSystemLogs,
  getSystemLogCaptureEnabledSnapshot,
  getSystemLogsSnapshot,
  setSystemLogCaptureEnabled,
  subscribeToSystemLogs,
  type SystemLogEntry,
  type SystemLogLevel,
} from "@/features/system-logs";
import type { PersistentSystemLogEntry } from "@/features/system-logs";
import { cn } from "@/shared/utils";
import { redactSystemLogText } from "@asol/system-logs-core";
import { cloudSource, formatCloudEntryForCopy } from "./SuperAdminLogsPage.log-formatters";
import { uiAttributes } from "@asol/ui-registry-core";

// Clipboard access belongs to Native Core, which picks the native or web
// implementation. It returns a Result rather than throwing, so a copy button on
// a platform without clipboard access stays silent instead of breaking the page.
const clipboard = {
  write: async (text: string): Promise<void> => {
    if (!text) return;
    await NativeCore.writeClipboard({ string: text });
  },
};

export function CloudErrorsContainer({
  logs,
  loadState,
  lastUpdatedAt,
  onRefresh,
}: {
  logs: PersistentSystemLogEntry[];
  loadState: "loading" | "ready" | "error";
  lastUpdatedAt: string;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [feature, setFeature] = useState("all");
  const [copyState, setCopyState] = useState("");
  const cloudErrors = useMemo(
    () =>
      logs.filter(
        (entry) => entry.origin === "cloud" && entry.level === "error",
      ),
    [logs],
  );
  const features = useMemo(
    () =>
      [
        ...new Set(cloudErrors.map((entry) => entry.feature).filter(Boolean)),
      ].sort() as string[],
    [cloudErrors],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cloudErrors.filter((entry) => {
      if (status !== "all" && String(entry.statusCode ?? "unknown") !== status)
        return false;
      if (feature !== "all" && entry.feature !== feature) return false;
      if (!normalized) return true;
      return [
        entry.message,
        entry.errorName,
        entry.routeName,
        entry.page,
        entry.feature,
        entry.operation,
        entry.stack,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [cloudErrors, feature, query, status]);
  const copy = async (key: string, value: string) => {
    await clipboard.write(redactSystemLogText(value));
    setCopyState(key);
    window.setTimeout(() => setCopyState(""), 1500);
  };

  return (
    <section {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.section.2-R79xxe", id: "super-admin.logs.super-admin-logs-page.cloud-errors.section.2" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.section" className="mb-6 overflow-hidden rounded-xl border border-destructive/30 bg-card">
      <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.7-Wg2a8l", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.7" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.div" className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 p-4">
        <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.8-FnM7MY", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.8" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.div.2">
          <h2 {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.h2.2-zA8oTZ", id: "super-admin.logs.super-admin-logs-page.cloud-errors.h2.2" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.h2" className="flex items-center gap-2 font-bold text-destructive">
            <CloudAlert id="super-admin.logs.super-admin-logs-page.cloud-errors.cloud-alert" className="h-5 w-5" />
            أخطاء السحابة
          </h2>
          <p {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.p.5-Ik9gKT", id: "super-admin.logs.super-admin-logs-page.cloud-errors.p.5" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.p" className="mt-1 text-xs text-muted-foreground">
            أخطاء موثقة من الخادم فقط. يتم تحديثها تلقائيًا كل 20 ثانية.
            {lastUpdatedAt && (
              <span {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.span.3-Z79BhO", id: "super-admin.logs.super-admin-logs-page.cloud-errors.span.3" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.span" className="ms-1">
                آخر تحديث: {formatAdminClock(lastUpdatedAt, { seconds: true })}
              </span>
            )}
          </p>
        </div>
        <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.9-jzwDF8", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.9" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.div.3" className="flex items-center gap-2">
          <span {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.span.4-1VNNKR", id: "super-admin.logs.super-admin-logs-page.cloud-errors.span.4" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.span.2" className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
            {filtered.length} / {cloudErrors.length}
          </span>
          <Button id="super-admin.logs.super-admin-logs-page.cloud-errors.button" ui={{ uid: "super-admin.cloud-errors.refresh-P5wMi1", id: "super-admin.cloud-errors.refresh", kind: "action", action: "refresh-cloud-errors", part: "toolbar" }}
            type="button"
            size="icon"
            variant="outline"
            disabled={loadState === "loading"}
            onClick={onRefresh}
            aria-label="تحديث أخطاء السحابة"

          >
            <RefreshCw id="super-admin.logs.super-admin-logs-page.cloud-errors.refresh-cw"
              className={cn(
                "h-4 w-4",
                loadState === "loading" && "animate-spin",
              )}
            />
          </Button>
          <Button id="super-admin.logs.super-admin-logs-page.cloud-errors.button.2" ui={{ uid: "super-admin.cloud-errors.copy-all-cZlrH3", id: "super-admin.cloud-errors.copy-all", kind: "action", action: "copy-all-errors", part: "toolbar" }}
            type="button"
            size="sm"
            variant="outline"
            disabled={!filtered.length}
            onClick={() =>
              void copy(
                "all",
                filtered.map(formatCloudEntryForCopy).join("\n\n---\n\n"),
              )
            }
          >
            <ClipboardCopy id="super-admin.logs.super-admin-logs-page.cloud-errors.clipboard-copy" className="me-2 h-4 w-4" />
            {copyState === "all" ? "تم النسخ" : "نسخ النتائج"}
          </Button>
        </div>
      </div>

      <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.10-N9YT2U", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.10" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.div.4" className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_180px_220px]">
        <label {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.label.2-70FKSo", id: "super-admin.logs.super-admin-logs-page.cloud-errors.label.2" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.label" className="relative">
          <Search id="super-admin.logs.super-admin-logs-page.cloud-errors.search" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.input.2-K6B7CJ", id: "super-admin.logs.super-admin-logs-page.cloud-errors.input.2" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في الرسالة أو المسار أو Stack..."
            className="asol-input-decorated-start h-10 w-full rounded-md border bg-background pe-3 text-sm"
          />
        </label>
        <select {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.select.3-USBN2A", id: "super-admin.logs.super-admin-logs-page.cloud-errors.select.3" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.select"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.option-2S1JbA", id: "super-admin.logs.super-admin-logs-page.cloud-errors.option" })} value="all">كل حالات HTTP</option>
          {[
            ...new Set(
              cloudErrors.map((entry) => String(entry.statusCode ?? "unknown")),
            ),
          ]
            .sort()
            .map((value) => (
              <option key={value} {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.option.2-m0ObfJ", id: "super-admin.logs.super-admin-logs-page.cloud-errors.option.2" })} value={value}>
                {value === "unknown" ? "بدون حالة" : value}
              </option>
            ))}
        </select>
        <select {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.select.4-Opq97G", id: "super-admin.logs.super-admin-logs-page.cloud-errors.select.4" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.select.2"
          value={feature}
          onChange={(event) => setFeature(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.option.3-G1tzCo", id: "super-admin.logs.super-admin-logs-page.cloud-errors.option.3" })} value="all">كل الخدمات والميزات</option>
          {features.map((value) => (
            <option key={value} {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.option.4-DOFrY9", id: "super-admin.logs.super-admin-logs-page.cloud-errors.option.4" })} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {loadState === "error" && (
        <p {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.p.6-KZZx87", id: "super-admin.logs.super-admin-logs-page.cloud-errors.p.6" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.p.2" className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-800">
          تعذر تحديث أخطاء السحابة. البيانات الظاهرة هي آخر بيانات ناجحة ولم يتم
          حذفها.
        </p>
      )}

      <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.11-2GRM58", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.11" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.div.5" className="max-h-[55vh] overflow-auto p-3">
        {loadState === "loading" && !cloudErrors.length ? (
          <p {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.p.7-264XZ6", id: "super-admin.logs.super-admin-logs-page.cloud-errors.p.7" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.p.3" className="py-12 text-center text-sm text-muted-foreground">
            جارٍ تحميل أخطاء السحابة…
          </p>
        ) : filtered.length ? (
          <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.12-6cNKKI", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.12" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.div.6" className="space-y-3">
            {filtered.map((entry) => (
              <article
                key={entry.id} {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.article-Z9GMYF", id: "super-admin.logs.super-admin-logs-page.cloud-errors.article" })}
                className="rounded-lg border bg-background p-4 text-sm"
              >
                <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.13-ZTvUD6", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.13" })} className="flex flex-wrap items-start justify-between gap-3">
                  <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.14-dX59m5", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.14" })} className="min-w-0">
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.15-B0dYPW", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.15" })} className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.span.5-h87KQr", id: "super-admin.logs.super-admin-logs-page.cloud-errors.span.5" })} className="rounded bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                        {entry.statusCode ?? "ERROR"}
                      </span>
                      <code dir="ltr">
                        {entry.requestMethod ?? "SERVER"} {cloudSource(entry)}
                      </code>
                      <span {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.span.6-BzD2p2", id: "super-admin.logs.super-admin-logs-page.cloud-errors.span.6" })}
                        className={cn(
                          "rounded px-2 py-0.5 font-bold",
                          entry.trustLevel === "trusted-server"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-amber-500/10 text-amber-700",
                        )}
                      >
                        {entry.trustLevel === "trusted-server"
                          ? "خادم موثوق"
                          : "سجل قديم"}
                      </span>
                      {entry.occurrences > 1 && (
                        <span {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.span.7-8cOEV9", id: "super-admin.logs.super-admin-logs-page.cloud-errors.span.7" })} className="rounded bg-muted px-2 py-0.5 font-bold">
                          ×{entry.occurrences}
                        </span>
                      )}
                    </div>
                    <h3 {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.h3-3V3hVR", id: "super-admin.logs.super-admin-logs-page.cloud-errors.h3" })} className="font-mono text-sm font-semibold" dir="ltr">
                      {entry.errorName ?? "ServerError"}
                    </h3>
                    <p {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.p.8-kpQ62s", id: "super-admin.logs.super-admin-logs-page.cloud-errors.p.8" })} className="mt-1 break-words text-sm" dir="ltr">
                      {entry.message}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTimeDefault(entry.lastOccurredAt)}
                  </time>
                </div>
                {(entry.messageTruncated || entry.stackTruncated) && (
                  <p {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.p.9-tfO0oU", id: "super-admin.logs.super-admin-logs-page.cloud-errors.p.9" })} className="mt-3 rounded-md bg-amber-500/10 p-2 text-xs text-amber-800">
                    بعض البيانات الأصلية تجاوزت حد التخزين؛ النسخ يحتوي كل
                    البيانات المحفوظة مع توضيح الجزء المقصوص.
                  </p>
                )}
                <details className="mt-3 rounded-md bg-muted/30 p-3">
                  <summary {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.summary-f9ZpdD", id: "super-admin.logs.super-admin-logs-page.cloud-errors.summary" })} className="text-xs font-semibold text-primary">
                    عرض كل التفاصيل
                  </summary>
                  <dl
                    className="mt-3 grid gap-2 text-xs sm:grid-cols-2"
                    dir="ltr"
                  >
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.16-yWQQ5m", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.16" })}>
                      <dt className="text-muted-foreground">الميزة</dt>
                      <dd className="font-mono">
                        {entry.feature ?? "غير محدد"}
                      </dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.17-6rLfE1", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.17" })}>
                      <dt className="text-muted-foreground">العملية</dt>
                      <dd className="font-mono">
                        {entry.operation ?? "غير محددة"}
                      </dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.18-YYc5gD", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.18" })}>
                      <dt className="text-muted-foreground">
                        أول ظهور
                      </dt>
                      <dd>{entry.firstOccurredAt}</dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.19-qsRB19", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.19" })}>
                      <dt className="text-muted-foreground">آخر ظهور</dt>
                      <dd>{entry.lastOccurredAt}</dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.20-4qRptL", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.20" })}>
                      <dt className="text-muted-foreground">إصدار التطبيق</dt>
                      <dd>{entry.appVersion ?? "غير محدد"}</dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.21-6fJK60", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.21" })}>
                      <dt className="text-muted-foreground">الإصدار الأصلي</dt>
                      <dd>{entry.nativeVersion ?? "غير محدد"}</dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.22-3W5Qdm", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.22" })} className="sm:col-span-2">
                      <dt className="text-muted-foreground">البصمة</dt>
                      <dd className="break-all font-mono">
                        {entry.fingerprint}
                      </dd>
                    </div>
                  </dl>
                  {entry.stack && (
                    <pre
                      className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap border-t pt-3 font-mono text-xs"
                      dir="ltr"
                    >
                      {entry.stack}
                    </pre>
                  )}
                </details>
                <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.23-BGfqT2", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.23" })} className="mt-3 flex flex-wrap gap-2">
                  <Button ui={{ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.button.3-QfAg9q", id: "super-admin.logs.super-admin-logs-page.cloud-errors.button.3" }}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void copy(
                        `${entry.id}:full`,
                        formatCloudEntryForCopy(entry),
                      )
                    }
                  >
                    <ClipboardCopy className="me-2 h-4 w-4" />
                    {copyState === `${entry.id}:full`
                      ? "تم النسخ"
                      : "نسخ التفاصيل"}
                  </Button>
                  <Button ui={{ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.button.4-RTwHa5", id: "super-admin.logs.super-admin-logs-page.cloud-errors.button.4" }}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void copy(
                        `${entry.id}:json`,
                        JSON.stringify(entry, null, 2),
                      )
                    }
                  >
                    <FileJson className="me-2 h-4 w-4" />
                    {copyState === `${entry.id}:json` ? "تم النسخ" : "نسخ JSON"}
                  </Button>
                  <Button ui={{ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.button.5-2Fytk9", id: "super-admin.logs.super-admin-logs-page.cloud-errors.button.5" }}
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!entry.stack}
                    onClick={() =>
                      void copy(`${entry.id}:stack`, entry.stack ?? "")
                    }
                  >
                    <ClipboardCopy className="me-2 h-4 w-4" />
                    {copyState === `${entry.id}:stack`
                      ? "تم النسخ"
                      : "نسخ Stack"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.p.10-ClE8Un", id: "super-admin.logs.super-admin-logs-page.cloud-errors.p.10" })} id="super-admin.logs.super-admin-logs-page.cloud-errors.p.4" className="py-12 text-center text-sm text-muted-foreground">
            لا توجد أخطاء سحابية مطابقة.
          </p>
        )}
      </div>
    </section>
  );
}
