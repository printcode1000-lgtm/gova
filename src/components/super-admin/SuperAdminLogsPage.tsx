"use client";

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

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import {
  clearAllSystemLogs,
  clearSystemLogs,
  getSystemLogCaptureEnabledSnapshot,
  getSystemLogsSnapshot,
  setSystemLogCaptureEnabled,
  subscribeToSystemLogs,
  type SystemLogEntry,
  type SystemLogLevel,
} from "@/features/system-logs/system-log-store";
import type { PersistentSystemLogEntry } from "@/features/system-logs/entities/persistent-system-log.entity";
import { persistentSystemLogApiService } from "@/features/system-logs/services/persistent-system-log-api-service";
import { redactSystemLogText } from "@/features/system-logs/system-log-sanitizer";
import { cn } from "@/lib/utils";
import { clipboard } from "@/native-platform";

const sections: Array<{
  level: SystemLogLevel;
  title: string;
  empty: string;
  icon: typeof CheckCircle2;
  color: string;
}> = [
  {
    level: "normal",
    title: "طبيعي",
    empty: "لا توجد رسائل طبيعية.",
    icon: CheckCircle2,
    color: "text-emerald-600",
  },
  {
    level: "warning",
    title: "تحذيرات",
    empty: "لا توجد تحذيرات.",
    icon: AlertTriangle,
    color: "text-amber-600",
  },
  {
    level: "error",
    title: "أخطاء وكسور",
    empty: "لا توجد أخطاء أو أعطال.",
    icon: Bug,
    color: "text-destructive",
  },
];

function formatForCopy(entries: SystemLogEntry[]) {
  return entries.map(formatEntryForCopy).join("\n\n");
}

