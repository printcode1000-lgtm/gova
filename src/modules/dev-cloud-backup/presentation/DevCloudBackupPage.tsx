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
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { asolApi } from "@/core/api";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";

import { DEV_CLOUD_BACKUP_API } from "../config";
import {
  devCloudBackupRestoreConfirmation,
  type DevCloudBackupInspectResult,
  type DevCloudBackupDiffReport,
  type DevCloudBackupListItem,
  type DevCloudBackupRestoreMode,
  type DevCloudBackupRestorePreview,
  type DevCloudBackupRestoreResult,
  type DevCloudBackupSummary,
  type DevCloudBackupUpdateResult,
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

type BackupOperationKind = "inspect" | "compare" | "update" | "restore";

interface BackupOperationStatus {
  kind: BackupOperationKind;
  fileName: string;
  phase: "running" | "done" | "failed";
  message: string;
  startedAt: string;
  finishedAt?: string;
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

function formatOperationTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}

function backupOperationTitle(kind: BackupOperationKind) {
  if (kind === "inspect") return "فحص النسخة";
  if (kind === "compare") return "مقارنة النسخة";
  if (kind === "restore") return "استعادة النسخة";
  return "تحديث النسخة";
}

function operationBusyFor(busy: string, kind: BackupOperationKind, fileName: string) {
  const prefix =
    kind === "inspect"
      ? "inspect-saved"
      : kind === "compare"
        ? "compare-saved"
        : kind === "restore"
          ? "restore-saved"
          : "update-saved";
  return busy === `${prefix}:${fileName}`;
}

export function DevCloudBackupPage() {
  const { formatApiError } = useTranslation();
  const { session, isLoading } = useSession();
  const allowedUser = !isLoading && isSuperAdmin(session);
  const [state, setState] = React.useState<ListResponse | null>(null);
  const [inspection, setInspection] = React.useState<InspectResponse | null>(
    null,
  );
  const [created, setCreated] = React.useState<DevCloudBackupSummary | null>(
    null,
  );
  const [diff, setDiff] = React.useState<DevCloudBackupDiffReport | null>(null);
  const [updatedZip, setUpdatedZip] =
    React.useState<DevCloudBackupUpdateResult | null>(null);
  const [operationStatus, setOperationStatus] =
    React.useState<BackupOperationStatus | null>(null);
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
      setError(formatApiError(loadError));
    } finally {
      setBusy("");
    }
  }, [allowedUser, authHeaders]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const startOperation = React.useCallback(
    (kind: BackupOperationKind, fileName: string, message: string) => {
      setOperationStatus({
        kind,
        fileName,
        phase: "running",
        message,
        startedAt: new Date().toISOString(),
      });
    },
    [],
  );

  const finishOperation = React.useCallback(
    (phase: "done" | "failed", message: string) => {
      setOperationStatus((current) =>
        current
          ? {
              ...current,
              phase,
              message,
              finishedAt: new Date().toISOString(),
            }
          : current,
      );
    },
    [],
  );

  const createBackup = async () => {
    if (!authHeaders) return;
    setBusy("create");
    setError("");
    setNotice("");
    setCreated(null);
    try {
      const next = await asolApi.post<DevCloudBackupSummary>(
        DEV_CLOUD_BACKUP_API.create,
        {},
        { headers: authHeaders },
      );
      setCreated(next);
      setNotice("تم إنشاء النسخة الاحتياطية وحفظها محليًا.");
      await load();
    } catch (createError) {
      setError(formatApiError(createError));
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
      setError(formatApiError(downloadError));
    } finally {
      setBusy("");
    }
  };

  const updateSavedBackup = async (fileName: string) => {
    if (!authHeaders) return;
    setBusy(`update-saved:${fileName}`);
    setError("");
    setNotice("");
    setInspection(null);
    setUpdatedZip(null);
    startOperation(
      "update",
      fileName,
      `جاري تحديث ${fileName} من Turso وR2 وإنشاء ملف zip محدث...`,
    );
    try {
      const result = await asolApi.post<DevCloudBackupUpdateResult>(
        DEV_CLOUD_BACKUP_API.updateSaved,
        { fileName },
        { headers: authHeaders },
      );
      setUpdatedZip(result);
      setDiff(result.diff);
      const message = `تم تحديث ${fileName} وإنشاء ${result.fileName}: ${result.tableCount} جدول، ${result.rowCount} سجل، ${result.r2ObjectCount} صورة R2.`;
      setNotice(message);
      finishOperation("done", message);
      await load();
    } catch (updateError) {
      const message = formatApiError(updateError);
      setError(message);
      finishOperation("failed", message);
    } finally {
      setBusy("");
    }
  };

  const inspectSavedBackup = async (fileName: string) => {
    if (!authHeaders) return;
    setBusy(`inspect-saved:${fileName}`);
    setError("");
    setNotice("");
    setInspection(null);
    setDiff(null);
    setUpdatedZip(null);
    startOperation(
      "inspect",
      fileName,
      `جاري فحص ${fileName} وقراءة manifest ومحتويات zip...`,
    );
    try {
      const result = await asolApi.post<InspectResponse>(
        DEV_CLOUD_BACKUP_API.inspectSaved,
        { fileName },
        { headers: authHeaders, suppressErrorLog: true },
      );
      setInspection(result);
      const rowCount = result.preview.databases.reduce((sum, item) => sum + item.rowCount, 0);
      const tableCount = result.preview.databases.reduce((sum, item) => sum + item.tableCount, 0);
      const warningCount = result.preview.warnings.length + result.inspect.warnings.length;
      const message = `تم فحص ${fileName}: ${result.preview.databases.length} قاعدة، ${tableCount} جدول، ${rowCount} سجل، ${result.preview.r2ObjectCount} صورة R2، ${warningCount} تحذير.`;
      setNotice(message);
      finishOperation("done", message);
    } catch (inspectError) {
      const message = formatApiError(inspectError);
      setError(message);
      finishOperation("failed", message);
    } finally {
      setBusy("");
    }
  };

  const compareSavedBackup = async (fileName: string) => {
    if (!authHeaders) return;
    setBusy(`compare-saved:${fileName}`);
    setError("");
    setNotice("");
    setDiff(null);
    setInspection(null);
    setUpdatedZip(null);
    startOperation(
      "compare",
      fileName,
      `جاري مقارنة ${fileName} مع أحدث بيانات Turso وR2...`,
    );
    try {
      const result = await asolApi.post<DevCloudBackupDiffReport>(
        DEV_CLOUD_BACKUP_API.compareSaved,
        { fileName },
        { headers: authHeaders, suppressErrorLog: true },
      );
      setDiff(result);
      const message =
        result.status === "matched"
          ? `تمت مقارنة ${fileName}: النسخة متطابقة مع السحابة، ${result.summary.cloudRows} سجل و${result.summary.cloudR2Objects} صورة R2.`
          : `تمت مقارنة ${fileName}: توجد فروقات في ${result.summary.changedTables} جدول و${result.summary.changedR2Objects} صورة R2.`;
      setNotice(message);
      finishOperation("done", message);
    } catch (compareError) {
      const message = formatApiError(compareError);
      setError(message);
      finishOperation("failed", message);
    } finally {
      setBusy("");
    }
  };

  const deleteSavedBackup = async (fileName: string) => {
    if (!authHeaders) return;
    const confirmed = window.confirm(
      `سيتم حذف النسخة المحلية فقط:\n${fileName}\nهل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    setBusy(`delete:${fileName}`);
    setError("");
    setNotice("");
    try {
      await asolApi.post<{ deleted: true; fileName: string }>(
        DEV_CLOUD_BACKUP_API.deleteSaved,
        { fileName },
        { headers: authHeaders },
      );
      setNotice(`تم حذف النسخة المحلية ${fileName}.`);
      await load();
    } catch (deleteError) {
      setError(formatApiError(deleteError));
    } finally {
      setBusy("");
    }
  };

  const restoreSavedBackup = async (
    fileName: string,
    mode: DevCloudBackupRestoreMode,
  ) => {
    if (!authHeaders) return;
    const confirmationText = devCloudBackupRestoreConfirmation(mode);
    setBusy(`restore-saved:${fileName}`);
    setError("");
    setNotice("");
    startOperation(
      "restore",
      fileName,
      mode === "replace"
        ? `جاري استعادة ${fileName} بوضع المطابقة التامة...`
        : `جاري استعادة ${fileName} بوضع الدمج...`,
    );
    try {
      const result = await asolApi.post<DevCloudBackupRestoreResult>(
        DEV_CLOUD_BACKUP_API.restoreSaved,
        { fileName, mode, confirmationText },
        { headers: authHeaders },
      );
      const message =
        `تمت الاستعادة: ${result.restoredDatabases} قاعدة، ` +
        `${result.restoredTables} جدول، ${result.restoredRows} سجل، ` +
        `${result.uploadedR2Objects} ملف R2` +
        (result.deletedR2Objects > 0
          ? `، وحُذف ${result.deletedR2Objects} ملف زائد`
          : "");
      finishOperation("done", message);
      setNotice(message);
      await load();
    } catch (restoreError) {
      const message = formatApiError(restoreError);
      finishOperation("failed", message);
      setError(message);
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
  const savedOperationBusy =
    busy.startsWith("inspect-saved:") ||
    busy.startsWith("compare-saved:") ||
    busy.startsWith("update-saved:") ||
    busy.startsWith("restore-saved:");

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-on-surface">
            <DatabaseBackup className="h-6 w-6 text-primary" />
            نسخ سحابة التطوير
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            إنشاء وفحص ومقارنة وتحديث نسخ Turso وCloudflare R2 من بيئة التطوير فقط. كل العمليات تعمل على النسخ المحفوظة المنشأة من النظام.
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
      {operationStatus ? (
        <section
          className={`rounded-md border p-3 text-sm ${
            operationStatus.phase === "failed"
              ? "border-red-200 bg-red-50 text-red-700"
              : operationStatus.phase === "done"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 font-semibold">
              {operationStatus.phase === "running" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileArchive className="h-4 w-4" />
              )}
              <span>{backupOperationTitle(operationStatus.kind)}</span>
            </div>
            <div className="text-xs opacity-80">
              {formatOperationTime(operationStatus.startedAt)}
              {operationStatus.finishedAt
                ? ` - ${formatOperationTime(operationStatus.finishedAt)}`
                : ""}
            </div>
          </div>
          <div className="mt-2 break-all" dir="ltr">
            {operationStatus.fileName}
          </div>
          <div className="mt-2">{operationStatus.message}</div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border bg-surface p-4">
          <div className="flex items-center gap-2 font-semibold">
            <CloudDownload className="h-5 w-5" />
            إنشاء نسخة جديدة
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
تحفظ النسخة كل قواعد Turso المتاحة في البيئة وكل كائنات R2 في
              الحسابين، بلا أي استثناء.
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
            <GitCompareArrows className="h-5 w-5" />
            نتائج أوامر النسخ
          </div>
          {!diff && !updatedZip && !preview ? (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              استخدم أزرار فحص أو مقارنة أو تحديث من قائمة النسخ المحفوظة. لا توجد أي عملية يدوية أو رفع ملف من هذه الصفحة.
            </div>
          ) : null}
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
          {(state?.backups ?? []).map((backup) => {
            const inspectBusy = operationBusyFor(busy, "inspect", backup.fileName);
            const compareBusy = operationBusyFor(busy, "compare", backup.fileName);
            const updateBusy = operationBusyFor(busy, "update", backup.fileName);
            const restoreBusy = busy === `restore-saved:${backup.fileName}`;
            const thisBackupOperation =
              operationStatus?.fileName === backup.fileName ? operationStatus : null;
            const commandDisabled = !devAllowed || savedOperationBusy;

            return (
              <div
                key={backup.fileName}
                className="grid gap-3 p-3 text-sm md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="break-all font-medium" dir="ltr">
                    {backup.fileName}
                  </div>
                  <div className="mt-1 text-xs text-on-surface-variant">
                    {dateText(backup.modifiedAt)}، {sizeText(backup.sizeBytes)}
                  </div>
                  {thisBackupOperation ? (
                    <div
                      className={`mt-2 rounded-md border px-2 py-1 text-xs ${
                        thisBackupOperation.phase === "failed"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : thisBackupOperation.phase === "done"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-blue-200 bg-blue-50 text-blue-800"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {thisBackupOperation.phase === "running" ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : null}
                        {thisBackupOperation.message}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={commandDisabled}
                    onClick={() => void inspectSavedBackup(backup.fileName)}
                  >
                    <ArchiveRestore className="h-4 w-4" />
                    {inspectBusy ? "جاري فحص هذا الملف" : "فحص"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={commandDisabled}
                    onClick={() => void compareSavedBackup(backup.fileName)}
                  >
                    <GitCompareArrows className="h-4 w-4" />
                    {compareBusy ? "جاري مقارنة هذا الملف" : "مقارنة"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={commandDisabled}
                    onClick={() => void updateSavedBackup(backup.fileName)}
                  >
                    <RefreshCw className={updateBusy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    {updateBusy ? "جاري تحديث هذا الملف" : "تحديث"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-400 text-amber-800 hover:bg-amber-50"
                    disabled={commandDisabled}
                    onClick={() => void restoreSavedBackup(backup.fileName, "merge")}
                  >
                    <DatabaseBackup className="h-4 w-4" />
                    {restoreBusy ? "جاري الاستعادة" : "استعادة (دمج)"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="bg-amber-700 hover:bg-amber-800"
                    disabled={commandDisabled}
                    onClick={() => void restoreSavedBackup(backup.fileName, "replace")}
                  >
                    <DatabaseBackup className="h-4 w-4" />
                    {restoreBusy ? "جاري الاستعادة" : "استعادة (مطابقة تامة)"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={!devAllowed || busy === `delete:${backup.fileName}` || savedOperationBusy}
                    onClick={() => void deleteSavedBackup(backup.fileName)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {busy === `delete:${backup.fileName}` ? "جاري الحذف" : "حذف"}
                  </Button>
                </div>
              </div>
            );
          })}
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
