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
    <section id="super-admin.logs.super-admin-logs-page.cloud-errors.section" className="mb-6 overflow-hidden rounded-xl border border-destructive/30 bg-card">
      <div id="super-admin.logs.super-admin-logs-page.cloud-errors.div" className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 p-4">
        <div id="super-admin.logs.super-admin-logs-page.cloud-errors.div.2">
          <h2 id="super-admin.logs.super-admin-logs-page.cloud-errors.h2" className="flex items-center gap-2 font-bold text-destructive">
            <CloudAlert id="super-admin.logs.super-admin-logs-page.cloud-errors.cloud-alert" className="h-5 w-5" />
            أخطاء السحابة
          </h2>
          <p id="super-admin.logs.super-admin-logs-page.cloud-errors.p" className="mt-1 text-xs text-muted-foreground">
            أخطاء موثقة من الخادم فقط. يتم تحديثها تلقائيًا كل 20 ثانية.
            {lastUpdatedAt && (
              <span id="super-admin.logs.super-admin-logs-page.cloud-errors.span" className="ms-1">
                آخر تحديث: {formatAdminClock(lastUpdatedAt, { seconds: true })}
              </span>
            )}
          </p>
        </div>
        <div id="super-admin.logs.super-admin-logs-page.cloud-errors.div.3" className="flex items-center gap-2">
          <span id="super-admin.logs.super-admin-logs-page.cloud-errors.span.2" className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
            {filtered.length} / {cloudErrors.length}
          </span>
          <Button id="super-admin.logs.super-admin-logs-page.cloud-errors.button"
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
          <Button id="super-admin.logs.super-admin-logs-page.cloud-errors.button.2"
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

      <div id="super-admin.logs.super-admin-logs-page.cloud-errors.div.4" className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_180px_220px]">
        <label id="super-admin.logs.super-admin-logs-page.cloud-errors.label" className="relative">
          <Search id="super-admin.logs.super-admin-logs-page.cloud-errors.search" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input id="super-admin.logs.super-admin-logs-page.cloud-errors.input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في الرسالة أو المسار أو Stack..."
            className="asol-input-decorated-start h-10 w-full rounded-md border bg-background pe-3 text-sm"
          />
        </label>
        <select id="super-admin.logs.super-admin-logs-page.cloud-errors.select"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">كل حالات HTTP</option>
          {[
            ...new Set(
              cloudErrors.map((entry) => String(entry.statusCode ?? "unknown")),
            ),
          ]
            .sort()
            .map((value) => (
              <option key={value} value={value}>
                {value === "unknown" ? "بدون حالة" : value}
              </option>
            ))}
        </select>
        <select id="super-admin.logs.super-admin-logs-page.cloud-errors.select.2"
          value={feature}
          onChange={(event) => setFeature(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">كل الخدمات والميزات</option>
          {features.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {loadState === "error" && (
        <p id="super-admin.logs.super-admin-logs-page.cloud-errors.p.2" className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-800">
          تعذر تحديث أخطاء السحابة. البيانات الظاهرة هي آخر بيانات ناجحة ولم يتم
          حذفها.
        </p>
      )}

      <div id="super-admin.logs.super-admin-logs-page.cloud-errors.div.5" className="max-h-[55vh] overflow-auto p-3">
        {loadState === "loading" && !cloudErrors.length ? (
          <p id="super-admin.logs.super-admin-logs-page.cloud-errors.p.3" className="py-12 text-center text-sm text-muted-foreground">
            جارٍ تحميل أخطاء السحابة…
          </p>
        ) : filtered.length ? (
          <div id="super-admin.logs.super-admin-logs-page.cloud-errors.div.6" className="space-y-3">
            {filtered.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border bg-background p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                        {entry.statusCode ?? "ERROR"}
                      </span>
                      <code dir="ltr">
                        {entry.requestMethod ?? "SERVER"} {cloudSource(entry)}
                      </code>
                      <span
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
                        <span className="rounded bg-muted px-2 py-0.5 font-bold">
                          ×{entry.occurrences}
                        </span>
                      )}
                    </div>
                    <h3 className="font-mono text-sm font-semibold" dir="ltr">
                      {entry.errorName ?? "ServerError"}
                    </h3>
                    <p className="mt-1 break-words text-sm" dir="ltr">
                      {entry.message}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTimeDefault(entry.lastOccurredAt)}
                  </time>
                </div>
                {(entry.messageTruncated || entry.stackTruncated) && (
                  <p className="mt-3 rounded-md bg-amber-500/10 p-2 text-xs text-amber-800">
                    بعض البيانات الأصلية تجاوزت حد التخزين؛ النسخ يحتوي كل
                    البيانات المحفوظة مع توضيح الجزء المقصوص.
                  </p>
                )}
                <details className="mt-3 rounded-md bg-muted/30 p-3">
                  <summary className="text-xs font-semibold text-primary">
                    عرض كل التفاصيل
                  </summary>
                  <dl
                    className="mt-3 grid gap-2 text-xs sm:grid-cols-2"
                    dir="ltr"
                  >
                    <div>
                      <dt className="text-muted-foreground">الميزة</dt>
                      <dd className="font-mono">
                        {entry.feature ?? "غير محدد"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">العملية</dt>
                      <dd className="font-mono">
                        {entry.operation ?? "غير محددة"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        أول ظهور
                      </dt>
                      <dd>{entry.firstOccurredAt}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">آخر ظهور</dt>
                      <dd>{entry.lastOccurredAt}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">إصدار التطبيق</dt>
                      <dd>{entry.appVersion ?? "غير محدد"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">الإصدار الأصلي</dt>
                      <dd>{entry.nativeVersion ?? "غير محدد"}</dd>
                    </div>
                    <div className="sm:col-span-2">
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
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
                  <Button
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
                  <Button
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
          <p id="super-admin.logs.super-admin-logs-page.cloud-errors.p.4" className="py-12 text-center text-sm text-muted-foreground">
            لا توجد أخطاء سحابية مطابقة.
          </p>
        )}
      </div>
    </section>
  );
}
