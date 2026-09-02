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
    <div id='features-data-health-presentation-datahealthfindingspanel-div-1-amsmam' className="space-y-3">
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

      <section id='features-data-health-presentation-datahealthfindingspanel-section-2-0wtlem' className="overflow-hidden rounded-md border bg-surface">
        <div id='features-data-health-presentation-datahealthfindingspanel-div-3-ygsphh' className="flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm">
          <div id='features-data-health-presentation-datahealthfindingspanel-div-4-wp3yuo' className="flex items-center gap-2 font-semibold">
            <AlertTriangle id='features-data-health-presentation-datahealthfindingspanel-alerttriangle-5-v7fgiq' className="h-4 w-4" />
            {props.filtered.length} نتيجة
          </div>
          <div id='features-data-health-presentation-datahealthfindingspanel-div-6-fnrcdq' className="text-xs text-on-surface-variant">
            آخر فحص {dateText(props.report.generatedAt)}، استغرق{" "}
            {props.report.durationMs} مللي ثانية
          </div>
        </div>
        <div id='features-data-health-presentation-datahealthfindingspanel-div-7-nempyd' className="overflow-x-auto">
          <table id='features-data-health-presentation-datahealthfindingspanel-table-8-6vugri' className="w-full min-w-[1120px] text-sm">
            <thead id='features-data-health-presentation-datahealthfindingspanel-thead-9-balecg' className="bg-muted/50 text-xs text-on-surface-variant">
              <tr id='features-data-health-presentation-datahealthfindingspanel-tr-10-3jxczn'>
                <th id='features-data-health-presentation-datahealthfindingspanel-th-11-fg5agd' className="w-12 p-3 text-start">
                  <input id='features-data-health-presentation-datahealthfindingspanel-input-12-zihs6t'
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
                <th id='features-data-health-presentation-datahealthfindingspanel-th-13-cptmsl' className="p-3 text-start">المشكلة</th>
                <th id='features-data-health-presentation-datahealthfindingspanel-th-14-p1kp1h' className="p-3 text-start">التصنيف</th>
                <th id='features-data-health-presentation-datahealthfindingspanel-th-15-to2kmk' className="p-3 text-start">المصدر</th>
                <th id='features-data-health-presentation-datahealthfindingspanel-th-16-ydmwpm' className="p-3 text-start">الحالة</th>
                <th id='features-data-health-presentation-datahealthfindingspanel-th-17-whiz2s' className="p-3 text-start">الإجراء</th>
                <th id='features-data-health-presentation-datahealthfindingspanel-th-18-gbmue8' className="w-24 p-3 text-start">فتح</th>
              </tr>
            </thead>
            <tbody id='features-data-health-presentation-datahealthfindingspanel-tbody-19-wo7liu'>
              {props.visible.map((issue) => (
                <tr key={issue.id} className="border-t align-top">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={props.selectedIds.has(issue.id)}
                      disabled={!issue.canClean}
                      onChange={() => props.onToggleIssue(issue)}
                      aria-label={`تحديد ${issue.title}`}
                    />
                  </td>
                  <td className="max-w-md p-3">
                    <div className="font-medium">{issue.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                      {issue.details}
                    </div>
                    <div className="mt-1 break-all text-xs text-on-surface-variant" dir="ltr">
                      {issue.recordId}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full border px-2 py-1 text-xs ${severityClass(issue.severity)}`}>
                      {severityLabels[issue.severity]}
                    </span>
                    <div className="mt-2 text-xs text-on-surface-variant">
                      {categoryLabels[issue.category]}
                    </div>
                  </td>
                  <td className="p-3 text-xs">
                    <div>{issue.database}</div>
                    <div className="text-on-surface-variant">{issue.table}</div>
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
                        aria-label="عرض التفاصيل"
                        onClick={() => props.onOpenDetail(issue)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {issue.route ? (
                        <Button asChild size="icon" variant="ghost" aria-label="فتح السجل">
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
                <tr id='features-data-health-presentation-datahealthfindingspanel-tr-20-zekdv4'>
                  <td id='features-data-health-presentation-datahealthfindingspanel-td-21-jki2ee' colSpan={7} className="p-10 text-center text-on-surface-variant">
                    <CheckCircle2 id='features-data-health-presentation-datahealthfindingspanel-checkcircle2-22-k2rji5' className="mx-auto mb-2 h-8 w-8 text-green-600" />
                    لا توجد نتائج مطابقة للفلاتر الحالية.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div id='features-data-health-presentation-datahealthfindingspanel-div-23-zrqr4t' className="flex items-center justify-between border-t p-3 text-sm">
          <span id='features-data-health-presentation-datahealthfindingspanel-text-24-n1txxx'>
            صفحة {props.page} من {props.pageCount}
          </span>
          <div id='features-data-health-presentation-datahealthfindingspanel-div-25-qxskj1' className="flex gap-1">
            <Button id='features-data-health-presentation-datahealthfindingspanel-button-26-rtstyy'
              size="icon"
              variant="outline"
              aria-label="الصفحة السابقة"
              disabled={props.page <= 1}
              onClick={() => props.onPageChange((value) => Math.max(1, value - 1))}
            >
              <ChevronRight id='features-data-health-presentation-datahealthfindingspanel-chevronright-27-ooxjrm' className="h-4 w-4" />
            </Button>
            <Button id='features-data-health-presentation-datahealthfindingspanel-button-28-bfamw6'
              size="icon"
              variant="outline"
              aria-label="الصفحة التالية"
              disabled={props.page >= props.pageCount}
              onClick={() => props.onPageChange((value) => Math.min(props.pageCount, value + 1))}
            >
              <ChevronLeft id='features-data-health-presentation-datahealthfindingspanel-chevronleft-29-1obmfz' className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section id='features-data-health-presentation-datahealthfindingspanel-section-30-k1n3fl' className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-surface p-3">
        <div id='features-data-health-presentation-datahealthfindingspanel-div-31-6ljzod'>
          <div id='features-data-health-presentation-datahealthfindingspanel-div-32-yrat1r' className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck id='features-data-health-presentation-datahealthfindingspanel-shieldcheck-33-qpubpc' className="h-4 w-4 text-green-700" />
            تنظيف آمن للعناصر المحددة
          </div>
          <p id='features-data-health-presentation-datahealthfindingspanel-text-34-qsmijl' className="mt-1 text-xs text-on-surface-variant">
            لا توجد عناصر محددة تلقائيًا. ستظهر معاينة جديدة وتُعاد مطابقة كل بصمة قبل التنفيذ.
          </p>
        </div>
        <Button id='features-data-health-presentation-datahealthfindingspanel-button-35-n2ytf0'
          type="button"
          variant="destructive"
          disabled={props.planning || props.selectedCount === 0}
          onClick={props.onCreatePlan}
        >
          <Trash2 id='features-data-health-presentation-datahealthfindingspanel-trash2-36-iqq3qo' className="h-4 w-4" />
          {props.planning ? "جاري إعداد المعاينة" : `معاينة تنظيف ${props.selectedCount}`}
        </Button>
      </section>

      <section id='features-data-health-presentation-datahealthfindingspanel-section-37-jypto7' className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
        <div id='features-data-health-presentation-datahealthfindingspanel-div-38-qzyqac'>
          <div id='features-data-health-presentation-datahealthfindingspanel-div-39-jkpzsz' className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <Trash2 id='features-data-health-presentation-datahealthfindingspanel-trash2-40-17ulct' className="h-4 w-4" />
            حذف جميع الطلبات
          </div>
          <p id='features-data-health-presentation-datahealthfindingspanel-text-41-hbgym2' className="mt-1 text-xs text-red-700">
            يشمل الطلبات العادية والمخصصة والمختلطة وكل السجلات التابعة وصور الطلبات المخصصة. يتم حذف الصور والبيانات فعليًا بدون أرشفة أو جدولة حذف.
          </p>
        </div>
        <Button id='features-data-health-presentation-datahealthfindingspanel-button-42-nqdajd'
          type="button"
          variant="destructive"
          disabled={props.orderPurgeBusy}
          onClick={props.onCreateOrderPurgePlan}
        >
          <Trash2 id='features-data-health-presentation-datahealthfindingspanel-trash2-43-mmtdrl' className="h-4 w-4" />
          {props.orderPurgeBusy ? "جاري الإعداد" : "معاينة حذف جميع الطلبات"}
        </Button>
      </section>
    </div>
  );
}
