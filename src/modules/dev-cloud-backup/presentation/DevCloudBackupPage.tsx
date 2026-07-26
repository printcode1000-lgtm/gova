"use client";

import * as React from "react";
import {
  ArchiveRestore,
  GitCompareArrows,
  CloudDownload,
  DatabaseBackup,
  Download,
  FileArchive,
  RefreshCw,
  ShieldAlert,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asolApi } from "@/core/api";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";

import { DEV_CLOUD_BACKUP_API } from "../config";
import type {
  DevCloudBackupInspectResult,
  DevCloudBackupDiffReport,
  DevCloudBackupListItem,
  DevCloudBackupRestoreMode,
  DevCloudBackupRestorePreview,
  DevCloudBackupRestoreResult,
  DevCloudBackupScope,
  DevCloudBackupSummary,
  DevCloudBackupUpdateResult,
} from "../domain/types";

interface ListResponse {
  environment: {
    allowed: boolean;
    nodeEnv: string;
    publicMode: string;
    vercel: boolean;
  };
  backups: DevCloudBackupListItem[];
}

interface InspectResponse {
  inspect: DevCloudBackupInspectResult;
  preview: DevCloudBackupRestorePreview;
}

function sizeText(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function dateText(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export function DevCloudBackupPage() {
  const { session, isLoading } = useSession();
  const allowedUser = !isLoading && isSuperAdmin(session);
  const [state, setState] = React.useState<ListResponse | null>(null);
  const [scope, setScope] =
    React.useState<DevCloudBackupScope>("all-r2");
  const [restoreMode, setRestoreMode] =
    React.useState<DevCloudBackupRestoreMode>("merge");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [inspection, setInspection] = React.useState<InspectResponse | null>(
    null,
  );
  const [created, setCreated] = React.useState<DevCloudBackupSummary | null>(
    null,
  );
  const [restoreResult, setRestoreResult] =
    React.useState<DevCloudBackupRestoreResult | null>(null);
  const [diff, setDiff] = React.useState<DevCloudBackupDiffReport | null>(null);
  const [updatedZip, setUpdatedZip] =
    React.useState<DevCloudBackupUpdateResult | null>(null);
  const [confirmationText, setConfirmationText] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const authHeaders = React.useMemo(
    () =>
      session?.sessionToken
        ? { "x-asol-session-token": session.sessionToken }
        : undefined,
    [session?.sessionToken],
  );

  const load = React.useCallback(async () => {
    if (!authHeaders || !allowedUser) return;
    setBusy("load");
    setError("");
    try {
      setState(
        await asolApi.get<ListResponse>(DEV_CLOUD_BACKUP_API.list, {
          headers: authHeaders,
        }),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل حالة النسخ الاحتياطي",
      );
    } finally {
      setBusy("");
    }
  }, [allowedUser, authHeaders]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createBackup = async () => {
    if (!authHeaders) return;
    setBusy("create");
    setError("");
    setNotice("");
    setCreated(null);
    try {
      const next = await asolApi.post<DevCloudBackupSummary>(
        DEV_CLOUD_BACKUP_API.create,
        { scope },
        { headers: authHeaders },
      );
      setCreated(next);
      setNotice("تم إنشاء النسخة الاحتياطية وحفظها محليًا.");
      await load();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "تعذر إنشاء النسخة الاحتياطية",
      );
    } finally {
      setBusy("");
    }
  };

  const downloadBackup = async (fileName: string) => {
    if (!authHeaders) return;
    setBusy(`download:${fileName}`);
    setError("");
    try {
      const buffer = await asolApi.getBinary(
        `${DEV_CLOUD_BACKUP_API.download}?file=${encodeURIComponent(fileName)}`,
        { headers: authHeaders },
      );
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "تعذر تنزيل النسخة الاحتياطية",
      );
    } finally {
      setBusy("");
    }
  };

  const inspectSelected = async (nextMode = restoreMode) => {
    if (!authHeaders || !selectedFile) return;
    setBusy("inspect");
    setError("");
    setInspection(null);
    setDiff(null);
    setUpdatedZip(null);
    setRestoreResult(null);
    setConfirmationText("");
    try {
      const form = new FormData();
      form.set("file", selectedFile);
      form.set("mode", nextMode);
      setInspection(
        await asolApi.postForm<InspectResponse>(
          DEV_CLOUD_BACKUP_API.inspect,
          form,
          { headers: authHeaders },
        ),
      );
    } catch (inspectError) {
      setError(
        inspectError instanceof Error
          ? inspectError.message
          : "تعذر فحص ملف النسخة",
      );
    } finally {
      setBusy("");
    }
  };

  const compareSelected = async () => {
    if (!authHeaders || !selectedFile) return;
    setBusy("compare");
    setError("");
    setNotice("");
    setDiff(null);
    try {
      const form = new FormData();
      form.set("file", selectedFile);
      setDiff(
        await asolApi.postForm<DevCloudBackupDiffReport>(
          DEV_CLOUD_BACKUP_API.compare,
          form,
          { headers: authHeaders },
        ),
      );
    } catch (compareError) {
      setError(
        compareError instanceof Error
          ? compareError.message
          : "تعذر مقارنة النسخة بالسحابة",
      );
    } finally {
      setBusy("");
    }
  };

  const updateSelectedFromCloud = async () => {
    if (!authHeaders || !selectedFile) return;
    setBusy("update");
    setError("");
    setNotice("");
    setUpdatedZip(null);
    try {
      const form = new FormData();
      form.set("file", selectedFile);
      const result = await asolApi.postForm<DevCloudBackupUpdateResult>(
        DEV_CLOUD_BACKUP_API.updateFromCloud,
        form,
        { headers: authHeaders },
      );
      setUpdatedZip(result);
      setDiff(result.diff);
      setNotice("تم إنشاء zip محدث من Turso وR2 مع تقرير الفروقات داخل reports/cloud-diff.json.");
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "تعذر تحديث ملف النسخة من السحابة",
      );
    } finally {
      setBusy("");
    }
  };

  const restoreSelected = async () => {
    if (!authHeaders || !selectedFile || !inspection) return;
    setBusy("restore");
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.set("file", selectedFile);
      form.set("mode", restoreMode);
      form.set("confirmationText", confirmationText);
      const result = await asolApi.postForm<DevCloudBackupRestoreResult>(
        DEV_CLOUD_BACKUP_API.restore,
        form,
        { headers: authHeaders },
      );
      setRestoreResult(result);
      setNotice("تم استرجاع النسخة إلى Turso وR2.");
      await load();
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "تعذر استرجاع النسخة",
      );
    } finally {
      setBusy("");
    }
  };

  if (isLoading) {
    return <main className="p-4 text-sm text-on-surface-variant">جاري التحميل...</main>;
  }

  if (!allowedUser) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </main>
    );
  }

  const devAllowed = state?.environment.allowed ?? false;
  const preview = inspection?.preview;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-on-surface">
            <DatabaseBackup className="h-6 w-6 text-primary" />
            نسخ سحابة التطوير
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            نسخ واسترجاع Turso وCloudflare R2 من بيئة التطوير فقط، مع ملفات zip
            قابلة للفحص والتعديل.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={busy === "load"}>
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
      </header>

      {!devAllowed ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5" />
            المديول مقفل خارج بيئة التطوير
          </div>
          <p className="mt-1 text-sm">
            الحالة الحالية: NODE_ENV={state?.environment.nodeEnv || "-"}،
            mode={state?.environment.publicMode || "-"}،
            Vercel={state?.environment.vercel ? "نعم" : "لا"}.
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}
      {notice ? (
        <section className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border bg-surface p-4">
          <div className="flex items-center gap-2 font-semibold">
            <CloudDownload className="h-5 w-5" />
            إنشاء نسخة جديدة
          </div>
          <div className="mt-4 grid gap-3">
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as DevCloudBackupScope)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              disabled={!devAllowed || busy === "create"}
            >
              <option value="all-r2">كل ملفات R2</option>
              <option value="known-project-files">ملفات R2 المعروفة للمشروع فقط</option>
            </select>
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              الاختيار الافتراضي يحفظ كل قواعد Turso وكل كائنات R2 بدون استثناء.
              الخيار الثاني مخصص للفحص الضيق فقط.
            </div>
            <Button
              type="button"
              onClick={() => void createBackup()}
              disabled={!devAllowed || busy === "create"}
            >
              <FileArchive className="h-4 w-4" />
              {busy === "create" ? "جاري إنشاء النسخة" : "إنشاء zip كامل"}
            </Button>
          </div>
          {created ? (
            <div className="mt-4 grid gap-2 rounded-md bg-muted p-3 text-sm">
              <Detail label="الملف" value={created.fileName} ltr />
              <Detail label="الحجم" value={sizeText(created.sizeBytes)} />
              <Detail label="الجداول" value={String(created.tableCount)} />
              <Detail label="السجلات" value={String(created.rowCount)} />
              <Detail label="صور R2" value={String(created.r2ObjectCount)} />
            </div>
          ) : null}
        </div>

        <div className="rounded-md border bg-surface p-4">
          <div className="flex items-center gap-2 font-semibold">
            <Upload className="h-5 w-5" />
            فحص واسترجاع zip معدل
          </div>
          <div className="mt-4 grid gap-3">
            <Input
              type="file"
              accept=".zip,application/zip"
              disabled={!devAllowed || busy === "inspect" || busy === "restore"}
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setInspection(null);
                setDiff(null);
                setUpdatedZip(null);
                setRestoreResult(null);
                setConfirmationText("");
              }}
            />
            <select
              value={restoreMode}
              onChange={(event) => {
                const next = event.target.value as DevCloudBackupRestoreMode;
                setRestoreMode(next);
                if (selectedFile) void inspectSelected(next);
              }}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              disabled={!devAllowed}
            >
              <option value="merge">دمج آمن: إضافة وتحديث فقط</option>
              <option value="replace">استبدال كامل حسب محتوى النسخة</option>
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={!devAllowed || !selectedFile || busy === "inspect"}
              onClick={() => void inspectSelected()}
            >
              <ArchiveRestore className="h-4 w-4" />
              فحص النسخة
            </Button>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={!devAllowed || !selectedFile || busy === "compare"}
                onClick={() => void compareSelected()}
              >
                <GitCompareArrows className="h-4 w-4" />
                {busy === "compare" ? "جاري المقارنة" : "مقارنة بالسحابة"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!devAllowed || !selectedFile || busy === "update"}
                onClick={() => void updateSelectedFromCloud()}
              >
                <CloudDownload className="h-4 w-4" />
                {busy === "update" ? "جاري التحديث" : "تحديث zip من السحابة"}
              </Button>
            </div>
          </div>
          {diff ? (
            <div className="mt-4 space-y-3 rounded-md border bg-surface p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">نتيجة المقارنة</div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    diff.status === "matched"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {diff.status === "matched" ? "متطابقة" : "توجد فروقات"}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <Summary label="جداول مختلفة" value={diff.summary.changedTables} />
                <Summary label="صور مختلفة" value={diff.summary.changedR2Objects} />
                <Summary label="سجلات zip" value={diff.summary.zipRows} />
                <Summary label="سجلات السحابة" value={diff.summary.cloudRows} />
              </div>
              {diff.databaseDifferences.length ? (
                <DiffList
                  title="فروقات الجداول"
                  items={diff.databaseDifferences
                    .slice(0, 12)
                    .map(
                      (item) =>
                        `${item.databaseId}.${item.table}: ${item.status} (${item.zipRows} / ${item.cloudRows})`,
                    )}
                />
              ) : null}
              {diff.r2Differences.length ? (
                <DiffList
                  title="فروقات R2"
                  items={diff.r2Differences
                    .slice(0, 12)
                    .map(
                      (item) =>
                        `${item.key}: ${item.status} (${item.zipSize ?? 0} / ${item.cloudSize ?? 0})`,
                    )}
                />
              ) : null}
            </div>
          ) : null}
          {updatedZip ? (
            <div className="mt-4 grid gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <Detail label="zip المحدث" value={updatedZip.fileName} ltr />
              <Detail label="الحجم" value={sizeText(updatedZip.sizeBytes)} />
              <Detail label="الجداول" value={String(updatedZip.tableCount)} />
              <Detail label="صور R2" value={String(updatedZip.r2ObjectCount)} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void downloadBackup(updatedZip.fileName)}
              >
                <Download className="h-4 w-4" />
                تنزيل zip المحدث
              </Button>
            </div>
          ) : null}
          {preview ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-2 rounded-md bg-muted p-3 text-sm">
                <Detail label="الوضع" value={preview.mode} ltr />
                <Detail label="القواعد" value={String(preview.databases.length)} />
                <Detail
                  label="السجلات"
                  value={String(preview.databases.reduce((sum, item) => sum + item.rowCount, 0))}
                />
                <Detail label="صور R2" value={String(preview.r2ObjectCount)} />
              </div>
              {preview.warnings.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {preview.warnings.slice(0, 10).map((warning) => (
                    <div key={warning} dir="ltr">
                      {warning}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="space-y-2">
                <div className="text-sm">
                  اكتب عبارة التأكيد:
                  <span className="ms-2 select-all rounded bg-muted px-2 py-1 font-semibold" dir="ltr">
                    {preview.confirmationText}
                  </span>
                </div>
                <Input
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  dir="ltr"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant={restoreMode === "replace" ? "destructive" : "default"}
                  disabled={
                    !devAllowed ||
                    busy === "restore" ||
                    confirmationText !== preview.confirmationText
                  }
                  onClick={() => void restoreSelected()}
                >
                  <ArchiveRestore className="h-4 w-4" />
                  {busy === "restore" ? "جاري الاسترجاع" : "استرجاع النسخة"}
                </Button>
              </div>
            </div>
          ) : null}
          {restoreResult ? (
            <div className="mt-4 grid gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <Detail label="قواعد مسترجعة" value={String(restoreResult.restoredDatabases)} />
              <Detail label="جداول" value={String(restoreResult.restoredTables)} />
              <Detail label="سجلات" value={String(restoreResult.restoredRows)} />
              <Detail label="صور مرفوعة" value={String(restoreResult.uploadedR2Objects)} />
              <Detail label="صور محذوفة" value={String(restoreResult.deletedR2Objects)} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-surface">
        <div className="flex items-center gap-2 border-b p-3 font-semibold">
          <FileArchive className="h-5 w-5" />
          النسخ المحفوظة محليًا
        </div>
        <div className="divide-y">
          {(state?.backups ?? []).map((backup) => (
            <div
              key={backup.fileName}
              className="grid gap-3 p-3 text-sm md:grid-cols-[1fr_auto_auto]"
            >
              <div className="min-w-0">
                <div className="break-all font-medium" dir="ltr">
                  {backup.fileName}
                </div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  {dateText(backup.modifiedAt)}، {sizeText(backup.sizeBytes)}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!devAllowed || busy === `download:${backup.fileName}`}
                onClick={() => void downloadBackup(backup.fileName)}
              >
                <Download className="h-4 w-4" />
                تنزيل
              </Button>
            </div>
          ))}
          {state?.backups.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              لا توجد نسخ محفوظة بعد.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Detail({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="break-all font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted p-2">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function DiffList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border">
      <div className="border-b px-3 py-2 text-xs font-semibold">{title}</div>
      <div className="max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div key={item} className="border-b px-3 py-2 text-xs last:border-b-0" dir="ltr">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
