"use client";

import { formatDateTimeDefault } from "@asol/format-core";

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
  ListPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { NativeCore } from "@asol/native-core";
import { Button } from "@/shared/ui/button";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { usePageSaveOperationScope } from "@/features/page-save/ui";
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
import { persistentSystemLogApiService } from "@/features/system-logs";
import { redactSystemLogText } from "@asol/system-logs-core";
import { cn } from "@/shared/utils";

import { sections, formatForCopy, formatEntryForCopy } from "./logs/SuperAdminLogsPage.log-formatters";
import { CloudErrorsContainer } from "./logs/SuperAdminLogsPage.cloud-errors";

// Clipboard access belongs to Native Core, which picks the native or web
// implementation. It returns a Result rather than throwing, so a copy button on
// a platform without clipboard access stays silent instead of breaking the page.
const clipboard = {
  write: async (text: string): Promise<void> => {
    if (!text) return;
    await NativeCore.writeClipboard({ string: text });
  },
};

export function SuperAdminLogsPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const logs = useSyncExternalStore(
    subscribeToSystemLogs,
    getSystemLogsSnapshot,
    getSystemLogsSnapshot,
  );
  const captureEnabled = useSyncExternalStore(
    subscribeToSystemLogs,
    getSystemLogCaptureEnabledSnapshot,
    getSystemLogCaptureEnabledSnapshot,
  );
  const [active, setActive] = useState<SystemLogLevel>("normal");
  const [copied, setCopied] = useState<SystemLogLevel | null>(null);
  const [persistentLogs, setPersistentLogs] = useState<
    PersistentSystemLogEntry[]
  >([]);
  const [cloudLogs, setCloudLogs] = useState<PersistentSystemLogEntry[]>([]);
  const [cloudLoadState, setCloudLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [cloudLastUpdatedAt, setCloudLastUpdatedAt] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const logOperations = usePageSaveOperationScope({
    id: "super-admin-logs",
    label: "سجلات النظام",
    returnPath: "/super-admin/logs",
    enabled: authorized,
  });

  const stageClearAllLogs = () => {
    logOperations.stage({
      itemId: "system-logs-clear-all",
      kind: "delete",
      label: "حذف السجل المحلي المباشر وكل السجلات المحفوظة",
      execute: async () => {
        clearAllSystemLogs();
        if (!session?.sessionToken) return true;
        try {
          await persistentSystemLogApiService.clear(session.sessionToken);
          setPersistentLogs([]);
          setCloudLogs([]);
          return true;
        } catch (error) {
          console.warn("[SystemLogs] Failed to clear persistent logs.", error);
          return false;
        }
      },
    });
  };

  const stageClearLogSection = (level: SystemLogLevel) => {
    logOperations.stage({
      itemId: `system-logs-clear:${level}`,
      kind: "delete",
      label: `حذف سجلات القسم: ${level}`,
      execute: async () => {
        clearSystemLogs(level);
        if (!session?.sessionToken) return true;
        try {
          await persistentSystemLogApiService.clear(session.sessionToken, level);
          setPersistentLogs((items) =>
            items.filter((item) => item.level !== level),
          );
          if (level === "error") setCloudLogs([]);
          return true;
        } catch (error) {
          console.warn(
            "[SystemLogs] Failed to clear persistent log section.",
            error,
          );
          return false;
        }
      },
    });
  };
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [summary, setSummary] = useState<{
    totalErrors: number;
    lastHourErrors: number;
    topFeatures: Array<{ feature: string; count: number }>;
  } | null>(null);

  useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
  }, [authorized, isLoading, router, session]);

  useEffect(() => {
    const sessionToken = session?.sessionToken;
    if (!authorized || !sessionToken) return;
    let cancelled = false;
    const load = () => {
      setCloudLoadState("loading");
      void Promise.allSettled([
        persistentSystemLogApiService.list(sessionToken, {
          limit: 500,
          query: query || undefined,
          platform:
            platform === "all"
              ? undefined
              : (platform as "web" | "android" | "ios" | "server"),
        }),
        persistentSystemLogApiService.list(sessionToken, {
          limit: 1000,
          origin: "cloud",
          level: "error",
        }),
        persistentSystemLogApiService.summary(sessionToken),
      ]).then(([allResult, cloudResult, summaryResult]) => {
        if (cancelled) return;
        if (allResult.status === "fulfilled") {
          setPersistentLogs(allResult.value);
        } else {
          console.warn(
            "[SystemLogs] Failed to load persistent logs.",
            allResult.reason,
          );
        }
        if (cloudResult.status === "fulfilled") {
          setCloudLogs(cloudResult.value);
          setCloudLoadState("ready");
          setCloudLastUpdatedAt(new Date().toISOString());
        } else {
          setCloudLoadState("error");
          console.warn(
            "[SystemLogs] Failed to load cloud errors.",
            cloudResult.reason,
          );
        }
        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value);
        }
      });
    };
    load();
    const timer = window.setInterval(load, 20_000);
    let stream: EventSource | null = null;
    if (sessionToken) {
      stream = persistentSystemLogApiService.openStream(
        sessionToken,
        new Date(Date.now() - 60 * 60 * 1_000).toISOString(),
      );
      stream.addEventListener("log", () => load());
    }
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stream?.close();
    };
  }, [authorized, platform, query, refreshKey, session]);

  const allLogs = useMemo<SystemLogEntry[]>(
    () => [
      ...logs,
      ...persistentLogs.map((entry, index) => ({
        id: -1 - index,
        fingerprint: `persistent:${entry.fingerprint}`,
        level: entry.level,
        source: entry.source,
        consoleMethod: entry.consoleMethod || entry.source,
        message: entry.message,
        firstOccurredAt: entry.firstOccurredAt,
        lastOccurredAt: entry.lastOccurredAt,
        occurrences: entry.occurrences,
        page: entry.page,
        platform: entry.platform,
        errorName: entry.errorName,
        sourceFile: entry.sourceFile,
        sourceLine: entry.sourceLine,
        sourceColumn: entry.sourceColumn,
        userAgent: entry.userAgent ?? "",
        feature: entry.feature,
        operation: entry.operation,
        stack: entry.stack,
      })),
    ],
    [logs, persistentLogs],
  );

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        sections.map(({ level }) => [
          level,
          allLogs.filter((entry) => entry.level === level),
        ]),
      ) as Record<SystemLogLevel, SystemLogEntry[]>,
    [allLogs],
  );

  if (isLoading || !authorized) {
    return (
      <main id="super-admin.super-admin-logs-page.main" className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق من الصلاحيات…
      </main>
    );
  }

  const section = sections.find((item) => item.level === active)!;
  const current = grouped[active];
  const Icon = section.icon;

  const copySection = async () => {
    await clipboard.write(formatForCopy(current));
    setCopied(active);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const copyEntry = async (entry: SystemLogEntry) => {
    await clipboard.write(formatEntryForCopy(entry));
  };

  return (
    <main id="super-admin.super-admin-logs-page.main.2" className="container mx-auto max-w-7xl px-4 py-8" dir="rtl">
      <header id="super-admin.super-admin-logs-page.header" className="mb-6 flex flex-wrap items-start gap-3">
        <div id="super-admin.super-admin-logs-page.div" className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck id="super-admin.super-admin-logs-page.shield-check" className="h-6 w-6" />
        </div>
        <div id="super-admin.super-admin-logs-page.div.2" className="me-auto">
          <p id="super-admin.super-admin-logs-page.p" className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 id="super-admin.super-admin-logs-page.h1" className="text-2xl font-bold">سجل النظام المباشر</h1>
          <p id="super-admin.super-admin-logs-page.p.2" className="mt-1 text-sm text-muted-foreground">
            يجمع السجل المحلي المباشر والسجلات المحفوظة، مع فصل أخطاء السحابة
            الموثقة أدناه.
          </p>
        </div>
        <div id="super-admin.super-admin-logs-page.div.3" className="flex items-center gap-2 rounded-xl border bg-card p-2">
          <Button id="super-admin.super-admin-logs-page.button" ui={{ uid: "super-admin.logs.toggle-capture-us09GH", id: "super-admin.logs.toggle-capture", kind: "action", action: "toggle-capture", part: "toolbar" }}
            type="button"
            size="icon"
            variant={captureEnabled ? "secondary" : "outline"}
            onClick={() => setSystemLogCaptureEnabled(!captureEnabled)}
            aria-label={captureEnabled ? "إيقاف الالتقاط" : "تشغيل الالتقاط"}
          >
            {captureEnabled ? (
              <Pause id="super-admin.super-admin-logs-page.pause" className="h-4 w-4" />
            ) : (
              <Play id="super-admin.super-admin-logs-page.play" className="h-4 w-4" />
            )}
          </Button>
          <Button id="super-admin.super-admin-logs-page.button.2" ui={{ uid: "super-admin.logs.clear-all-nzqW6R", id: "super-admin.logs.clear-all", kind: "action", action: "stage-clear-all-logs", part: "toolbar" }}
            type="button"
            size="icon"
            variant="outline"
            onClick={stageClearAllLogs}
            disabled={!allLogs.length}
            aria-label="إضافة حذف جميع السجلات إلى الحفظ"
          >
            <ListPlus id="super-admin.super-admin-logs-page.list-plus" className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {summary && (
        <section id="super-admin.super-admin-logs-page.section" className="mb-6 grid gap-3 sm:grid-cols-3">
          <article id="super-admin.super-admin-logs-page.article" className="rounded-xl border bg-card p-4">
            <p id="super-admin.super-admin-logs-page.p.3" className="text-xs text-muted-foreground">إجمالي الأخطاء المحفوظة</p>
            <p id="super-admin.super-admin-logs-page.p.4" className="text-2xl font-bold">{summary.totalErrors}</p>
          </article>
          <article id="super-admin.super-admin-logs-page.article.2" className="rounded-xl border bg-card p-4">
            <p id="super-admin.super-admin-logs-page.p.5" className="text-xs text-muted-foreground">أخطاء آخر ساعة</p>
            <p id="super-admin.super-admin-logs-page.p.6" className="text-2xl font-bold text-destructive">
              {summary.lastHourErrors}
            </p>
          </article>
          <article id="super-admin.super-admin-logs-page.article.3" className="rounded-xl border bg-card p-4">
            <p id="super-admin.super-admin-logs-page.p.7" className="text-xs text-muted-foreground">أكثر الميزات تأثرًا</p>
            <p id="super-admin.super-admin-logs-page.p.8" className="mt-1 text-sm font-mono" dir="ltr">
              {summary.topFeatures.length
                ? summary.topFeatures
                    .map((item) => `${item.feature} (${item.count})`)
                    .join(" · ")
                : "لا توجد بيانات"}
            </p>
          </article>
        </section>
      )}

      <div id="super-admin.super-admin-logs-page.div.4" className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <label id="super-admin.super-admin-logs-page.label" className="relative">
          <Search id="super-admin.super-admin-logs-page.search" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input id="super-admin.super-admin-logs-page.input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في الرسائل والمسارات والميزات..."
            className="asol-input-decorated-start h-10 w-full rounded-md border bg-background pe-3 text-sm"
          />
        </label>
        <select id="super-admin.super-admin-logs-page.select"
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">كل المنصات</option>
          <option value="web">Web</option>
          <option value="android">Android</option>
          <option value="ios">iOS</option>
          <option value="server">Server</option>
        </select>
      </div>

      <CloudErrorsContainer
        logs={cloudLogs}
        loadState={cloudLoadState}
        lastUpdatedAt={cloudLastUpdatedAt}
        onRefresh={() => setRefreshKey((value) => value + 1)}
      />

      <div id="super-admin.super-admin-logs-page.div.5" className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        {sections.map((item) => {
          const TabIcon = item.icon;
          return (
            <button
              key={item.level}
              type="button"
              onClick={() => setActive(item.level)}
              className={cn(
                "min-w-0 rounded-xl border bg-card p-2.5 text-start transition-colors sm:p-4",
                active === item.level &&
                  "border-primary ring-2 ring-primary/20",
              )}
            >
              <div className="flex min-w-0 items-center justify-between gap-1.5 sm:gap-3">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold sm:gap-2">
                  <TabIcon
                    className={cn(
                      "h-4 w-4 shrink-0 sm:h-5 sm:w-5",
                      item.color,
                    )}
                  />
                  <span className="truncate text-sm sm:text-base">
                    {item.title}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold sm:px-2.5 sm:py-1">
                  {grouped[item.level].length}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <section id="super-admin.super-admin-logs-page.section.2" className="rounded-xl border bg-card">
        <div id="super-admin.super-admin-logs-page.div.6" className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 id="super-admin.super-admin-logs-page.h2" className="flex items-center gap-2 font-semibold">
            <Icon className={cn("h-5 w-5", section.color)} />
            {section.title}
          </h2>
          <div id="super-admin.super-admin-logs-page.div.7" className="flex gap-2">
            <Button id="super-admin.super-admin-logs-page.button.3" ui={{ uid: "super-admin.logs.copy-section-0J9YPC", id: "super-admin.logs.copy-section", kind: "action", action: "copy-section", part: "section-toolbar" }}
              type="button"
              size="icon"
              variant="outline"
              disabled={!current.length}
              onClick={() => void copySection()}
              aria-label="نسخ القسم"
            >
              <ClipboardCopy id="super-admin.super-admin-logs-page.clipboard-copy" className="h-4 w-4" />
            </Button>
            <Button id="super-admin.super-admin-logs-page.button.4" ui={{ uid: "super-admin.logs.clear-section-otioP7", id: "super-admin.logs.clear-section", kind: "action", action: "stage-clear-section", part: "section-toolbar" }}
              type="button"
              size="icon"
              variant="outline"
              disabled={!current.length}
              onClick={() => stageClearLogSection(active)}
              aria-label="إضافة حذف القسم إلى الحفظ"
            >
              <ListPlus id="super-admin.super-admin-logs-page.list-plus.2" className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div id="super-admin.super-admin-logs-page.div.8" className="max-h-[65vh] overflow-auto p-3">
          {current.length ? (
            <div id="super-admin.super-admin-logs-page.div.9" className="space-y-3">
              {[...current].reverse().map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-lg border bg-background p-3 text-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div
                      className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      <time aria-label="آخر ظهور">
                        {formatDateTimeDefault(entry.lastOccurredAt)}
                      </time>
                      <span>{entry.platform}</span>
                      <code>{entry.consoleMethod}</code>
                      <code>{entry.page}</code>
                      {typeof entry.id === "number" && entry.id < 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                          محفوظ
                        </span>
                      )}
                      {entry.occurrences > 1 && (
                        <span
                          className="rounded-full bg-muted px-2 py-0.5 font-bold"
                          aria-label="عدد مرات التكرار"
                        >
                          ×{entry.occurrences}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => void copyEntry(entry)}
                      aria-label="نسخ هذا السجل"
                            >
                      <ClipboardCopy className="h-4 w-4" />
                    </Button>
                  </div>
                  <pre
                    className="whitespace-pre-wrap break-words font-mono text-xs leading-6"
                    dir="ltr"
                  >
                    {entry.message}
                  </pre>
                  {(entry.level === "warning" || entry.level === "error") && (
                    <dl
                      className="mt-3 grid gap-2 rounded-md bg-muted/40 p-3 text-xs sm:grid-cols-2"
                      dir="ltr"
                    >
                      <div>
                        <dt className="text-muted-foreground">النوع</dt>
                        <dd className="font-mono">
                          {entry.errorName ?? "غير محدد"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">عدد التكرار</dt>
                        <dd>{entry.occurrences}</dd>
                      </div>
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
                        <dd>
                          {formatDateTimeDefault(entry.firstOccurredAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          آخر ظهور
                        </dt>
                        <dd>
                          {formatDateTimeDefault(entry.lastOccurredAt)}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">المصدر</dt>
                        <dd className="break-all font-mono">
                          {entry.sourceFile
                            ? `${entry.sourceFile}:${entry.sourceLine ?? "?"}:${entry.sourceColumn ?? "?"}`
                            : entry.page}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">وكيل المستخدم</dt>
                        <dd className="break-all font-mono">
                          {entry.userAgent}
                        </dd>
                      </div>
                    </dl>
                  )}
                  {entry.stack && (
                    <details className="mt-2">
                      <summary className="text-xs font-medium text-primary">
                        تتبع المكدس
                      </summary>
                      <pre
                        className="mt-2 whitespace-pre-wrap break-words border-t pt-2 font-mono text-xs"
                        dir="ltr"
                      >
                        {entry.stack}
                      </pre>
                    </details>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p id="super-admin.super-admin-logs-page.p.9" className="py-12 text-center text-sm text-muted-foreground">
              {section.empty}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
