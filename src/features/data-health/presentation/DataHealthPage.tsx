"use client";

import { DatabaseZap, Download, FileJson, RefreshCw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { DataHealthDialogs } from "./DataHealthDialogs";
import { DataHealthFindingsPanel } from "./DataHealthFindingsPanel";
import { DataHealthHistoryPanel } from "./DataHealthHistoryPanel";
import { DataHealthSchemaPanel } from "./DataHealthSchemaPanel";
import { DataHealthTopologyPanel } from "./DataHealthTopologyPanel";
import { SummaryCard } from "./SummaryCard";
import { useDataHealthPage } from "./use-data-health-page";

export function DataHealthPage() {
  const page = useDataHealthPage();

  if (page.isLoading) {
    return (
      <div id="data-health.data-health-page.div" className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>
    );
  }
  if (!page.allowed) {
    return (
      <div id="data-health.data-health-page.div.2" className="mx-auto max-w-2xl p-6">
        <div id="data-health.data-health-page.div.3" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </div>
    );
  }

  return (
    <main id="data-health.data-health-page.main" className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24">
      <header id="data-health.data-health-page.header" className="flex flex-wrap items-start justify-between gap-3">
        <div id="data-health.data-health-page.div.4">
          <h1 id="data-health.data-health-page.h1" className="flex items-center gap-2 text-2xl font-semibold text-on-surface">
            <DatabaseZap id="data-health.data-health-page.database-zap" className="h-6 w-6 text-primary" />
            سلامة البيانات
          </h1>
          <div id="data-health.data-health-page.div.5" className="mt-1 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <span id="data-health.data-health-page.span">فحص العلاقات والصور وبنية القواعد مع تنظيف مؤكد وقابل للتدقيق.</span>
            {page.report ? (
              <span id="data-health.data-health-page.span.2"
                className={`rounded border px-2 py-0.5 text-xs ${
                  page.report.environment === "production"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {page.report.execution.runtime === "production-cloud"
                  ? "المصدر الفعلي: Turso وR2"
                  : "المصدر الفعلي: SQLite والتخزين المحلي"}
              </span>
            ) : null}
          </div>
        </div>
        <div id="data-health.data-health-page.div.6" className="flex flex-wrap gap-2">
          <Button id="data-health.data-health-page.button" ui={{ uid: "data-health.export-json-Rxa0Sz", id: "data-health.export-json", kind: "action", action: "export-json", part: "toolbar" }}
            type="button"
            size="icon"
            variant="outline"
            aria-label="تصدير JSON"
            onClick={() => page.exportReport("json")}
            disabled={!page.report}
          >
            <FileJson id="data-health.data-health-page.file-json" className="h-4 w-4" />
          </Button>
          <Button id="data-health.data-health-page.button.2" ui={{ uid: "data-health.export-csv-zXMJ1B", id: "data-health.export-csv", kind: "action", action: "export-csv", part: "toolbar" }}
            type="button"
            size="icon"
            variant="outline"
            aria-label="تصدير CSV"
            onClick={() => page.exportReport("csv")}
            disabled={!page.report}
          >
            <Download id="data-health.data-health-page.download" className="h-4 w-4" />
          </Button>
          <Button id="data-health.data-health-page.button.3" ui={{ uid: "data-health.scan-xXu578", id: "data-health.scan", kind: "action", action: "run-scan", part: "toolbar" }} type="button" onClick={page.scan} disabled={page.loading}>
            <RefreshCw id="data-health.data-health-page.refresh-cw" className={`h-4 w-4 ${page.loading ? "animate-spin" : ""}`} />
            {page.loading ? "جاري الفحص" : "فحص جديد"}
          </Button>
        </div>
      </header>

      {page.report ? (
        <section id="data-health.data-health-page.section" className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <SummaryCard id="data-health.data-health-page.summary-card" label="السجلات المفحوصة" value={page.report.scannedRecords} />
          <SummaryCard id="data-health.data-health-page.summary-card.2" label="المشكلات" value={page.report.summary.total} />
          <SummaryCard id="data-health.data-health-page.summary-card.3" label="حرج" value={page.report.summary.critical} tone="red" />
          <SummaryCard id="data-health.data-health-page.summary-card.4" label="تحذير" value={page.report.summary.warning} tone="amber" />
          <SummaryCard id="data-health.data-health-page.summary-card.5" label="معلومات" value={page.report.summary.info} tone="blue" />
          <SummaryCard id="data-health.data-health-page.summary-card.6" label="قابل للتنظيف" value={page.report.summary.cleanable} tone="green" />
          <SummaryCard id="data-health.data-health-page.summary-card.7" label="في الحجر" value={page.report.summary.quarantined} tone="amber" />
        </section>
      ) : null}

      {page.report ? <DataHealthTopologyPanel report={page.report} /> : null}

      {page.error ? (
        <div id="data-health.data-health-page.div.7" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {page.error}
        </div>
      ) : null}
      {page.notice ? (
        <div id="data-health.data-health-page.div.8" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {page.notice}
        </div>
      ) : null}

      <Tabs
        defaultValue="findings"
        dir="rtl"
        onValueChange={(value) => {
          if (value === "schema") void page.loadSchemaComparison();
        }}
      >
        <TabsList id="data-health.data-health-page.tabs-list" className="w-full justify-start overflow-x-auto">
          <TabsTrigger id="data-health.data-health-page.tabs-trigger" ui={{ uid: "data-health.tab-findings-I7s8xO", id: "data-health.tab-findings", kind: "action", action: "select-findings-tab", part: "tabs" }} value="findings">النتائج</TabsTrigger>
          <TabsTrigger id="data-health.data-health-page.tabs-trigger.2" ui={{ uid: "data-health.tab-schema-M6eymK", id: "data-health.tab-schema", kind: "action", action: "select-schema-tab", part: "tabs" }} value="schema">مقارنة البنية</TabsTrigger>
          <TabsTrigger id="data-health.data-health-page.tabs-trigger.3" ui={{ uid: "data-health.tab-history-xdlp2W", id: "data-health.tab-history", kind: "action", action: "select-history-tab", part: "tabs" }} value="history">السجل والتدقيق</TabsTrigger>
        </TabsList>

        <TabsContent id="data-health.data-health-page.tabs-content" value="findings">
          {page.report ? (
            <DataHealthFindingsPanel
              report={page.report}
              query={page.query}
              setQuery={page.setQuery}
              severity={page.severity}
              setSeverity={page.setSeverity}
              category={page.category}
              setCategory={page.setCategory}
              database={page.database}
              setDatabase={page.setDatabase}
              state={page.state}
              setState={page.setState}
              databases={page.databases}
              cleanableOnly={page.cleanableOnly}
              setCleanableOnly={page.setCleanableOnly}
              filtered={page.filtered}
              visible={page.visible}
              selectedIds={page.selectedIds}
              selectedCount={page.selected.length}
              page={page.page}
              pageCount={page.pageCount}
              loading={page.loading}
              planning={page.planning}
              orderPurgeBusy={page.orderPurgeBusy}
              onToggleIssue={page.toggleIssue}
              onToggleVisible={page.toggleVisible}
              onOpenDetail={page.setDetail}
              onCreatePlan={() => void page.createPlan()}
              onCreateOrderPurgePlan={() => void page.createOrderPurgePlan()}
              onPageChange={page.setPage}
            />
          ) : null}
        </TabsContent>

        <TabsContent id="data-health.data-health-page.tabs-content.2" value="schema">
          <DataHealthSchemaPanel report={page.report} loading={page.schemaLoading} />
        </TabsContent>

        <TabsContent id="data-health.data-health-page.tabs-content.3" value="history">
          <DataHealthHistoryPanel
            history={page.history}
            onRelease={page.releaseQuarantine}
            onDeleteImage={page.stageQuarantinedImageDelete}
            onClearQuarantine={page.stageQuarantineClear}
            onClearRunHistory={page.stageRunHistoryClear}
            onClearCleanupAudit={page.stageCleanupAuditClear}
          />
        </TabsContent>
      </Tabs>

      <DataHealthDialogs
        detail={page.detail}
        setDetail={page.setDetail}
        plan={page.plan}
        setPlan={page.setPlan}
        confirmationText={page.confirmationText}
        setConfirmationText={page.setConfirmationText}
        cleaning={page.cleaning}
        stagePlanExecution={page.stagePlanExecution}
        orderPurgePlan={page.orderPurgePlan}
        setOrderPurgePlan={page.setOrderPurgePlan}
        orderPurgeConfirmation={page.orderPurgeConfirmation}
        setOrderPurgeConfirmation={page.setOrderPurgeConfirmation}
        orderPurgeBusy={page.orderPurgeBusy}
        stageOrderPurge={page.stageOrderPurge}
      />
    </main>
  );
}
