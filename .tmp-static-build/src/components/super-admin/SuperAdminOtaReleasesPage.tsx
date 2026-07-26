"use client";

import {
  Ban,
  CheckCircle2,
  ClipboardCopy,
  CloudDownload,
  FileCode2,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { OtaReleaseChangesSection } from "@/components/super-admin/OtaReleaseChangesSection";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { otaApiService } from "@/features/ota/services/ota-api-service";
import { otaUpdateService } from "@/features/ota/services/ota-update-service";
import type {
  OtaAdminDashboard,
  OtaDownloadProgress,
  OtaReleaseAuditEntry,
} from "@/features/ota/types/ota.types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function auditLabel(action: OtaReleaseAuditEntry["action"]): string {
  if (action === "approved") return "تم الاعتماد";
  if (action === "revoked") return "تم إلغاء الاعتماد";
  return "تم اكتشاف الإصدار";
}

export function SuperAdminOtaReleasesPage() {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const [dashboard, setDashboard] = useState<OtaAdminDashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [deviceProgress, setDeviceProgress] = useState<OtaDownloadProgress | null>(null);

  const load = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setBusy(true);
    setMessage("");
    try {
      setDashboard(await otaApiService.getAdminDashboard(session));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل بيانات OTA.");
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isSessionLoading && !authorized) router.replace(session ? "/home" : "/login");
    if (!isSessionLoading && authorized) void load();
  }, [authorized, isSessionLoading, load, router, session]);

  const files = useMemo(() => {
    const entries = Object.entries(dashboard?.current.manifest.files ?? {});
    const normalized = query.trim().toLowerCase();
    return normalized
      ? entries.filter(([path]) => path.toLowerCase().includes(normalized))
      : entries;
  }, [dashboard, query]);

  const changeApproval = async (approved: boolean) => {
    if (!session || !dashboard) return;
    const release = dashboard.current.release;
    const question = approved
      ? `هل تريد اعتماد الإصدار ${release.version} وإتاحته لكل المستخدمين؟`
      : `هل تريد إلغاء اعتماد الإصدار ${release.version} ومنع التنزيلات والتفعيلات الجديدة؟`;
    if (!window.confirm(question)) return;

    setBusy(true);
    setMessage("");
    try {
      const next = await otaApiService.setReleaseApproval({
        identity: session,
        releaseId: release.releaseId,
        version: release.version,
        approved,
      });
      setDashboard(next);
      setMessage(approved ? "تم اعتماد الإصدار وإتاحته للمستخدمين." : "تم إلغاء اعتماد الإصدار.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تغيير حالة الاعتماد.");
    } finally {
      setBusy(false);
    }
  };

  const downloadForTesting = async () => {
    if (!session) return;
    setBusy(true);
    setMessage("");
    setDeviceProgress(null);
    try {
      const update = await otaUpdateService.checkAndDownload(setDeviceProgress, session);
      setMessage(
        update
          ? `تم تجهيز الإصدار ${update.version} على هذا الجهاز ويمكن تفعيله من رسالة التحديث.`
          : "لا يوجد إصدار أحدث من الإصدار العامل على هذا الجهاز.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تنزيل الإصدار على هذا الجهاز.");
    } finally {
      setBusy(false);
    }
  };

  const copyManifest = async () => {
    if (!dashboard) return;
    await navigator.clipboard.writeText(JSON.stringify(dashboard.current.manifest, null, 2));
    setMessage("تم نسخ Manifest الإصدار.");
  };

  if (isSessionLoading || !authorized) {
    return (
      <main className="container flex min-h-[50vh] items-center justify-center px-4 py-8">
        <LoadingSpinner size="lg" aria-label="جاري التحقق من الصلاحيات" />
      </main>
    );
  }

  const current = dashboard?.current;
  const release = current?.release;

  return (
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8" dir="rtl">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <CloudDownload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
            <h1 className="text-2xl font-bold">إدارة واعتماد تحديثات OTA</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              الإصدار الجديد محظور افتراضيًا، ولا يصل للمستخدمين إلا بعد اعتماده من هنا.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={busy}>
            <RefreshCw className={`me-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            تحديث البيانات
          </Button>
          <Button type="button" variant="secondary" onClick={() => void downloadForTesting()} disabled={busy}>
            <CloudDownload className="me-2 h-4 w-4" />
            تنزيل للاختبار
          </Button>
        </div>
      </header>

      {message ? (
        <div className="rounded-xl border bg-card px-4 py-3 text-sm" role="status">{message}</div>
      ) : null}

      {deviceProgress ? (
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>{deviceProgress.detail || deviceProgress.statusKey}</span>
            <span className="font-semibold text-primary">{deviceProgress.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary/10">
            <div className="h-full bg-primary transition-all" style={{ width: `${deviceProgress.progress}%` }} />
          </div>
        </section>
      ) : null}

      {busy && !dashboard ? (
        <div className="flex min-h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
      ) : null}

      {release && current ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">الإصدار الحالي على R2</p>
              <p className="mt-2 text-2xl font-bold" dir="ltr">{release.version}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground" dir="ltr">{release.releaseId}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">حالة الاعتماد</p>
              <div className="mt-2 flex items-center gap-2">
                {release.approved ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <Ban className="h-6 w-6 text-amber-600" />}
                <span className="text-lg font-bold">{release.approved ? "معتمد ومتاح" : "محظور للمستخدمين"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{release.approved ? formatDate(release.approvedAt) : "بانتظار قرار السوبر أدمن"}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">حجم الإصدار</p>
              <p className="mt-2 text-2xl font-bold" dir="ltr">{formatBytes(release.size)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{release.fileCount.toLocaleString("ar-EG")} ملفًا</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">سلامة الإصدار</p>
              <div className="mt-2 flex items-center gap-2 text-green-700">
                <ShieldCheck className="h-6 w-6" />
                <span className="text-lg font-bold">توقيع صحيح</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">P-256 / SHA-256</p>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-bold">قرار نشر الإصدار</h2>
                <p className="text-sm text-muted-foreground">يمكن إلغاء الاعتماد لاحقًا لمنع التنزيلات والتفعيلات الجديدة.</p>
              </div>
              {release.approved ? (
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void changeApproval(false)}>
                  {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Ban className="me-2 h-4 w-4" />}
                  إلغاء الاعتماد
                </Button>
              ) : (
                <Button type="button" disabled={busy} onClick={() => void changeApproval(true)}>
                  {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="me-2 h-4 w-4" />}
                  اعتماد وإتاحة الإصدار
                </Button>
              )}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-4 text-lg font-bold">بيانات الإصدار</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">تاريخ الإنشاء</dt><dd className="font-medium">{formatDate(release.manifestCreatedAt)}</dd></div>
                <div><dt className="text-muted-foreground">آخر اكتشاف</dt><dd className="font-medium">{formatDate(release.lastSeenAt)}</dd></div>
                <div><dt className="text-muted-foreground">أقل إصدار Native</dt><dd className="font-medium" dir="ltr">{release.minimumNativeVersion}</dd></div>
                <div><dt className="text-muted-foreground">إلزامي</dt><dd className="font-medium">{release.mandatory ? "نعم" : "لا"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">ملاحظات الإصدار</dt><dd className="mt-1 rounded-lg bg-muted/50 p-3">{release.notes || "لا توجد ملاحظات."}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Base URL</dt><dd className="mt-1 break-all font-mono text-xs" dir="ltr">{release.baseUrl}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Manifest URL</dt><dd className="mt-1 break-all font-mono text-xs" dir="ltr">{dashboard.manifestUrl}</dd></div>
              </dl>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">التوقيع وManifest</h2>
                <Button type="button" size="sm" variant="outline" onClick={() => void copyManifest()}>
                  <ClipboardCopy className="me-2 h-4 w-4" />نسخ Manifest
                </Button>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">التوقيع الرقمي</p>
              <div className="max-h-28 overflow-auto break-all rounded-lg bg-muted/50 p-3 font-mono text-xs" dir="ltr">{release.signature}</div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <ShieldCheck className="h-5 w-5" />تم التحقق من التوقيع على الخادم قبل عرض الإصدار أو اعتماده.
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2"><FileCode2 className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">ملفات الإصدار ({files.length})</h2></div>
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="البحث باسم الملف" className="pe-9" dir="ltr" />
              </div>
            </div>
            <div className="max-h-[32rem] overflow-auto rounded-lg border">
              <table className="w-full min-w-[700px] text-sm" dir="ltr">
                <thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-left">Path</th><th className="p-3 text-left">Size</th><th className="p-3 text-left">SHA-256</th></tr></thead>
                <tbody>{files.map(([path, file]) => <tr key={path} className="border-t"><td className="p-3 font-mono text-xs">{path}</td><td className="whitespace-nowrap p-3">{formatBytes(file.size)}</td><td className="max-w-72 truncate p-3 font-mono text-xs" title={file.sha256}>{file.sha256}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          {session ? <OtaReleaseChangesSection dashboard={dashboard} identity={session} /> : null}

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center gap-2"><History className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">سجل الإصدارات</h2></div>
              <div className="space-y-2">{dashboard.history.map((item) => <div key={item.releaseId} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-semibold" dir="ltr">{item.version}</p><p className="text-xs text-muted-foreground">{formatDate(item.manifestCreatedAt)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{item.approved ? "معتمد" : "غير معتمد"}</span></div>)}</div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">سجل القرارات</h2></div>
              <div className="max-h-96 space-y-2 overflow-auto">{dashboard.audit.map((entry) => <div key={entry.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="font-semibold">{auditLabel(entry.action)}</span><span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span></div><p className="mt-1 text-xs text-muted-foreground" dir="ltr">{entry.version} · {entry.actorUid || "system"}</p></div>)}</div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
