"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Download,
  ExternalLink,
  Eye,
  FileJson,
  History,
  HardDrive,
  Layers3,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { asolApi } from "@/core/api";
import { ApiError } from "@/core/api/api-error";
import { publicEnv } from "@/core/config/public-env";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";

import { DATA_HEALTH_API } from "../config";
import type {
  DataHealthAuditEntry,
  DataHealthCleanupPlan,
  DataHealthCleanupResult,
  DataHealthHistoryEntry,
  DataHealthIssue,
  DataHealthOrderPurgePlan,
  DataHealthOrderPurgeResult,
  DataHealthQuarantineEntry,
  DataHealthReport,
  DataHealthSchemaComparison,
  DataHealthTopologyStatus,
} from "../domain/types";

const PAGE_SIZE = 50;

const severityLabels = {
  critical: "حرج",
  warning: "تحذير",
  info: "معلومة",
} as const;

const categoryLabels: Record<DataHealthIssue["category"], string> = {
  database: "قواعد البيانات",
  user: "المستخدمون",
  profile: "البروفايلات",
  product: "المنتجات",
  image: "الصور",
  order: "الطلبات",
  relationship: "العلاقات",
  advertisement: "الإعلانات",
  discount: "الخصومات",
};

const cleanupLabels: Record<DataHealthIssue["cleanupAction"], string> = {
  "archive-product": "أرشفة المنتج",
  "archive-order": "أرشفة الطلب",
  "delete-broken-relation": "حذف العلاقة المكسورة",
  "quarantine-record": "حجر السجل",
  "quarantine-storage-object": "حجر ملف الصورة",
  "delete-storage-object": "حذف ملف الصورة",
  none: "فحص يدوي",
};

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