function formatEntryForCopy(entry: SystemLogEntry) {
  const source = entry.sourceFile
    ? `${entry.sourceFile}:${entry.sourceLine ?? "?"}:${entry.sourceColumn ?? "?"}`
    : "غير متاح";
  return redactSystemLogText(
    [
      `المستوى: ${entry.level}`,
      `الطريقة: ${entry.consoleMethod}`,
      `المنصة: ${entry.platform}`,
      `الصفحة: ${entry.page}`,
      `النوع: ${entry.errorName ?? "غير محدد"}`,
      `المصدر: ${source}`,
      `أول ظهور: ${entry.firstOccurredAt}`,
      `آخر ظهور: ${entry.lastOccurredAt}`,
      `عدد مرات التكرار: ${entry.occurrences}`,
      `User Agent: ${entry.userAgent}`,
      `Feature: ${entry.feature ?? "غير محدد"}`,
      `Operation: ${entry.operation ?? "غير محددة"}`,
      `الرسالة:\n${entry.message}`,
      entry.stack ? `Stack trace:\n${entry.stack}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

function cloudSource(entry: PersistentSystemLogEntry) {
  return entry.routeName || entry.page || "server";
}

function formatCloudEntryForCopy(entry: PersistentSystemLogEntry) {
  const source = entry.sourceFile
    ? `${entry.sourceFile}:${entry.sourceLine ?? "?"}:${entry.sourceColumn ?? "?"}`
    : "غير متاح";
  return redactSystemLogText(
    [
      "Cloud Error Report",
      "==================",
      `ID: ${entry.id}`,
      `Fingerprint: ${entry.fingerprint}`,
      `Origin: ${entry.origin}`,
      `Trust: ${entry.trustLevel}`,
      `Level: ${entry.level}`,
      `Source: ${entry.source}`,
      `Platform: ${entry.platform}`,
      `Console method: ${entry.consoleMethod}`,
      `Method: ${entry.requestMethod ?? "غير محدد"}`,
      `Status: ${entry.statusCode ?? "غير محدد"}`,
      `Route: ${cloudSource(entry)}`,
      `Page: ${entry.page}`,
      `Feature: ${entry.feature ?? "غير محدد"}`,
      `Operation: ${entry.operation ?? "غير محددة"}`,
      `Error: ${entry.errorName ?? "غير محدد"}`,
      `Occurrences: ${entry.occurrences}`,
      `First occurred: ${entry.firstOccurredAt}`,
      `Last occurred: ${entry.lastOccurredAt}`,
      `App version: ${entry.appVersion ?? "غير محدد"}`,
      `Native version: ${entry.nativeVersion ?? "غير محدد"}`,
      `UID: ${entry.uid ?? "غير محدد"}`,
      `User agent: ${entry.userAgent ?? "غير محدد"}`,
      `Source location: ${source}`,
      entry.messageTruncated
        ? "Message truncated: yes"
        : "Message truncated: no",
      entry.stackTruncated ? "Stack truncated: yes" : "Stack truncated: no",
      "",
      "Message:",
      entry.message,
      "",
      "Stack trace:",
      entry.stack || "غير متاح",
    ].join("\n"),
  );
}

function CloudErrorsContainer({
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
    <section className="mb-6 overflow-hidden rounded-xl border border-destructive/30 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 p-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-destructive">
            <CloudAlert className="h-5 w-5" />
            أخطاء السحابة
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            أخطاء موثقة من الخادم فقط. يتم تحديثها تلقائيًا كل 20 ثانية.
            {lastUpdatedAt && (
              <span className="ms-1">
                آخر تحديث: {new Date(lastUpdatedAt).toLocaleTimeString("ar-EG")}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
            {filtered.length} / {cloudErrors.length}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={loadState === "loading"}
            onClick={onRefresh}
            aria-label="تحديث أخطاء السحابة"
            title="تحديث أخطاء السحابة"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                loadState === "loading" && "animate-spin",
              )}
            />
          </Button>
          <Button
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
            <ClipboardCopy className="me-2 h-4 w-4" />
            {copyState === "all" ? "تم النسخ" : "نسخ النتائج"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_180px_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في الرسالة أو المسار أو Stack..."
            className="h-10 w-full rounded-md border bg-background ps-10 pe-3 text-sm"
          />
        </label>
        <select
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
        <select
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
        <p className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-800">
          تعذر تحديث أخطاء السحابة. البيانات الظاهرة هي آخر بيانات ناجحة ولم يتم
          حذفها.
        </p>
      )}

      <div className="max-h-[55vh] overflow-auto p-3">
        {loadState === "loading" && !cloudErrors.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            جارٍ تحميل أخطاء السحابة…
          </p>
        ) : filtered.length ? (
          <div className="space-y-3">
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
                    {new Date(entry.lastOccurredAt).toLocaleString("ar-EG")}
                  </time>
                </div>
                {(entry.messageTruncated || entry.stackTruncated) && (
                  <p className="mt-3 rounded-md bg-amber-500/10 p-2 text-xs text-amber-800">
                    بعض البيانات الأصلية تجاوزت حد التخزين؛ النسخ يحتوي كل
                    البيانات المحفوظة مع توضيح الجزء المقصوص.
                  </p>
                )}
                <details className="mt-3 rounded-md bg-muted/30 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-primary">
                    عرض كل التفاصيل
                  </summary>
                  <dl
                    className="mt-3 grid gap-2 text-xs sm:grid-cols-2"
                    dir="ltr"
                  >
                    <div>
                      <dt className="text-muted-foreground">Feature</dt>
                      <dd className="font-mono">
                        {entry.feature ?? "Not specified"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Operation</dt>
                      <dd className="font-mono">
                        {entry.operation ?? "Not specified"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        First occurrence
                      </dt>
                      <dd>{entry.firstOccurredAt}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last occurrence</dt>
                      <dd>{entry.lastOccurredAt}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">App version</dt>
                      <dd>{entry.appVersion ?? "Not specified"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Native version</dt>
                      <dd>{entry.nativeVersion ?? "Not specified"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Fingerprint</dt>
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
          <p className="py-12 text-center text-sm text-muted-foreground">
            لا توجد أخطاء سحابية مطابقة.
          </p>
        )}
      </div>
    </section>
  );
}

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
        persistentSystemLogApiService.list(sessionToken, { limit: 500 }),
        persistentSystemLogApiService.list(sessionToken, {
          limit: 1000,
          origin: "cloud",
          level: "error",
        }),
      ]).then(([allResult, cloudResult]) => {
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
      });
    };
    load();
    const timer = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authorized, refreshKey, session]);

  const allLogs = useMemo<SystemLogEntry[]>(
    () => [
      ...logs,
      ...persistentLogs.map((entry, index) => ({
        id: -1 - index,
        fingerprint: `persistent:${entry.fingerprint}`,
        level: entry.level,
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
      <main className="container px-4 py-8 text-sm text-on-surface-variant">
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
    <main className="container mx-auto max-w-7xl px-4 py-8" dir="rtl">
      <header className="mb-6 flex flex-wrap items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="me-auto">
          <p className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 className="text-2xl font-bold">سجل النظام المباشر</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            يجمع السجل المحلي المباشر والسجلات المحفوظة، مع فصل أخطاء السحابة
            الموثقة أدناه.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-card p-2">
          <Button
            type="button"
            size="icon"
            variant={captureEnabled ? "secondary" : "outline"}
            onClick={() => setSystemLogCaptureEnabled(!captureEnabled)}
            aria-label={captureEnabled ? "إيقاف الالتقاط" : "تشغيل الالتقاط"}
            title={captureEnabled ? "إيقاف الالتقاط" : "تشغيل الالتقاط"}
          >
            {captureEnabled ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={() => {
              clearAllSystemLogs();
              if (session?.sessionToken) {
                void persistentSystemLogApiService
                  .clear(session.sessionToken)
                  .then(() => {
                    setPersistentLogs([]);
                    setCloudLogs([]);
                  })
                  .catch((error) => {
                    console.warn(
                      "[SystemLogs] Failed to clear persistent logs.",
                      error,
                    );
                  });
              }
            }}
            disabled={!allLogs.length}
            aria-label="مسح جميع السجلات"
            title="مسح جميع السجلات"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <CloudErrorsContainer
        logs={cloudLogs}
        loadState={cloudLoadState}
        lastUpdatedAt={cloudLastUpdatedAt}
        onRefresh={() => setRefreshKey((value) => value + 1)}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {sections.map((item) => {
          const TabIcon = item.icon;
          return (
            <button
              key={item.level}
              type="button"
              onClick={() => setActive(item.level)}
              className={cn(
                "rounded-xl border bg-card p-4 text-start transition-colors",
                active === item.level &&
                  "border-primary ring-2 ring-primary/20",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-semibold">
                  <TabIcon className={cn("h-5 w-5", item.color)} />
                  {item.title}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                  {grouped[item.level].length}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Icon className={cn("h-5 w-5", section.color)} />
            {section.title}
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={!current.length}
              onClick={() => void copySection()}
              aria-label="نسخ القسم"
              title={copied === active ? "تم النسخ" : "نسخ القسم"}
            >
              <ClipboardCopy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              disabled={!current.length}
              onClick={() => {
                clearSystemLogs(active);
                if (session?.sessionToken) {
                  void persistentSystemLogApiService
                    .clear(session.sessionToken, active)
                    .then(() => {
                      setPersistentLogs((items) =>
                        items.filter((item) => item.level !== active),
                      );
                      if (active === "error") setCloudLogs([]);
                    })
                    .catch((error) => {
                      console.warn(
                        "[SystemLogs] Failed to clear persistent log section.",
                        error,
                      );
                    });
                }
              }}
              aria-label="مسح القسم"
              title="مسح القسم"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto p-3">
          {current.length ? (
            <div className="space-y-3">
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
                      <time title="آخر ظهور">
                        {new Date(entry.lastOccurredAt).toLocaleString("ar-EG")}
                      </time>
                      <span>{entry.platform}</span>
                      <code>{entry.consoleMethod}</code>
                      <code>{entry.page}</code>
                      {entry.id < 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                          محفوظ
                        </span>
                      )}
                      {entry.occurrences > 1 && (
                        <span
                          className="rounded-full bg-muted px-2 py-0.5 font-bold"
                          title="عدد مرات التكرار"
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
                      title="نسخ هذا السجل"
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
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="font-mono">
                          {entry.errorName ?? "Not specified"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Occurrences</dt>
                        <dd>{entry.occurrences}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Feature</dt>
                        <dd className="font-mono">
                          {entry.feature ?? "Not specified"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Operation</dt>
                        <dd className="font-mono">
                          {entry.operation ?? "Not specified"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          First occurrence
                        </dt>
                        <dd>
                          {new Date(entry.firstOccurredAt).toLocaleString(
                            "ar-EG",
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Last occurrence
                        </dt>
                        <dd>
                          {new Date(entry.lastOccurredAt).toLocaleString(
                            "ar-EG",
                          )}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Source</dt>
                        <dd className="break-all font-mono">
                          {entry.sourceFile
                            ? `${entry.sourceFile}:${entry.sourceLine ?? "?"}:${entry.sourceColumn ?? "?"}`
                            : entry.page}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">User Agent</dt>
                        <dd className="break-all font-mono">
                          {entry.userAgent}
                        </dd>
                      </div>
                    </dl>
                  )}
                  {entry.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-primary">
                        Stack trace
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
            <p className="py-12 text-center text-sm text-muted-foreground">
              {section.empty}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
