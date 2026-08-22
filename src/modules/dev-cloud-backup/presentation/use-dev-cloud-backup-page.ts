"use client";

import * as React from "react";

import { asolApi } from "@/core/api";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { usePageSaveOperationScope } from "@/features/page-save/hooks/use-page-save-operation-scope";
import { useAdminArabic } from "@/lib/i18n/use-admin-arabic";

import { DEV_CLOUD_BACKUP_API } from "../config";
import type {
  BackupOperationKind,
  BackupOperationStatus,
  DevCloudBackupInspectResponse,
  DevCloudBackupListResponse,
} from "./dev-cloud-backup-page-types";
import {
  devCloudBackupRestoreConfirmation,
  type DevCloudBackupDiffReport,
  type DevCloudBackupRestoreMode,
  type DevCloudBackupRestoreResult,
  type DevCloudBackupSummary,
  type DevCloudBackupUpdateResult,
} from "@asol/backup-core";

export function useDevCloudBackupPage() {
  const { formatApiError } = useAdminArabic();
  const { session, isLoading } = useSession();
  const allowedUser = !isLoading && isSuperAdmin(session);
  const [state, setState] = React.useState<DevCloudBackupListResponse | null>(null);
  const [inspection, setInspection] =
    React.useState<DevCloudBackupInspectResponse | null>(null);
  const [created, setCreated] = React.useState<DevCloudBackupSummary | null>(null);
  const [diff, setDiff] = React.useState<DevCloudBackupDiffReport | null>(null);
  const [updatedZip, setUpdatedZip] =
    React.useState<DevCloudBackupUpdateResult | null>(null);
  const [operationStatus, setOperationStatus] =
    React.useState<BackupOperationStatus | null>(null);
  const [busy, setBusy] = React.useState("");

  const operations = usePageSaveOperationScope({
    id: "dev-cloud-backup",
    label: "النسخ السحابي للمطور",
    returnPath: "/dev/cloud-backup",
    enabled: allowedUser,
  });
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
        await asolApi.get<DevCloudBackupListResponse>(DEV_CLOUD_BACKUP_API.list, {
          headers: authHeaders,
        }),
      );
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setBusy("");
    }
  }, [allowedUser, authHeaders, formatApiError]);

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
      const result = await asolApi.post<DevCloudBackupInspectResponse>(
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

  const stageSavedBackupDelete = (fileName: string) => {
    if (!authHeaders) return;
    operations.stage({
      itemId: `dev-cloud-backup-delete:${fileName}`,
      kind: "delete",
      label: `حذف النسخة المحلية: ${fileName}`,
      execute: async () => {
        setBusy(`delete:${fileName}`);
        setError("");
        setNotice("");
        try {
          await asolApi.post<{ deleted: true; fileName: string }>(
            DEV_CLOUD_BACKUP_API.deleteSaved,
            { fileName },
            { headers: authHeaders },
          );
          await load();
          return true;
        } catch (deleteError) {
          setError(formatApiError(deleteError));
          return false;
        } finally {
          setBusy("");
        }
      },
    });
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

  return {
    allowedUser,
    busy,
    compareSavedBackup,
    createBackup,
    created,
    stageSavedBackupDelete,
    diff,
    downloadBackup,
    error,
    inspectSavedBackup,
    inspection,
    isLoading,
    load,
    notice,
    operationStatus,
    restoreSavedBackup,
    state,
    updateSavedBackup,
    updatedZip,
  };
}
