"use client";

import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ClipboardCopy,
  Pause,
  Play,
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
import { cn } from "@/lib/utils";

const sections: Array<{
  level: SystemLogLevel;
  title: string;
  empty: string;
  icon: typeof CheckCircle2;
  color: string;
}> = [
  { level: "normal", title: "طبيعي", empty: "لا توجد رسائل طبيعية.", icon: CheckCircle2, color: "text-emerald-600" },
  { level: "warning", title: "تحذيرات", empty: "لا توجد تحذيرات.", icon: AlertTriangle, color: "text-amber-600" },
  { level: "error", title: "أخطاء وكسور", empty: "لا توجد أخطاء أو أعطال.", icon: Bug, color: "text-destructive" },
];

function formatForCopy(entries: SystemLogEntry[]) {
  return entries
    .map(formatEntryForCopy)
    .join("\n\n");
}

function formatEntryForCopy(entry: SystemLogEntry) {
  const source = entry.sourceFile
    ? `${entry.sourceFile}:${entry.sourceLine ?? "?"}:${entry.sourceColumn ?? "?"}`
    : "غير متاح";
  return [
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
  ].filter(Boolean).join("\n");
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

  useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
  }, [authorized, isLoading, router, session]);

  const grouped = useMemo(
    () => Object.fromEntries(sections.map(({ level }) => [level, logs.filter((entry) => entry.level === level)])) as Record<SystemLogLevel, SystemLogEntry[]>,
    [logs],
  );

  if (isLoading || !authorized) {
    return <main className="container px-4 py-8 text-sm text-on-surface-variant">جاري التحقق من الصلاحيات…</main>;
  }

  const section = sections.find((item) => item.level === active)!;
  const current = grouped[active];
  const Icon = section.icon;

  const copySection = async () => {
    await navigator.clipboard.writeText(formatForCopy(current));
    setCopied(active);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const copyEntry = async (entry: SystemLogEntry) => {
    await navigator.clipboard.writeText(formatEntryForCopy(entry));
  };

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8" dir="rtl">
      <header className="mb-6 flex flex-wrap items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-6 w-6" /></div>
        <div className="me-auto">
          <p className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 className="text-2xl font-bold">سجل النظام المباشر</h1>
          <p className="mt-1 text-sm text-muted-foreground">ذاكرة مؤقتة محلية لهذه الجلسة فقط، ولا تُرسل إلى أي خادم.</p>
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
            {captureEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" variant="destructive" onClick={clearAllSystemLogs} disabled={!logs.length} aria-label="مسح جميع السجلات" title="مسح جميع السجلات">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {sections.map((item) => {
          const TabIcon = item.icon;
          return (
            <button key={item.level} type="button" onClick={() => setActive(item.level)} className={cn("rounded-xl border bg-card p-4 text-start transition-colors", active === item.level && "border-primary ring-2 ring-primary/20")}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-semibold"><TabIcon className={cn("h-5 w-5", item.color)} />{item.title}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{grouped[item.level].length}</span>
              </div>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Icon className={cn("h-5 w-5", section.color)} />{section.title}</h2>
          <div className="flex gap-2">
            <Button type="button" size="icon" variant="outline" disabled={!current.length} onClick={() => void copySection()} aria-label="نسخ القسم" title={copied === active ? "تم النسخ" : "نسخ القسم"}><ClipboardCopy className="h-4 w-4" /></Button>
            <Button type="button" size="icon" variant="destructive" disabled={!current.length} onClick={() => clearSystemLogs(active)} aria-label="مسح القسم" title="مسح القسم"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto p-3">
          {current.length ? (
            <div className="space-y-3">
              {[...current].reverse().map((entry) => (
                <article key={entry.id} className="rounded-lg border bg-background p-3 text-sm">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" dir="ltr">
                      <time title="آخر ظهور">{new Date(entry.lastOccurredAt).toLocaleString("ar-EG")}</time><span>{entry.platform}</span><code>{entry.consoleMethod}</code><code>{entry.page}</code>
                      {entry.occurrences > 1 && <span className="rounded-full bg-muted px-2 py-0.5 font-bold" title="عدد مرات التكرار">×{entry.occurrences}</span>}
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => void copyEntry(entry)} aria-label="نسخ هذا السجل" title="نسخ هذا السجل"><ClipboardCopy className="h-4 w-4" /></Button>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6" dir="ltr">{entry.message}</pre>
                  {(entry.level === "warning" || entry.level === "error") && (
                    <dl className="mt-3 grid gap-2 rounded-md bg-muted/40 p-3 text-xs sm:grid-cols-2" dir="ltr">
                      <div><dt className="text-muted-foreground">Type</dt><dd className="font-mono">{entry.errorName ?? "Not specified"}</dd></div>
                      <div><dt className="text-muted-foreground">Occurrences</dt><dd>{entry.occurrences}</dd></div>
                      <div><dt className="text-muted-foreground">Feature</dt><dd className="font-mono">{entry.feature ?? "Not specified"}</dd></div>
                      <div><dt className="text-muted-foreground">Operation</dt><dd className="font-mono">{entry.operation ?? "Not specified"}</dd></div>
                      <div><dt className="text-muted-foreground">First occurrence</dt><dd>{new Date(entry.firstOccurredAt).toLocaleString("ar-EG")}</dd></div>
                      <div><dt className="text-muted-foreground">Last occurrence</dt><dd>{new Date(entry.lastOccurredAt).toLocaleString("ar-EG")}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-muted-foreground">Source</dt><dd className="break-all font-mono">{entry.sourceFile ? `${entry.sourceFile}:${entry.sourceLine ?? "?"}:${entry.sourceColumn ?? "?"}` : entry.page}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-muted-foreground">User Agent</dt><dd className="break-all font-mono">{entry.userAgent}</dd></div>
                    </dl>
                  )}
                  {entry.stack && <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-primary">Stack trace</summary><pre className="mt-2 whitespace-pre-wrap break-words border-t pt-2 font-mono text-xs" dir="ltr">{entry.stack}</pre></details>}
                </article>
              ))}
            </div>
          ) : <p className="py-12 text-center text-sm text-muted-foreground">{section.empty}</p>}
        </div>
      </section>
    </main>
  );
}
