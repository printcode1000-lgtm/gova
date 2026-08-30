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
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

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
              <option key={value} {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.option.2-m0ObfJ", id: "super-admin.logs.super-admin-logs-page.cloud-errors.option.2" , instance: createOpaqueUiInstanceId("iter-b39e7e4fa3", String(value))})} value={value}>
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
            <option key={value} {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.option.4-DOFrY9", id: "super-admin.logs.super-admin-logs-page.cloud-errors.option.4" , instance: createOpaqueUiInstanceId("iter-b6c3e89b95", String(value))})} value={value}>
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
                key={entry.id} {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.article-Z9GMYF", id: "super-admin.logs.super-admin-logs-page.cloud-errors.article" , instance: createOpaqueUiInstanceId("iter-5191c40ef8", String(entry.id))})}
                className="rounded-lg border bg-background p-4 text-sm"
              >
                <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.13-ZTvUD6", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.13" , instance: createOpaqueUiInstanceId("iter-19cad64b8b", String(entry.id))})} className="flex flex-wrap items-start justify-between gap-3">
                  <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.14-dX59m5", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.14" , instance: createOpaqueUiInstanceId("iter-6cc12e04b2", String(entry.id))})} className="min-w-0">
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.15-B0dYPW", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.15" , instance: createOpaqueUiInstanceId("iter-eb428207e2", String(entry.id))})} className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.span.5-h87KQr", id: "super-admin.logs.super-admin-logs-page.cloud-errors.span.5" , instance: createOpaqueUiInstanceId("iter-30ec874312", String(entry.id))})} className="rounded bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                        {entry.statusCode ?? "ERROR"}
                      </span>
                      <code {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.code-H0tM5W", id: "super-admin.logs.super-admin-logs-page.cloud-errors.code" , instance: createOpaqueUiInstanceId("iter-cdc9d46c66", String(entry.id))})} dir="ltr">
                        {entry.requestMethod ?? "SERVER"} {cloudSource(entry)}
                      </code>
                      <span {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.span.6-BzD2p2", id: "super-admin.logs.super-admin-logs-page.cloud-errors.span.6" , instance: createOpaqueUiInstanceId("iter-38e2357ace", String(entry.id))})}
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
                        <span {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.span.7-8cOEV9", id: "super-admin.logs.super-admin-logs-page.cloud-errors.span.7" , instance: createOpaqueUiInstanceId("iter-ce51eee1f5", String(entry.id))})} className="rounded bg-muted px-2 py-0.5 font-bold">
                          ×{entry.occurrences}
                        </span>
                      )}
                    </div>
                    <h3 {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.h3-3V3hVR", id: "super-admin.logs.super-admin-logs-page.cloud-errors.h3" , instance: createOpaqueUiInstanceId("iter-ff038254c3", String(entry.id))})} className="font-mono text-sm font-semibold" dir="ltr">
                      {entry.errorName ?? "ServerError"}
                    </h3>
                    <p {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.p.8-kpQ62s", id: "super-admin.logs.super-admin-logs-page.cloud-errors.p.8" , instance: createOpaqueUiInstanceId("iter-1cf4f38e3f", String(entry.id))})} className="mt-1 break-words text-sm" dir="ltr">
                      {entry.message}
                    </p>
                  </div>
                  <time {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.time-YU9QYe", id: "super-admin.logs.super-admin-logs-page.cloud-errors.time" , instance: createOpaqueUiInstanceId("iter-23209daf92", String(entry.id))})} className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTimeDefault(entry.lastOccurredAt)}
                  </time>
                </div>
                {(entry.messageTruncated || entry.stackTruncated) && (
                  <p {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.p.9-tfO0oU", id: "super-admin.logs.super-admin-logs-page.cloud-errors.p.9" , instance: createOpaqueUiInstanceId("iter-834c2da5a6", String(entry.id))})} className="mt-3 rounded-md bg-amber-500/10 p-2 text-xs text-amber-800">
                    بعض البيانات الأصلية تجاوزت حد التخزين؛ النسخ يحتوي كل
                    البيانات المحفوظة مع توضيح الجزء المقصوص.
                  </p>
                )}
                <details {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.details-X9LG3l", id: "super-admin.logs.super-admin-logs-page.cloud-errors.details" , instance: createOpaqueUiInstanceId("iter-44d4196d26", String(entry.id))})} className="mt-3 rounded-md bg-muted/30 p-3">
                  <summary {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.summary-f9ZpdD", id: "super-admin.logs.super-admin-logs-page.cloud-errors.summary" , instance: createOpaqueUiInstanceId("iter-4b270936bc", String(entry.id))})} className="text-xs font-semibold text-primary">
                    عرض كل التفاصيل
                  </summary>
                  <dl {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dl-IA6iFg", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dl" , instance: createOpaqueUiInstanceId("iter-4cd41154df", String(entry.id))})}
                    className="mt-3 grid gap-2 text-xs sm:grid-cols-2"
                    dir="ltr"
                  >
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.16-yWQQ5m", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.16" , instance: createOpaqueUiInstanceId("iter-5ee4fcd35b", String(entry.id))})}>
                      <dt {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dt-zCp5lU", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dt" , instance: createOpaqueUiInstanceId("iter-b29a46bd6c", String(entry.id))})} className="text-muted-foreground">الميزة</dt>
                      <dd {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dd-DJ2IG0", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dd" , instance: createOpaqueUiInstanceId("iter-cf868af2c7", String(entry.id))})} className="font-mono">
                        {entry.feature ?? "غير محدد"}
                      </dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.17-6rLfE1", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.17" , instance: createOpaqueUiInstanceId("iter-ae15a6950b", String(entry.id))})}>
                      <dt {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.2-gLDG70", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.2" , instance: createOpaqueUiInstanceId("iter-9092b16cb9", String(entry.id))})} className="text-muted-foreground">العملية</dt>
                      <dd {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.2-GH2OKn", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.2" , instance: createOpaqueUiInstanceId("iter-f9f1de0781", String(entry.id))})} className="font-mono">
                        {entry.operation ?? "غير محددة"}
                      </dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.18-YYc5gD", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.18" , instance: createOpaqueUiInstanceId("iter-5b2a9b6935", String(entry.id))})}>
                      <dt {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.3-n6eDPQ", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.3" , instance: createOpaqueUiInstanceId("iter-e77474e868", String(entry.id))})} className="text-muted-foreground">
                        أول ظهور
                      </dt>
                      <dd {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.3-VJW4Oc", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.3" , instance: createOpaqueUiInstanceId("iter-907178567c", String(entry.id))})}>{entry.firstOccurredAt}</dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.19-qsRB19", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.19" , instance: createOpaqueUiInstanceId("iter-23006b3f52", String(entry.id))})}>
                      <dt {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.4-Z3K3LI", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.4" , instance: createOpaqueUiInstanceId("iter-897725127f", String(entry.id))})} className="text-muted-foreground">آخر ظهور</dt>
                      <dd {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.4-sX1MOC", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.4" , instance: createOpaqueUiInstanceId("iter-aac35e18ec", String(entry.id))})}>{entry.lastOccurredAt}</dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.20-4qRptL", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.20" , instance: createOpaqueUiInstanceId("iter-36c84dec37", String(entry.id))})}>
                      <dt {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.5-PrEY1d", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.5" , instance: createOpaqueUiInstanceId("iter-901579c4ba", String(entry.id))})} className="text-muted-foreground">إصدار التطبيق</dt>
                      <dd {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.5-TFTlz2", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.5" , instance: createOpaqueUiInstanceId("iter-6c79179e6e", String(entry.id))})}>{entry.appVersion ?? "غير محدد"}</dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.21-6fJK60", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.21" , instance: createOpaqueUiInstanceId("iter-e19ed64e5d", String(entry.id))})}>
                      <dt {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.6-2FqIJJ", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.6" , instance: createOpaqueUiInstanceId("iter-c80a4f403a", String(entry.id))})} className="text-muted-foreground">الإصدار الأصلي</dt>
                      <dd {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.6-eOaSo0", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.6" , instance: createOpaqueUiInstanceId("iter-04ad8d93ae", String(entry.id))})}>{entry.nativeVersion ?? "غير محدد"}</dd>
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.22-3W5Qdm", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.22" , instance: createOpaqueUiInstanceId("iter-d3d059eb46", String(entry.id))})} className="sm:col-span-2">
                      <dt {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.7-16kAK2", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dt.7" , instance: createOpaqueUiInstanceId("iter-4dbfe9903f", String(entry.id))})} className="text-muted-foreground">البصمة</dt>
                      <dd {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.7-L5s7D6", id: "super-admin.logs.super-admin-logs-page.cloud-errors.dd.7" , instance: createOpaqueUiInstanceId("iter-33e4c85ef8", String(entry.id))})} className="break-all font-mono">
                        {entry.fingerprint}
                      </dd>
                    </div>
                  </dl>
                  {entry.stack && (
                    <pre {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.pre-GXOZ4P", id: "super-admin.logs.super-admin-logs-page.cloud-errors.pre" , instance: createOpaqueUiInstanceId("iter-3bc595bf80", String(entry.id))})}
                      className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap border-t pt-3 font-mono text-xs"
                      dir="ltr"
                    >
                      {entry.stack}
                    </pre>
                  )}
                </details>
                <div {...uiAttributes({ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.div.23-BGfqT2", id: "super-admin.logs.super-admin-logs-page.cloud-errors.div.23" , instance: createOpaqueUiInstanceId("iter-da42a5c9bb", String(entry.id))})} className="mt-3 flex flex-wrap gap-2">
                  <Button ui={{ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.button.3-QfAg9q", id: "super-admin.logs.super-admin-logs-page.cloud-errors.button.3" , instance: createOpaqueUiInstanceId("iter-9e02777a23", String(entry.id))}}
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
                  <Button ui={{ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.button.4-RTwHa5", id: "super-admin.logs.super-admin-logs-page.cloud-errors.button.4" , instance: createOpaqueUiInstanceId("iter-60171bcfc9", String(entry.id))}}
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
                  <Button ui={{ uid: "super-admin.logs.super-admin-logs-page.cloud-errors.button.5-2Fytk9", id: "super-admin.logs.super-admin-logs-page.cloud-errors.button.5" , instance: createOpaqueUiInstanceId("iter-b41dfe6679", String(entry.id))}}
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
