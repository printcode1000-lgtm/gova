import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import type { DataHealthIssue, DataHealthReport } from "@asol/data-health-core";

import {
  categoryLabels,
  cleanupLabels,
  dateText,
  severityClass,
  severityLabels,
} from "./data-health-labels";
import { DataHealthFilters } from "./DataHealthFilters";
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

export function DataHealthFindingsPanel(props: {
  report: DataHealthReport;
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
  filtered: DataHealthIssue[];
  visible: DataHealthIssue[];
  selectedIds: Set<string>;
  selectedCount: number;
  page: number;
  pageCount: number;
  loading: boolean;
  planning: boolean;
  orderPurgeBusy: boolean;
  onToggleIssue: (issue: DataHealthIssue) => void;
  onToggleVisible: () => void;
  onOpenDetail: (issue: DataHealthIssue) => void;
  onCreatePlan: () => void;
  onCreateOrderPurgePlan: () => void;
  onPageChange: (updater: (value: number) => number) => void;
}) {
  return (
    <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.12-8WL4dp", id: "data-health.data-health-findings-panel.div.12" })} id="data-health.data-health-findings-panel.div" className="space-y-3">
      <DataHealthFilters
        query={props.query}
        setQuery={props.setQuery}
        severity={props.severity}
        setSeverity={props.setSeverity}
        category={props.category}
        setCategory={props.setCategory}
        database={props.database}
        setDatabase={props.setDatabase}
        state={props.state}
        setState={props.setState}
        databases={props.databases}
        cleanableOnly={props.cleanableOnly}
        setCleanableOnly={props.setCleanableOnly}
      />

      <section {...uiAttributes({ uid: "data-health.data-health-findings-panel.section.4-9QVFY8", id: "data-health.data-health-findings-panel.section.4" })} id="data-health.data-health-findings-panel.section" className="overflow-hidden rounded-md border bg-surface">
        <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.13-1lNXCL", id: "data-health.data-health-findings-panel.div.13" })} id="data-health.data-health-findings-panel.div.2" className="flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm">
          <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.14-CC3dP6", id: "data-health.data-health-findings-panel.div.14" })} id="data-health.data-health-findings-panel.div.3" className="flex items-center gap-2 font-semibold">
            <AlertTriangle id="data-health.data-health-findings-panel.alert-triangle" className="h-4 w-4" />
            {props.filtered.length} نتيجة
          </div>
          <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.15-3gPYwo", id: "data-health.data-health-findings-panel.div.15" })} id="data-health.data-health-findings-panel.div.4" className="text-xs text-on-surface-variant">
            آخر فحص {dateText(props.report.generatedAt)}، استغرق{" "}
            {props.report.durationMs} مللي ثانية
          </div>
        </div>
        <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.16-4QIGo8", id: "data-health.data-health-findings-panel.div.16" })} id="data-health.data-health-findings-panel.div.5" className="overflow-x-auto">
          <table {...uiAttributes({ uid: "data-health.data-health-findings-panel.table.2-2IVY6A", id: "data-health.data-health-findings-panel.table.2" })} id="data-health.data-health-findings-panel.table" className="w-full min-w-[1120px] text-sm">
            <thead {...uiAttributes({ uid: "data-health.data-health-findings-panel.thead.2-Ma4dmU", id: "data-health.data-health-findings-panel.thead.2" })} id="data-health.data-health-findings-panel.thead" className="bg-muted/50 text-xs text-on-surface-variant">
              <tr {...uiAttributes({ uid: "data-health.data-health-findings-panel.tr.3-2JO1mD", id: "data-health.data-health-findings-panel.tr.3" })} id="data-health.data-health-findings-panel.tr">
                <th {...uiAttributes({ uid: "data-health.data-health-findings-panel.th.8-10s81R", id: "data-health.data-health-findings-panel.th.8" })} id="data-health.data-health-findings-panel.th" className="w-12 p-3 text-start">
                  <input {...uiAttributes({ uid: "data-health.data-health-findings-panel.input.2-CiI0Vk", id: "data-health.data-health-findings-panel.input.2" })} id="data-health.data-health-findings-panel.input"
                    type="checkbox"
                    aria-label="تحديد النتائج الظاهرة"
                    checked={
                      props.visible.some((issue) => issue.canClean) &&
                      props.visible
                        .filter((issue) => issue.canClean)
                        .every((issue) => props.selectedIds.has(issue.id))
                    }
                    onChange={props.onToggleVisible}
                  />
                </th>
                <th {...uiAttributes({ uid: "data-health.data-health-findings-panel.th.9-Sx95tL", id: "data-health.data-health-findings-panel.th.9" })} id="data-health.data-health-findings-panel.th.2" className="p-3 text-start">المشكلة</th>
                <th {...uiAttributes({ uid: "data-health.data-health-findings-panel.th.10-Pn3toq", id: "data-health.data-health-findings-panel.th.10" })} id="data-health.data-health-findings-panel.th.3" className="p-3 text-start">التصنيف</th>
                <th {...uiAttributes({ uid: "data-health.data-health-findings-panel.th.11-BUWE8V", id: "data-health.data-health-findings-panel.th.11" })} id="data-health.data-health-findings-panel.th.4" className="p-3 text-start">المصدر</th>
                <th {...uiAttributes({ uid: "data-health.data-health-findings-panel.th.12-Xw7JAS", id: "data-health.data-health-findings-panel.th.12" })} id="data-health.data-health-findings-panel.th.5" className="p-3 text-start">الحالة</th>
                <th {...uiAttributes({ uid: "data-health.data-health-findings-panel.th.13-NS10qS", id: "data-health.data-health-findings-panel.th.13" })} id="data-health.data-health-findings-panel.th.6" className="p-3 text-start">الإجراء</th>
                <th {...uiAttributes({ uid: "data-health.data-health-findings-panel.th.14-XKJh16", id: "data-health.data-health-findings-panel.th.14" })} id="data-health.data-health-findings-panel.th.7" className="w-24 p-3 text-start">فتح</th>
              </tr>
            </thead>
            <tbody {...uiAttributes({ uid: "data-health.data-health-findings-panel.tbody.2-2rmsLz", id: "data-health.data-health-findings-panel.tbody.2" })} id="data-health.data-health-findings-panel.tbody">
              {props.visible.map((issue) => (
                <tr key={issue.id} {...uiAttributes({ uid: "data-health.data-health-findings-panel.tr.4-azUS9p", id: "data-health.data-health-findings-panel.tr.4" , instance: createOpaqueUiInstanceId("iter-9747f449b8", String(issue.id))})} className="border-t align-top">
                  <td {...uiAttributes({ uid: "data-health.data-health-findings-panel.td.2-KJO8DL", id: "data-health.data-health-findings-panel.td.2" , instance: createOpaqueUiInstanceId("iter-45e1a1dd7c", String(issue.id))})} className="p-3">
                    <input {...uiAttributes({ uid: "data-health.data-health-findings-panel.input.3-5SVE6h", id: "data-health.data-health-findings-panel.input.3" , instance: createOpaqueUiInstanceId("iter-90132ed3a7", String(issue.id))})}
                      type="checkbox"
                      checked={props.selectedIds.has(issue.id)}
                      disabled={!issue.canClean}
                      onChange={() => props.onToggleIssue(issue)}
                      aria-label={`تحديد ${issue.title}`}
                    />
                  </td>
                  <td {...uiAttributes({ uid: "data-health.data-health-findings-panel.td.3-UgmX6N", id: "data-health.data-health-findings-panel.td.3" , instance: createOpaqueUiInstanceId("iter-af7d3668e3", String(issue.id))})} className="max-w-md p-3">
                    <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.17-2I5QUT", id: "data-health.data-health-findings-panel.div.17" , instance: createOpaqueUiInstanceId("iter-8fba187719", String(issue.id))})} className="font-medium">{issue.title}</div>
                    <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.18-QkDlV0", id: "data-health.data-health-findings-panel.div.18" , instance: createOpaqueUiInstanceId("iter-4ecb4dcde2", String(issue.id))})} className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                      {issue.details}
                    </div>
                    <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.19-S0Uy7q", id: "data-health.data-health-findings-panel.div.19" , instance: createOpaqueUiInstanceId("iter-efa8010808", String(issue.id))})} className="mt-1 break-all text-xs text-on-surface-variant" dir="ltr">
                      {issue.recordId}
                    </div>
                  </td>
                  <td {...uiAttributes({ uid: "data-health.data-health-findings-panel.td.4-3CzvvT", id: "data-health.data-health-findings-panel.td.4" , instance: createOpaqueUiInstanceId("iter-0b8508ead3", String(issue.id))})} className="p-3">
                    <span {...uiAttributes({ uid: "data-health.data-health-findings-panel.span.2-4MBwnT", id: "data-health.data-health-findings-panel.span.2" , instance: createOpaqueUiInstanceId("iter-7ffbcf458a", String(issue.id))})} className={`rounded-full border px-2 py-1 text-xs ${severityClass(issue.severity)}`}>
                      {severityLabels[issue.severity]}
                    </span>
                    <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.20-gQMa84", id: "data-health.data-health-findings-panel.div.20" , instance: createOpaqueUiInstanceId("iter-f29c436eff", String(issue.id))})} className="mt-2 text-xs text-on-surface-variant">
                      {categoryLabels[issue.category]}
                    </div>
                  </td>
                  <td {...uiAttributes({ uid: "data-health.data-health-findings-panel.td.5-Kc4yhH", id: "data-health.data-health-findings-panel.td.5" , instance: createOpaqueUiInstanceId("iter-ebcdf48bc7", String(issue.id))})} className="p-3 text-xs">
                    <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.21-1LMoI7", id: "data-health.data-health-findings-panel.div.21" , instance: createOpaqueUiInstanceId("iter-b41bda3651", String(issue.id))})}>{issue.database}</div>
                    <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.22-H74crY", id: "data-health.data-health-findings-panel.div.22" , instance: createOpaqueUiInstanceId("iter-edfb11a391", String(issue.id))})} className="text-on-surface-variant">{issue.table}</div>
                  </td>
                  <td {...uiAttributes({ uid: "data-health.data-health-findings-panel.td.6-4ZiDgA", id: "data-health.data-health-findings-panel.td.6" , instance: createOpaqueUiInstanceId("iter-56fd1731a3", String(issue.id))})} className="p-3 text-xs">
                    {issue.state === "new"
                      ? "جديدة"
                      : issue.state === "recurring"
                        ? "متكررة"
                        : issue.state === "quarantined"
                          ? "في الحجر"
                          : "متجاهلة"}
                  </td>
                  <td {...uiAttributes({ uid: "data-health.data-health-findings-panel.td.7-ww1oQ3", id: "data-health.data-health-findings-panel.td.7" , instance: createOpaqueUiInstanceId("iter-10352967a4", String(issue.id))})} className="p-3 text-xs">
                    <span {...uiAttributes({ uid: "data-health.data-health-findings-panel.span.3-Rln83E", id: "data-health.data-health-findings-panel.span.3" , instance: createOpaqueUiInstanceId("iter-6a38d51ffd", String(issue.id))})}
                      className={`rounded-full px-2 py-1 ${
                        issue.canClean
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cleanupLabels[issue.cleanupAction]}
                    </span>
                  </td>
                  <td {...uiAttributes({ uid: "data-health.data-health-findings-panel.td.8-a4QK65", id: "data-health.data-health-findings-panel.td.8" , instance: createOpaqueUiInstanceId("iter-7fc5186e74", String(issue.id))})} className="p-3">
                    <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.23-UN8V03", id: "data-health.data-health-findings-panel.div.23" , instance: createOpaqueUiInstanceId("iter-7ae22189f4", String(issue.id))})} className="flex gap-1">
                      <Button ui={{ uid: "data-health.data-health-findings-panel.button.5-B1TUMd", id: "data-health.data-health-findings-panel.button.5" , instance: createOpaqueUiInstanceId("iter-7d5f06c787", String(issue.id))}}
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="عرض التفاصيل"
                        onClick={() => props.onOpenDetail(issue)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {issue.route ? (
                        <Button ui={{ uid: "data-health.data-health-findings-panel.button.6-AYEU6I", id: "data-health.data-health-findings-panel.button.6" , instance: createOpaqueUiInstanceId("iter-6abe8eaf61", String(issue.id))}} asChild size="icon" variant="ghost" aria-label="فتح السجل">
                          <Link href={issue.route}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {props.visible.length === 0 && !props.loading ? (
                <tr {...uiAttributes({ uid: "data-health.data-health-findings-panel.tr.5-56YwVX", id: "data-health.data-health-findings-panel.tr.5" })} id="data-health.data-health-findings-panel.tr.2">
                  <td {...uiAttributes({ uid: "data-health.data-health-findings-panel.td.9-ZQSgt5", id: "data-health.data-health-findings-panel.td.9" })} id="data-health.data-health-findings-panel.td" colSpan={7} className="p-10 text-center text-on-surface-variant">
                    <CheckCircle2 id="data-health.data-health-findings-panel.check-circle2" className="mx-auto mb-2 h-8 w-8 text-green-600" />
                    لا توجد نتائج مطابقة للفلاتر الحالية.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.24-g2hYPl", id: "data-health.data-health-findings-panel.div.24" })} id="data-health.data-health-findings-panel.div.6" className="flex items-center justify-between border-t p-3 text-sm">
          <span {...uiAttributes({ uid: "data-health.data-health-findings-panel.span.4-a6BOxs", id: "data-health.data-health-findings-panel.span.4" })} id="data-health.data-health-findings-panel.span">
            صفحة {props.page} من {props.pageCount}
          </span>
          <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.25-zWY9Ct", id: "data-health.data-health-findings-panel.div.25" })} id="data-health.data-health-findings-panel.div.7" className="flex gap-1">
            <Button id="data-health.data-health-findings-panel.button" ui={{ uid: "data-health.findings.previous-page-HvCYL4", id: "data-health.findings.previous-page", kind: "action", action: "previous-page", part: "pagination" }}
              size="icon"
              variant="outline"
              aria-label="الصفحة السابقة"
              disabled={props.page <= 1}
              onClick={() => props.onPageChange((value) => Math.max(1, value - 1))}
            >
              <ChevronRight id="data-health.data-health-findings-panel.chevron-right" className="h-4 w-4" />
            </Button>
            <Button id="data-health.data-health-findings-panel.button.2" ui={{ uid: "data-health.findings.next-page-XI5b99", id: "data-health.findings.next-page", kind: "action", action: "next-page", part: "pagination" }}
              size="icon"
              variant="outline"
              aria-label="الصفحة التالية"
              disabled={props.page >= props.pageCount}
              onClick={() => props.onPageChange((value) => Math.min(props.pageCount, value + 1))}
            >
              <ChevronLeft id="data-health.data-health-findings-panel.chevron-left" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section {...uiAttributes({ uid: "data-health.data-health-findings-panel.section.5-73KINJ", id: "data-health.data-health-findings-panel.section.5" })} id="data-health.data-health-findings-panel.section.2" className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-surface p-3">
        <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.26-7xwQmT", id: "data-health.data-health-findings-panel.div.26" })} id="data-health.data-health-findings-panel.div.8">
          <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.27-dEg5v9", id: "data-health.data-health-findings-panel.div.27" })} id="data-health.data-health-findings-panel.div.9" className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck id="data-health.data-health-findings-panel.shield-check" className="h-4 w-4 text-green-700" />
            تنظيف آمن للعناصر المحددة
          </div>
          <p {...uiAttributes({ uid: "data-health.data-health-findings-panel.p.3-13rxUR", id: "data-health.data-health-findings-panel.p.3" })} id="data-health.data-health-findings-panel.p" className="mt-1 text-xs text-on-surface-variant">
            لا توجد عناصر محددة تلقائيًا. ستظهر معاينة جديدة وتُعاد مطابقة كل بصمة قبل التنفيذ.
          </p>
        </div>
        <Button id="data-health.data-health-findings-panel.button.3" ui={{ uid: "data-health.findings.create-plan-1wbnPY", id: "data-health.findings.create-plan", kind: "action", action: "create-cleanup-plan", part: "footer" }}
          type="button"
          variant="destructive"
          disabled={props.planning || props.selectedCount === 0}
          onClick={props.onCreatePlan}
        >
          <Trash2 id="data-health.data-health-findings-panel.trash2" className="h-4 w-4" />
          {props.planning ? "جاري إعداد المعاينة" : `معاينة تنظيف ${props.selectedCount}`}
        </Button>
      </section>

      <section {...uiAttributes({ uid: "data-health.data-health-findings-panel.section.6-HNAS21", id: "data-health.data-health-findings-panel.section.6" })} id="data-health.data-health-findings-panel.section.3" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
        <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.28-GVY90U", id: "data-health.data-health-findings-panel.div.28" })} id="data-health.data-health-findings-panel.div.10">
          <div {...uiAttributes({ uid: "data-health.data-health-findings-panel.div.29-2StNBR", id: "data-health.data-health-findings-panel.div.29" })} id="data-health.data-health-findings-panel.div.11" className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <Trash2 id="data-health.data-health-findings-panel.trash2.2" className="h-4 w-4" />
            حذف جميع الطلبات
          </div>
          <p {...uiAttributes({ uid: "data-health.data-health-findings-panel.p.4-9IBYZ5", id: "data-health.data-health-findings-panel.p.4" })} id="data-health.data-health-findings-panel.p.2" className="mt-1 text-xs text-red-700">
            يشمل الطلبات العادية والمخصصة والمختلطة وكل السجلات التابعة وصور الطلبات المخصصة. يتم حذف الصور والبيانات فعليًا بدون أرشفة أو جدولة حذف.
          </p>
        </div>
        <Button id="data-health.data-health-findings-panel.button.4" ui={{ uid: "data-health.findings.create-order-purge-plan-9OqtkM", id: "data-health.findings.create-order-purge-plan", kind: "action", action: "create-order-purge-plan", part: "footer" }}
          type="button"
          variant="destructive"
          disabled={props.orderPurgeBusy}
          onClick={props.onCreateOrderPurgePlan}
        >
          <Trash2 id="data-health.data-health-findings-panel.trash2.3" className="h-4 w-4" />
          {props.orderPurgeBusy ? "جاري الإعداد" : "معاينة حذف جميع الطلبات"}
        </Button>
      </section>
    </div>
  );
}