function severityClass(severity: DataHealthIssue["severity"]) {
  if (severity === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "warning")
    return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

interface HistoryResponse {
  runs: DataHealthHistoryEntry[];
  audit: DataHealthAuditEntry[];
  quarantine: DataHealthQuarantineEntry[];
}

export function DataHealthPage() {
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
    if (!report) return;
    const content =
      format === "json"
        ? JSON.stringify(report, null, 2)
        : [
            [
              "severity",
              "category",
              "database",
              "table",
              "recordId",
              "ownerUid",
              "state",
              "action",
              "title",
              "details",
            ],
            ...report.issues.map((issue) => [
              issue.severity,
              issue.category,
              issue.database,
              issue.table,
              issue.recordId,
              issue.ownerUid,
              issue.state,
              issue.cleanupAction,
              issue.title,
              issue.details,
            ]),
          ]
            .map((row) =>
              row
                .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                .join(","),
            )
            .join("\n");
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `data-health-${report.environment}-${report.runId}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
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

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>
    );
  }
  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-on-surface">
            <DatabaseZap className="h-6 w-6 text-primary" />
            سلامة البيانات
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <span>
              فحص العلاقات والصور وبنية القواعد مع تنظيف مؤكد وقابل للتدقيق.
            </span>
            {report ? (
              <span
                className={`rounded border px-2 py-0.5 text-xs ${
                  report.environment === "production"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {report.execution.runtime === "production-cloud"
                  ? "المصدر الفعلي: Turso وR2"
                  : "المصدر الفعلي: SQLite والتخزين المحلي"}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="تصدير JSON"
            onClick={() => exportReport("json")}
            disabled={!report}
          >
            <FileJson className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="تصدير CSV"
            onClick={() => exportReport("csv")}
            disabled={!report}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button type="button" onClick={scan} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "جاري الفحص" : "فحص جديد"}
          </Button>
        </div>
      </header>

      {report ? (
        <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <Summary label="السجلات المفحوصة" value={report.scannedRecords} />
          <Summary label="المشكلات" value={report.summary.total} />
          <Summary label="حرج" value={report.summary.critical} tone="red" />
          <Summary label="تحذير" value={report.summary.warning} tone="amber" />
          <Summary label="معلومات" value={report.summary.info} tone="blue" />
          <Summary
            label="قابل للتنظيف"
            value={report.summary.cleanable}
            tone="green"
          />
          <Summary
            label="في الحجر"
            value={report.summary.quarantined}
            tone="amber"
          />
        </section>
      ) : null}

      {report ? <TopologyPanel report={report} /> : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </div>
      ) : null}

      <Tabs
        defaultValue="findings"
        dir="rtl"
        onValueChange={(value) => {
          if (value === "schema") void loadSchemaComparison();
        }}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="findings">النتائج</TabsTrigger>
          <TabsTrigger value="schema">مقارنة البنية</TabsTrigger>
          <TabsTrigger value="history">السجل والتدقيق</TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="space-y-3">
          <Filters
            query={query}
            setQuery={setQuery}
            severity={severity}
            setSeverity={setSeverity}
            category={category}
            setCategory={setCategory}
            database={database}
            setDatabase={setDatabase}
            state={state}
            setState={setState}
            databases={databases}
            cleanableOnly={cleanableOnly}
            setCleanableOnly={setCleanableOnly}
          />

          <section className="overflow-hidden rounded-md border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                {filtered.length} نتيجة
              </div>
              <div className="text-xs text-on-surface-variant">
                آخر فحص {dateText(report?.generatedAt)}، استغرق{" "}
                {report?.durationMs ?? 0} مللي ثانية
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="bg-muted/50 text-xs text-on-surface-variant">
                  <tr>
                    <th className="w-12 p-3 text-start">
                      <input
                        type="checkbox"
                        aria-label="تحديد النتائج الظاهرة"
                        checked={
                          visible.some((issue) => issue.canClean) &&
                          visible
                            .filter((issue) => issue.canClean)
                            .every((issue) => selectedIds.has(issue.id))
                        }
                        onChange={toggleVisible}
                      />
                    </th>
                    <th className="p-3 text-start">المشكلة</th>
                    <th className="p-3 text-start">التصنيف</th>
                    <th className="p-3 text-start">المصدر</th>
                    <th className="p-3 text-start">الحالة</th>
                    <th className="p-3 text-start">الإجراء</th>
                    <th className="w-24 p-3 text-start">فتح</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((issue) => (
                    <tr key={issue.id} className="border-t align-top">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(issue.id)}
                          disabled={!issue.canClean}
                          onChange={() => toggleIssue(issue)}
                          aria-label={`تحديد ${issue.title}`}
                        />
                      </td>
                      <td className="max-w-md p-3">
                        <div className="font-medium">{issue.title}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                          {issue.details}
                        </div>
                        <div
                          className="mt-1 break-all text-xs text-on-surface-variant"
                          dir="ltr"
                        >
                          {issue.recordId}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs ${severityClass(issue.severity)}`}
                        >
                          {severityLabels[issue.severity]}
                        </span>
                        <div className="mt-2 text-xs text-on-surface-variant">
                          {categoryLabels[issue.category]}
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        <div>{issue.database}</div>
                        <div className="text-on-surface-variant">
                          {issue.table}
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        {issue.state === "new"
                          ? "جديدة"
                          : issue.state === "recurring"
                            ? "متكررة"
                            : issue.state === "quarantined"
                              ? "في الحجر"
                              : "متجاهلة"}
                      </td>
                      <td className="p-3 text-xs">
                        <span
                          className={`rounded-full px-2 py-1 ${
                            issue.canClean
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {cleanupLabels[issue.cleanupAction]}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="عرض التفاصيل"
                            onClick={() => setDetail(issue)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {issue.route ? (
                            <Button
                              asChild
                              size="icon"
                              variant="ghost"
                              title="فتح السجل"
                            >
                              <Link href={issue.route}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && !loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-10 text-center text-on-surface-variant"
                      >
                        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                        لا توجد نتائج مطابقة للفلاتر الحالية.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t p-3 text-sm">
              <span>
                صفحة {page} من {pageCount}
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  title="الصفحة السابقة"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  title="الصفحة التالية"
                  disabled={page >= pageCount}
                  onClick={() =>
                    setPage((value) => Math.min(pageCount, value + 1))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-surface p-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-green-700" />
                تنظيف آمن للعناصر المحددة
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                لا توجد عناصر محددة تلقائيًا. ستظهر معاينة جديدة وتُعاد مطابقة
                كل بصمة قبل التنفيذ.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={planning || selected.length === 0}
              onClick={createPlan}
            >
              <Trash2 className="h-4 w-4" />
              {planning
                ? "جاري إعداد المعاينة"
                : `معاينة تنظيف ${selected.length}`}
            </Button>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                <Trash2 className="h-4 w-4" />
                حذف جميع الطلبات
              </div>
              <p className="mt-1 text-xs text-red-700">
                يشمل الطلبات العادية والمخصصة والمختلطة وكل السجلات التابعة وصور
                الطلبات المخصصة. يتم حذف الصور والبيانات فعليًا بدون أرشفة أو
                جدولة حذف.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={orderPurgeBusy}
                onClick={createOrderPurgePlan}
              >
                <Trash2 className="h-4 w-4" />
                {orderPurgeBusy ? "جاري الإعداد" : "معاينة حذف جميع الطلبات"}
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="schema">
          <SchemaPanel report={report} loading={schemaLoading} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryPanel
            history={history}
            onRelease={releaseQuarantine}
            onDeleteImage={deleteQuarantinedImage}
            onClearQuarantine={clearQuarantine}
            onClearRunHistory={clearRunHistory}
            onClearCleanupAudit={clearCleanupAudit}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        <DialogContent
          className="max-h-[85vh] max-w-2xl overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
            <DialogDescription>{detail?.details}</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <DetailRow
                label="الخطورة"
                value={severityLabels[detail.severity]}
              />
              <DetailRow
                label="المصدر"
                value={`${detail.database}.${detail.table}`}
              />
              <DetailRow label="معرف السجل" value={detail.recordId} ltr />
              <DetailRow label="المالك" value={detail.ownerUid || "-"} ltr />
              <DetailRow
                label="الإجراء"
                value={cleanupLabels[detail.cleanupAction]}
              />
              <div>
                <div className="mb-1 text-xs text-on-surface-variant">
                  الدليل
                </div>
                <pre
                  className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs"
                  dir="ltr"
                >
                  {JSON.stringify(detail.evidence, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(plan)}
        onOpenChange={(open) => !open && setPlan(null)}
      >
        <DialogContent
          className="max-h-[85vh] max-w-2xl overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>معاينة خطة التنظيف</DialogTitle>
            <DialogDescription>
              الخطة صالحة حتى {dateText(plan?.expiresAt)} ولا يمكن استخدامها
              أكثر من مرة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {plan?.preview.map((item) => (
              <div key={item.issueId} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{item.title}</div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  {cleanupLabels[item.action]}،{" "}
                  {item.cleanupMode === "quarantine"
                    ? "حجر 30 يومًا"
                    : "تنفيذ مباشر"}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              اكتب العبارة التالية للتأكيد:
            </label>
            <div className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
              {plan?.confirmationText}
            </div>
            <Input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPlan(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={
                cleaning || !plan || confirmationText !== plan.confirmationText
              }
              onClick={executePlan}
            >
              <Trash2 className="h-4 w-4" />
              {cleaning ? "جاري التنفيذ" : "تنفيذ الخطة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(orderPurgePlan)}
        onOpenChange={(open) => {
          if (!open && !orderPurgeBusy) setOrderPurgePlan(null);
        }}
      >
        <DialogContent
          className="max-h-[85vh] max-w-2xl overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>معاينة حذف جميع الطلبات</DialogTitle>
            <DialogDescription>
              هذه عملية نهائية تشمل كل أنواع الطلبات والسجلات التابعة لها. الخطة
              صالحة حتى {dateText(orderPurgePlan?.expiresAt)}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-3">
            <DetailRow
              label="الطلبات"
              value={String(orderPurgePlan?.orderCount ?? 0)}
            />
            <DetailRow
              label="صور الطلبات"
              value={String(orderPurgePlan?.imageCount ?? 0)}
            />
            <DetailRow
              label="المصدر"
              value={`${orderPurgePlan?.databaseSource ?? "-"} / ${orderPurgePlan?.storageSource ?? "-"}`}
              ltr
            />
          </div>
          <div className="max-h-52 overflow-y-auto rounded-md border">
            {Object.entries(orderPurgePlan?.tableCounts ?? {}).map(
              ([table, count]) => (
                <div
                  key={table}
                  className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0"
                >
                  <span dir="ltr">{table}</span>
                  <span>{count}</span>
                </div>
              ),
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              اكتب العبارة التالية حرفيًا للتأكيد:
            </label>
            <div className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
              {orderPurgePlan?.confirmationText}
            </div>
            <Input
              value={orderPurgeConfirmation}
              onChange={(event) =>
                setOrderPurgeConfirmation(event.target.value)
              }
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={orderPurgeBusy}
              onClick={() => setOrderPurgePlan(null)}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={
                orderPurgeBusy ||
                !orderPurgePlan ||
                orderPurgeConfirmation !== orderPurgePlan.confirmationText
              }
              onClick={executeOrderPurge}
            >
              <Trash2 className="h-4 w-4" />
              {orderPurgeBusy ? "جاري الحذف" : "حذف جميع الطلبات نهائيًا"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}

function topologyStatusClass(status: DataHealthTopologyStatus) {
  if (status === "ready") return "border-green-200 bg-green-50 text-green-700";
  if (status === "warning")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "unavailable") return "border-red-200 bg-red-50 text-red-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
}

function topologyStatusLabel(status: DataHealthTopologyStatus) {
  if (status === "ready") return "متصل";
  if (status === "warning") return "بحاجة إلى انتباه";
  if (status === "unavailable") return "غير متاح";
  return "خارج هذه البيئة";
}

function TopologyPanel({ report }: { report: DataHealthReport }) {
  const profileShards = report.topology.databases.filter(
    (database) => database.kind === "profile-shard",
  );
  const orderShards = report.topology.databases.filter(
    (database) => database.kind === "order-shard",
  );
  const coreDatabases = report.topology.databases.filter(
    (database) => database.kind === "core",
  );

  return (
    <section className="overflow-hidden rounded-md border bg-surface" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Layers3 className="h-4 w-4 text-primary" />
          خريطة قواعد البيانات والتخزين الفعلية
        </div>
        <div className="text-xs text-on-surface-variant">
          فحص اتصال مستقل لكل قاعدة ومخزن أثناء هذه العملية
        </div>
      </div>

      <div
        className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0"
        dir="rtl"
      >
        <div className="p-3">
          <TopologyDatabaseGroup
            label="قواعد النظام الأساسية"
            items={coreDatabases}
          />
          <TopologyDatabaseGroup
            label={`قواعد ملفات التعريف (${profileShards.length})`}
            items={profileShards}
          />
          <TopologyDatabaseGroup
            label={`قواعد الطلبات (${orderShards.length})`}
            items={orderShards}
          />
        </div>

        <div className="p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <HardDrive className="h-4 w-4 text-primary" />
            مخازن الصور
          </div>
          <div className="space-y-2">
            {report.topology.storage.map((storage) => (
              <div key={storage.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-sm font-semibold" dir="ltr">
                      {storage.id}
                    </div>
                    <div className="mt-1 text-xs text-on-surface-variant">
                      {storage.kind === "primary-r2"
                        ? "R2 الجديد: صور الحساب والمحتوى والطلبات الخاصة"
                        : storage.kind === "product-r2"
                          ? "R2 القديم: صور المنتجات فقط"
                          : "النسخة المحلية الموحدة للصور"}
                    </div>
                  </div>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${topologyStatusClass(storage.status)}`}
                  >
                    {topologyStatusLabel(storage.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <div className="text-on-surface-variant">
                      ملفات مرجعية / مكتشفة
                    </div>
                    <div className="mt-0.5 font-medium">
                      {storage.referencedObjects} / {storage.discoveredObjects}
                    </div>
                  </div>
                  <div>
                    <div className="text-on-surface-variant">أنواع الحفظ</div>
                    <div className="mt-0.5 break-words font-mono" dir="ltr">
                      {storage.profiles.join(", ") || "-"}
                    </div>
                  </div>
                </div>
                {storage.cloudFolders.length > 0 ? (
                  <div
                    className="mt-2 break-all text-xs text-on-surface-variant"
                    dir="ltr"
                  >
                    {storage.cloudFolders.join(" | ")}
                  </div>
                ) : null}
                {storage.message ? (
                  <div className="mt-2 break-words text-xs text-amber-800">
                    {storage.message}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-2 text-sm font-semibold">
              كل مصادر الصور المفحوصة
            </div>
            <div className="overflow-hidden rounded-md border">
              {report.topology.imageSources.map((source) => (
                <div
                  key={`${source.database}.${source.table}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b p-2.5 text-sm last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-medium" dir="ltr">
                      {source.database}.{source.table}
                    </div>
                    <div
                      className="mt-1 break-words text-xs text-on-surface-variant"
                      dir="ltr"
                    >
                      {source.columns.join(", ")}
                    </div>
                  </div>
                  <div className="text-end text-xs text-on-surface-variant">
                    <div>
                      {source.ownership === "owned"
                        ? "ملف مُدار"
                        : source.ownership === "shared-snapshot"
                          ? "لقطة مشتركة"
                          : source.ownership === "static-asset"
                            ? "ملف ثابت"
                            : "مهمة حذف"}
                    </div>
                    {source.storageProfileId ? (
                      <div className="mt-1 font-mono" dir="ltr">
                        {source.storageProfileId}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopologyDatabaseGroup({
  label,
  items,
}: {
  label: string;
  items: DataHealthReport["topology"]["databases"];
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 text-xs font-semibold text-on-surface-variant">
        {label}
      </div>
      <div className="overflow-hidden rounded-md border">
        {items.map((database) => (
          <div
            key={database.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b p-2.5 text-sm last:border-b-0"
          >
            <div className="min-w-0">
              <div className="font-mono font-medium" dir="ltr">
                {database.id}
              </div>
              <div
                className="mt-1 line-clamp-2 text-xs text-on-surface-variant"
                dir="ltr"
              >
                {database.tables.length > 0
                  ? database.tables.join(", ")
                  : "لا توجد جداول قابلة للعرض"}
              </div>
              {database.message ? (
                <div className="mt-1 break-words text-xs text-red-700">
                  {database.message}
                </div>
              ) : null}
            </div>
            <span
              className={`h-fit whitespace-nowrap rounded border px-2 py-0.5 text-xs ${topologyStatusClass(database.status)}`}
            >
              {topologyStatusLabel(database.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Filters(props: {
  query: string;
  setQuery: (value: string) => void;
  severity: string;
  setSeverity: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  database: string;
  setDatabase: (value: string) => void;
  state: string;
  setState: (value: string) => void;
  databases: string[];
  cleanableOnly: boolean;
  setCleanableOnly: (value: boolean) => void;
}) {
  return (
    <section className="grid gap-2 rounded-md border bg-surface p-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,0.7fr)_auto]">
      <label className="relative">
        <Search className="absolute right-3 top-3 h-4 w-4 text-on-surface-variant" />
        <Input
          value={props.query}
          onChange={(event) => props.setQuery(event.target.value)}
          placeholder="بحث بالمالك أو المعرف أو وصف المشكلة"
          className="pr-9"
        />
      </label>
      <FilterSelect value={props.severity} onChange={props.setSeverity}>
        <option value="all">كل الخطورة</option>
        <option value="critical">حرج</option>
        <option value="warning">تحذير</option>
        <option value="info">معلومة</option>
      </FilterSelect>
      <FilterSelect value={props.category} onChange={props.setCategory}>
        <option value="all">كل الأنواع</option>
        {Object.entries(categoryLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect value={props.database} onChange={props.setDatabase}>
        <option value="all">كل القواعد</option>
        {props.databases.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect value={props.state} onChange={props.setState}>
        <option value="all">كل الحالات</option>
        <option value="new">جديدة</option>
        <option value="recurring">متكررة</option>
        <option value="quarantined">في الحجر</option>
      </FilterSelect>
      <label className="flex items-center gap-2 px-1 text-sm">
        <input
          type="checkbox"
          checked={props.cleanableOnly}
          onChange={(event) => props.setCleanableOnly(event.target.checked)}
        />
        قابل للتنظيف
      </label>
    </section>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
    >
      {children}
    </select>
  );
}

function SchemaPanel({
  report,
  loading,
}: {
  report: DataHealthReport | null;
  loading: boolean;
}) {
  const comparison = report?.schemaComparison;
  return (
    <section className="space-y-3">
      <div className="rounded-md border bg-surface p-3 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <DatabaseZap className="h-4 w-4" />
          مقارنة قراءة فقط
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">
          تعمل المقارنة بين SQLite المحلية وTurso فقط في بيئة التطوير، ولا تنفذ
          أي تعديل على القواعد السحابية.
        </p>
      </div>
      {loading ? (
        <div className="rounded-md border bg-surface p-6 text-center text-sm text-on-surface-variant">
          جاري مقارنة بنية قواعد البيانات المحلية والسحابية...
        </div>
      ) : null}
      {!loading &&
      comparison?.available &&
      comparison.databases.length === 0 ? (
        <div className="rounded-md border bg-surface p-6 text-center text-sm text-on-surface-variant">
          لم تُحمّل نتيجة المقارنة بعد.
        </div>
      ) : null}
      {!loading && comparison && !comparison.available ? (
        <div className="rounded-md border bg-surface p-6 text-center text-sm text-on-surface-variant">
          مقارنة البنية متاحة في بيئة التطوير فقط.
        </div>
      ) : null}
      {comparison?.databases.map((database) => (
        <div
          key={database.database}
          className="rounded-md border bg-surface p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{database.database}</div>
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                database.status === "matched"
                  ? "bg-green-50 text-green-700"
                  : database.status === "skipped"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-amber-50 text-amber-800"
              }`}
            >
              {database.status === "matched"
                ? "متطابقة"
                : database.status === "different"
                  ? "توجد فروق"
                  : database.status === "skipped"
                    ? "غير متاح"
                    : "فشل الفحص"}
            </span>
          </div>
          {database.message ? (
            <p className="mt-2 text-sm text-on-surface-variant">
              {database.message}
            </p>
          ) : null}
          {database.sqliteVersion ? (
            <div className="mt-2 grid gap-2 text-xs md:grid-cols-2" dir="ltr">
              <div className="break-all rounded bg-muted p-2">
                SQLite: {database.sqliteVersion}
              </div>
              <div className="break-all rounded bg-muted p-2">
                Turso: {database.tursoVersion}
              </div>
            </div>
          ) : null}
          {[
            ...database.operations.map((item) => item.description),
            ...database.warnings,
          ]
            .slice(0, 100)
            .map((message, index) => (
              <div
                key={`${message}-${index}`}
                className="mt-2 border-t pt-2 text-xs"
              >
                {message}
              </div>
            ))}
        </div>
      ))}
    </section>
  );
}

function HistoryPanel({
  history,
  onRelease,
  onDeleteImage,
  onClearQuarantine,
  onClearRunHistory,
  onClearCleanupAudit,
}: {
  history: HistoryResponse;
  onRelease: (id: string) => Promise<void>;
  onDeleteImage: (id: string) => Promise<void>;
  onClearQuarantine: () => Promise<void>;
  onClearRunHistory: () => Promise<void>;
  onClearCleanupAudit: () => Promise<void>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="overflow-hidden rounded-md border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2 font-semibold">
            <History className="h-4 w-4" />
            سجل الفحوصات
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={history.runs.length === 0}
            onClick={() => void onClearRunHistory()}
          >
            <Trash2 className="h-4 w-4" />
            حذف السجل
          </Button>
        </div>
        <div className="divide-y">
          {history.runs.map((run) => (
            <div
              key={run.id}
              className="grid grid-cols-[1fr_auto] gap-2 p-3 text-sm"
            >
              <div>
                <div>{dateText(run.completedAt || run.startedAt)}</div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  {run.scannedRecords} سجل، {run.total} مشكلة، {run.critical}{" "}
                  حرجة
                </div>
              </div>
              <span className="text-xs text-on-surface-variant">
                {run.durationMs} ms
              </span>
            </div>
          ))}
          {history.runs.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              لا يوجد سجل بعد.
            </div>
          ) : null}
        </div>
      </section>
      <section className="overflow-hidden rounded-md border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            تدقيق التنظيف
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={history.audit.length === 0}
            onClick={() => void onClearCleanupAudit()}
          >
            <Trash2 className="h-4 w-4" />
            حذف التدقيق
          </Button>
        </div>
        <div className="divide-y">
          {history.audit.map((entry) => (
            <div key={entry.id} className="p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>{entry.action}</span>
                <span
                  className={
                    entry.status === "cleaned"
                      ? "text-green-700"
                      : "text-amber-700"
                  }
                >
                  {entry.status === "cleaned" ? "تم" : "تم التجاوز"}
                </span>
              </div>
              <div
                className="mt-1 break-all text-xs text-on-surface-variant"
                dir="ltr"
              >
                {entry.recordId}
              </div>
              <div className="mt-1 text-xs text-on-surface-variant">
                {dateText(entry.createdAt)}، المسؤول {entry.adminUid}
              </div>
            </div>
          ))}
          {history.audit.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              لم تُنفذ عمليات تنظيف بعد.
            </div>
          ) : null}
        </div>
      </section>
      <section className="overflow-hidden rounded-md border bg-surface xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            الحجر الصحي
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={history.quarantine.length === 0}
            onClick={() => void onClearQuarantine()}
          >
            <Trash2 className="h-4 w-4" />
            تنظيف الحجر
          </Button>
        </div>
        <div className="divide-y">
          {history.quarantine.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {entry.resourceType === "image" ? "ملف صورة" : "سجل"} في الحجر
                </div>
                <div
                  className="mt-1 break-all text-xs text-on-surface-variant"
                  dir="ltr"
                >
                  {entry.resourceKey ||
                    `${entry.database}.${entry.table}:${entry.recordId}`}
                </div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  مؤهل للحذف {dateText(entry.eligibleForDeletionAt)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void onRelease(entry.id)}
                >
                  إخراج من الحجر
                </Button>
                {entry.resourceType === "image" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!entry.eligible}
                    onClick={() => void onDeleteImage(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف فعلي
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {history.quarantine.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              لا توجد عناصر في الحجر.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function DetailRow({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b pb-2 sm:grid-cols-[140px_1fr]">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="break-all" dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "red" | "amber" | "blue" | "green";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : tone === "green"
            ? "border-green-200 bg-green-50 text-green-700"
            : "bg-surface text-on-surface";
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
