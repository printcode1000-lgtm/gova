"use client";

import * as React from "react";

import { asolApi } from "@/core/api";
import { ApiError } from "@/core/api/api-error";
import { publicEnv } from "@/core/config/public-env";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";

import { DATA_HEALTH_API } from "../config";
import { exportDataHealthReport } from "./data-health-export";
import { PAGE_SIZE, type HistoryResponse } from "./data-health-page-types";
import type {
  DataHealthCleanupPlan,
  DataHealthCleanupResult,
  DataHealthIssue,
  DataHealthOrderPurgePlan,
  DataHealthOrderPurgeResult,
  DataHealthReport,
  DataHealthSchemaComparison,
} from "@asol/data-health-core";

export function useDataHealthPage() {
  const { session, isLoading } = useSession();
  const allowed = !isLoading && isSuperAdmin(session);
  const [report, setReport] = React.useState<DataHealthReport | null>(null);
  const [history, setHistory] = React.useState<HistoryResponse>({
    runs: [],
    audit: [],
    quarantine: [],
  });
  const [loading, setLoading] = React.useState(false);
  const [planning, setPlanning] = React.useState(false);
  const [cleaning, setCleaning] = React.useState(false);
  const [schemaLoading, setSchemaLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [severity, setSeverity] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [database, setDatabase] = React.useState("all");
  const [state, setState] = React.useState("all");
  const [cleanableOnly, setCleanableOnly] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [page, setPage] = React.useState(1);
  const [detail, setDetail] = React.useState<DataHealthIssue | null>(null);
  const [plan, setPlan] = React.useState<DataHealthCleanupPlan | null>(null);
  const [confirmationText, setConfirmationText] = React.useState("");
  const [orderPurgePlan, setOrderPurgePlan] =
    React.useState<DataHealthOrderPurgePlan | null>(null);
  const [orderPurgeConfirmation, setOrderPurgeConfirmation] =
    React.useState("");
  const [orderPurgeBusy, setOrderPurgeBusy] = React.useState(false);

  const authHeaders = React.useMemo(
    () =>
      session?.sessionToken
        ? { "x-asol-session-token": session.sessionToken }
        : undefined,
    [session?.sessionToken],
  );

  const loadHistory = React.useCallback(async () => {
    if (!authHeaders) return;
    const next = await asolApi.get<HistoryResponse>(DATA_HEALTH_API.history, {
      headers: authHeaders,
    });
    setHistory(next);
  }, [authHeaders]);

  const scan = React.useCallback(async () => {
    if (!authHeaders || !isSuperAdmin(session)) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const next = await asolApi.get<DataHealthReport>(DATA_HEALTH_API.scan, {
        headers: authHeaders,
      });
      if (
        publicEnv.mode === "static" &&
        next.execution.runtime !== "production-cloud"
      ) {
        throw new Error("نسخة static out يجب أن تتصل بخادم Turso وR2 فقط");
      }
      setReport(next);
      setSelectedIds(new Set());
      setPage(1);
      await loadHistory();
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "تعذر فحص سلامة البيانات",
      );
    } finally {
      setLoading(false);
    }
  }, [authHeaders, loadHistory, session]);

  const loadSchemaComparison = React.useCallback(async () => {
    if (!authHeaders || !isSuperAdmin(session) || schemaLoading) return;
    if (report && !report.execution.schemaComparisonAllowed) return;
    if (report?.schemaComparison.databases.length) return;
    setSchemaLoading(true);
    setError("");
    try {
      const comparison = await asolApi.get<DataHealthSchemaComparison>(
        DATA_HEALTH_API.schema,
        { headers: authHeaders },
      );
      setReport((current) =>
        current ? { ...current, schemaComparison: comparison } : current,
      );
    } catch (schemaError) {
      setError(
        schemaError instanceof Error
          ? schemaError.message
          : "تعذر مقارنة بنية قواعد البيانات",
      );
    } finally {
      setSchemaLoading(false);
    }
  }, [authHeaders, report, schemaLoading, session]);

  React.useEffect(() => {
    if (allowed) void scan();
  }, [allowed, scan]);

  const databases = React.useMemo(
    () => [...new Set((report?.issues ?? []).map((issue) => issue.database))],
    [report?.issues],
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (report?.issues ?? []).filter((issue) => {
      if (severity !== "all" && issue.severity !== severity) return false;
      if (category !== "all" && issue.category !== category) return false;
      if (database !== "all" && issue.database !== database) return false;
      if (state !== "all" && issue.state !== state) return false;
      if (cleanableOnly && !issue.canClean) return false;
      if (!needle) return true;
      return [
        issue.title,
        issue.details,
        issue.database,
        issue.table,
        issue.recordId,
        issue.ownerUid,
        issue.relatedId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [
    category,
    cleanableOnly,
    database,
    query,
    report?.issues,
    severity,
    state,
  ]);

  React.useEffect(
    () => setPage(1),
    [query, severity, category, database, state, cleanableOnly],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = (report?.issues ?? []).filter(
    (issue) => issue.canClean && selectedIds.has(issue.id),
  );

  const toggleIssue = (issue: DataHealthIssue) => {
    if (!issue.canClean) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(issue.id)) next.delete(issue.id);
      else next.add(issue.id);
      return next;
    });
  };

  const toggleVisible = () => {
    const cleanable = visible.filter((issue) => issue.canClean);
    const allSelected = cleanable.every((issue) => selectedIds.has(issue.id));
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const issue of cleanable) {
        if (allSelected) next.delete(issue.id);
        else next.add(issue.id);
      }
      return next;
    });
  };

  const createPlan = async () => {
    if (!authHeaders || selected.length === 0) return;
    setPlanning(true);
    setError("");
    try {
      const next = await asolApi.post<DataHealthCleanupPlan>(
        DATA_HEALTH_API.plan,
        { issueIds: selected.map((issue) => issue.id) },
        { headers: authHeaders },
      );
      setPlan(next);
      setConfirmationText("");
    } catch (planError) {
      setError(
        planError instanceof Error
          ? planError.message
          : "تعذر إنشاء معاينة التنظيف",
      );
    } finally {
      setPlanning(false);
    }
  };

  const executePlan = async () => {
    if (!authHeaders || !plan || confirmationText !== plan.confirmationText) {
      return;
    }
    setCleaning(true);
    setError("");
    try {
      const result = await asolApi.post<DataHealthCleanupResult>(
        DATA_HEALTH_API.cleanup,
        { planId: plan.id, confirmationText },
        { headers: authHeaders },
      );
      setReport(result.report);
      setPlan(null);
      setConfirmationText("");
      setSelectedIds(new Set());
      setNotice(
        `تم تنفيذ ${result.cleaned.length} إجراء، وتجاوز ${result.skipped.length} عنصر تغير أو لم يعد صالحًا للتنظيف.`,
      );
      await loadHistory();
    } catch (cleanupError) {
      setError(
        cleanupError instanceof Error
          ? cleanupError.message
          : "تعذر تنفيذ خطة التنظيف",
      );
    } finally {
      setCleaning(false);
    }
  };

  const createOrderPurgePlan = async () => {
    if (!authHeaders) return;
    setOrderPurgeBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await asolApi.post<DataHealthOrderPurgePlan>(
        DATA_HEALTH_API.orderPurgePlan,
        {},
        { headers: authHeaders, suppressErrorLog: true },
      );
      setOrderPurgePlan(next);
      setOrderPurgeConfirmation("");
    } catch (purgeError) {
      if (
        purgeError instanceof ApiError &&
        purgeError.message === "dataHealthNoOrdersToPurge"
      ) {
        setNotice("لا توجد طلبات محفوظة حاليًا للحذف.");
        return;
      }
      setError(
        purgeError instanceof Error
          ? purgeError.message
          : "تعذر إعداد معاينة حذف الطلبات",
      );
    } finally {
      setOrderPurgeBusy(false);
    }
  };

  const executeOrderPurge = async () => {
    if (
      !authHeaders ||
      !orderPurgePlan ||
      orderPurgeConfirmation !== orderPurgePlan.confirmationText
    ) {
      return;
    }
    setOrderPurgeBusy(true);
    setError("");
    try {
      const result = await asolApi.post<DataHealthOrderPurgeResult>(
        DATA_HEALTH_API.orderPurge,
        {
          planId: orderPurgePlan.id,
          confirmationText: orderPurgeConfirmation,
        },
        { headers: authHeaders },
      );
      setOrderPurgePlan(null);
      setOrderPurgeConfirmation("");
      setNotice(
        `تم حذف ${result.deletedOrders} طلب و${result.deletedImages} صورة نهائيًا بدون أرشفة أو جدولة حذف.`,
      );
      await scan();
    } catch (purgeError) {
      setError(
        purgeError instanceof Error ? purgeError.message : "تعذر حذف الطلبات",
      );
    } finally {
      setOrderPurgeBusy(false);
    }
  };

  const exportReport = (format: "json" | "csv") => {
    if (report) exportDataHealthReport(report, format);
  };

  const releaseQuarantine = async (quarantineId: string) => {
    if (!authHeaders) return;
    setError("");
    try {
      await asolApi.post(
        DATA_HEALTH_API.quarantineRelease,
        { quarantineId },
        { headers: authHeaders },
      );
      await loadHistory();
      setNotice("تم إخراج العنصر من الحجر.");
    } catch (releaseError) {
      setError(
        releaseError instanceof Error
          ? releaseError.message
          : "تعذر إخراج العنصر من الحجر",
      );
    }
  };

  const deleteQuarantinedImage = async (quarantineId: string) => {
    if (
      !authHeaders ||
      !window.confirm(
        "سيُحذف ملف الصورة فعليًا بعد إعادة التحقق من أنه ما زال بلا مرجع. هل تريد المتابعة؟",
      )
    ) {
      return;
    }
    setError("");
    try {
      const result = await asolApi.post<{ report: DataHealthReport }>(
        DATA_HEALTH_API.quarantineDelete,
        { quarantineId, confirm: "DELETE_QUARANTINED_IMAGE" },
        { headers: authHeaders },
      );
      setReport(result.report);
      await loadHistory();
      setNotice("تم حذف ملف الصورة اليتيم بعد إعادة التحقق.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "تعذر حذف ملف الصورة المحجور",
      );
    }
  };

  const clearQuarantine = async () => {
    if (
      !authHeaders ||
      !window.confirm(
        "سيتم حذف كل عناصر الحجر مع ملفات التخزين والسجلات الأصلية المرتبطة بها. العناصر التي يفشل حذفها ستبقى في الحجر. هل تريد المتابعة؟",
      )
    ) {
      return;
    }
    setError("");
    try {
      const result = await asolApi.post<{
        cleared: number;
        clearedAt: string;
        deletedStorageObjects: number;
        deletedRecords: number;
        skipped: Array<{ id: string; reason: string }>;
      }>(
        DATA_HEALTH_API.quarantineClear,
        { confirm: "CLEAR_DATA_HEALTH_QUARANTINE" },
        { headers: authHeaders },
      );
      await loadHistory();
      await scan();
      setNotice(
        `تم تنظيف ${result.cleared} عنصر من الحجر، وحذف ${result.deletedStorageObjects} ملف تخزين و${result.deletedRecords} سجل أصلي${
          result.skipped.length > 0
            ? `، وتعذر تنظيف ${result.skipped.length} عنصر`
            : ""
        }.`,
      );
    } catch (clearError) {
      setError(
        clearError instanceof Error ? clearError.message : "تعذر تنظيف الحجر",
      );
    }
  };

  const clearRunHistory = async () => {
    if (
      !authHeaders ||
      !window.confirm(
        "سيتم حذف سجل الفحوصات ونتائج الفحوصات السابقة فقط. لن يتم حذف الحجر أو البيانات الفعلية. هل تريد المتابعة؟",
      )
    ) {
      return;
    }
    setError("");
    try {
      const result = await asolApi.post<{
        runs: number;
        findings: number;
        clearedAt: string;
      }>(
        DATA_HEALTH_API.historyRunsClear,
        { confirm: "CLEAR_DATA_HEALTH_RUN_HISTORY" },
        { headers: authHeaders },
      );
      await loadHistory();
      setNotice(
        `تم حذف ${result.runs} فحص و${result.findings} نتيجة فحص من السجل.`,
      );
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "تعذر حذف سجل الفحوصات",
      );
    }
  };

  const clearCleanupAudit = async () => {
    if (
      !authHeaders ||
      !window.confirm(
        "سيتم حذف سجلات تدقيق التنظيف فقط. لن يتم حذف الحجر أو البيانات الفعلية. هل تريد المتابعة؟",
      )
    ) {
      return;
    }
    setError("");
    try {
      const result = await asolApi.post<{
        audit: number;
        clearedAt: string;
      }>(
        DATA_HEALTH_API.historyAuditClear,
        { confirm: "CLEAR_DATA_HEALTH_CLEANUP_AUDIT" },
        { headers: authHeaders },
      );
      await loadHistory();
      setNotice(`تم حذف ${result.audit} سجل من تدقيق التنظيف.`);
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "تعذر حذف سجلات تدقيق التنظيف",
      );
    }
  };

  return {
    allowed,
    category,
    cleanableOnly,
    cleaning,
    clearCleanupAudit,
    clearQuarantine,
    clearRunHistory,
    confirmationText,
    createOrderPurgePlan,
    createPlan,
    database,
    databases,
    deleteQuarantinedImage,
    detail,
    error,
    executeOrderPurge,
    executePlan,
    exportReport,
    filtered,
    history,
    isLoading,
    loadSchemaComparison,
    loading,
    notice,
    orderPurgeBusy,
    orderPurgeConfirmation,
    orderPurgePlan,
    page,
    pageCount,
    plan,
    planning,
    query,
    releaseQuarantine,
    report,
    scan,
    schemaLoading,
    selected,
    selectedIds,
    setCategory,
    setCleanableOnly,
    setConfirmationText,
    setDatabase,
    setDetail,
    setOrderPurgeConfirmation,
    setOrderPurgePlan,
    setPage,
    setPlan,
    setQuery,
    setSeverity,
    setState,
    severity,
    state,
    toggleIssue,
    toggleVisible,
    visible,
  };
}
