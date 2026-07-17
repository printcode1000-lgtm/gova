"use client";

import { ArrowLeftRight, FileCode2, Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { otaApiService } from "@/features/ota/services/ota-api-service";
import type {
  OtaAdminDashboard,
  OtaFileChangeKind,
  OtaIdentity,
  OtaReleaseDiff,
} from "@/features/ota/types/ota.types";

type ChangeFilter = "all" | OtaFileChangeKind;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatSignedBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  return `${bytes > 0 ? "+" : "-"}${formatBytes(Math.abs(bytes))}`;
}

function extensionFor(filePath: string): string {
  const name = filePath.split("/").pop() ?? filePath;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "__none__";
}

const changeLabels: Record<OtaFileChangeKind, string> = {
  added: "جديد",
  modified: "معدّل",
  deleted: "محذوف",
  unchanged: "بدون تغيير",
};

const changeClasses: Record<OtaFileChangeKind, string> = {
  added: "bg-green-100 text-green-800",
  modified: "bg-blue-100 text-blue-800",
  deleted: "bg-red-100 text-red-800",
  unchanged: "bg-gray-100 text-gray-700",
};

export function OtaReleaseChangesSection({
  dashboard,
  identity,
}: {
  dashboard: OtaAdminDashboard;
  identity: OtaIdentity;
}) {
  const candidates = useMemo(
    () => dashboard.history.filter((release) => release.releaseId !== dashboard.current.release.releaseId),
    [dashboard],
  );
  const [baseReleaseId, setBaseReleaseId] = useState("");
  const [diff, setDiff] = useState<OtaReleaseDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ChangeFilter>("all");
  const [extension, setExtension] = useState("all");

  useEffect(() => {
    if (candidates.some((release) => release.releaseId === baseReleaseId)) return;
    setBaseReleaseId(candidates[0]?.releaseId ?? "");
  }, [baseReleaseId, candidates]);

  useEffect(() => {
    if (!baseReleaseId) {
      setDiff(null);
      setError("");
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    void otaApiService
      .getReleaseDiff(identity, baseReleaseId)
      .then((next) => {
        if (active) setDiff(next);
      })
      .catch((loadError) => {
        if (active) {
          setDiff(null);
          setError(loadError instanceof Error ? loadError.message : "تعذر حساب تغييرات الإصدار.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [baseReleaseId, identity]);

  const extensions = useMemo(() => {
    const values = new Set((diff?.files ?? []).map((file) => extensionFor(file.path)));
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [diff]);

  const files = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (diff?.files ?? []).filter((file) => {
      if (kind !== "all" && file.kind !== kind) return false;
      if (extension !== "all" && extensionFor(file.path) !== extension) return false;
      return !normalized || file.path.toLowerCase().includes(normalized);
    });
  }, [diff, extension, kind, query]);

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><ArrowLeftRight className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-bold">تغييرات الإصدار وحجم التحديث</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              مقارنة Manifest الإصدار الحالي بإصدار محفوظ سابقًا على مستوى الملفات وSHA-256.
            </p>
          </div>
        </div>
        <label className="grid w-full gap-1 text-sm lg:w-80">
          <span className="font-medium">المقارنة مع</span>
          <select
            value={baseReleaseId}
            onChange={(event) => setBaseReleaseId(event.target.value)}
            className="h-10 rounded-md border bg-background px-3"
            disabled={candidates.length === 0}
            dir="ltr"
          >
            {candidates.length === 0 ? <option value="">لا يوجد إصدار سابق محفوظ</option> : null}
            {candidates.map((release) => (
              <option key={release.releaseId} value={release.releaseId}>{release.version} — {release.releaseId}</option>
            ))}
          </select>
        </label>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          لا يوجد Manifest سابق محفوظ للمقارنة حاليًا. سيظهر الفرق تلقائيًا بعد اكتشاف الإصدار القادم، لأن النظام يحتفظ بنسخة Manifest لكل إصدار منذ تفعيل لوحة الاعتماد.
        </div>
      ) : null}

      {loading ? <div className="flex min-h-44 items-center justify-center"><LoadingSpinner size="lg" /></div> : null}
      {error ? <div className="rounded-xl bg-error-container p-4 text-sm text-on-error-container">{error}</div> : null}

      {diff && !loading ? (
        <>
          <div className="mb-4 rounded-xl bg-primary/5 p-4 text-sm">
            <span dir="ltr" className="font-semibold">{diff.base.version}</span>
            <ArrowLeftRight className="mx-2 inline h-4 w-4 text-primary" />
            <span dir="ltr" className="font-semibold">{diff.target.version}</span>
            <p className="mt-2 text-xs text-muted-foreground">
              حجم التنزيل الفعلي يجمع الحجم الكامل لكل ملف جديد أو معدّل؛ OTA ينزّل الملف المعدّل كاملًا وليس البايتات المختلفة داخله.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard icon={<ArrowLeftRight className="h-5 w-5" />} label="التنزيل الفعلي" value={formatBytes(diff.summary.downloadBytes)} detail={`${diff.summary.addedCount + diff.summary.modifiedCount} ملف`} tone="primary" />
            <MetricCard icon={<Plus className="h-5 w-5" />} label="ملفات جديدة" value={diff.summary.addedCount.toLocaleString("ar-EG")} detail={formatBytes(diff.summary.addedBytes)} tone="green" />
            <MetricCard icon={<Pencil className="h-5 w-5" />} label="ملفات معدّلة" value={diff.summary.modifiedCount.toLocaleString("ar-EG")} detail={formatBytes(diff.summary.modifiedDownloadBytes)} tone="blue" />
            <MetricCard icon={<Trash2 className="h-5 w-5" />} label="ملفات محذوفة" value={diff.summary.deletedCount.toLocaleString("ar-EG")} detail={formatBytes(diff.summary.deletedBytes)} tone="red" />
            <MetricCard icon={<Minus className="h-5 w-5" />} label="بدون تغيير" value={diff.summary.unchangedCount.toLocaleString("ar-EG")} detail={formatBytes(diff.summary.unchangedBytes)} tone="neutral" />
            <MetricCard icon={<FileCode2 className="h-5 w-5" />} label="فرق الحجم الكلي" value={formatSignedBytes(diff.summary.totalSizeDelta)} detail={`${formatBytes(diff.base.size)} ← ${formatBytes(diff.target.size)}`} tone="neutral" />
          </div>

          <div className="my-5 grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="البحث في مسار الملف" className="pe-9" dir="ltr" />
            </div>
            <select value={kind} onChange={(event) => setKind(event.target.value as ChangeFilter)} className="h-10 rounded-md border bg-background px-3">
              <option value="all">كل التغييرات</option>
              <option value="added">الملفات الجديدة</option>
              <option value="modified">الملفات المعدّلة</option>
              <option value="deleted">الملفات المحذوفة</option>
              <option value="unchanged">بدون تغيير</option>
            </select>
            <select value={extension} onChange={(event) => setExtension(event.target.value)} className="h-10 rounded-md border bg-background px-3" dir="ltr">
              <option value="all">All extensions</option>
              {extensions.map((value) => <option key={value} value={value}>{value === "__none__" ? "No extension" : value}</option>)}
            </select>
          </div>

          <p className="mb-2 text-xs text-muted-foreground">يعرض الجدول {files.length.toLocaleString("ar-EG")} من {diff.files.length.toLocaleString("ar-EG")} ملف.</p>
          <div className="max-h-[38rem] overflow-auto rounded-lg border">
            <table className="w-full min-w-[1050px] text-sm" dir="ltr">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr><th className="p-3 text-left">Status</th><th className="p-3 text-left">Path</th><th className="p-3 text-left">Old size</th><th className="p-3 text-left">New size</th><th className="p-3 text-left">Delta</th><th className="p-3 text-left">Old SHA-256</th><th className="p-3 text-left">New SHA-256</th></tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={`${file.kind}:${file.path}`} className="border-t align-top">
                    <td className="p-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${changeClasses[file.kind]}`}>{changeLabels[file.kind]}</span></td>
                    <td className="p-3 font-mono text-xs">{file.path}</td>
                    <td className="whitespace-nowrap p-3">{file.previousSize === undefined ? "—" : formatBytes(file.previousSize)}</td>
                    <td className="whitespace-nowrap p-3">{file.currentSize === undefined ? "—" : formatBytes(file.currentSize)}</td>
                    <td className={`whitespace-nowrap p-3 font-semibold ${file.sizeDelta > 0 ? "text-red-700" : file.sizeDelta < 0 ? "text-green-700" : ""}`}>{formatSignedBytes(file.sizeDelta)}</td>
                    <td className="max-w-52 truncate p-3 font-mono text-xs" title={file.previousSha256}>{file.previousSha256 ?? "—"}</td>
                    <td className="max-w-52 truncate p-3 font-mono text-xs" title={file.currentSha256}>{file.currentSha256 ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "primary" | "green" | "blue" | "red" | "neutral";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    red: "bg-red-100 text-red-800",
    neutral: "bg-muted text-foreground",
  };
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${tones[tone]}`}>{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold" dir="ltr">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{detail}</p>
    </div>
  );
}
