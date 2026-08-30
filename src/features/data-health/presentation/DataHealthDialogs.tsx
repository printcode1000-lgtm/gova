import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import type {
  DataHealthCleanupPlan,
  DataHealthIssue,
  DataHealthOrderPurgePlan,
} from "@asol/data-health-core";

import { cleanupLabels, dateText, severityLabels } from "./data-health-labels";
import { DetailRow } from "./DetailRow";

export function DataHealthDialogs(props: {
  detail: DataHealthIssue | null;
  setDetail: (issue: DataHealthIssue | null) => void;
  plan: DataHealthCleanupPlan | null;
  setPlan: (plan: DataHealthCleanupPlan | null) => void;
  confirmationText: string;
  setConfirmationText: (value: string) => void;
  cleaning: boolean;
  stagePlanExecution: () => void;
  orderPurgePlan: DataHealthOrderPurgePlan | null;
  setOrderPurgePlan: (plan: DataHealthOrderPurgePlan | null) => void;
  orderPurgeConfirmation: string;
  setOrderPurgeConfirmation: (value: string) => void;
  orderPurgeBusy: boolean;
  stageOrderPurge: () => void;
}) {
  return (
    <>
      <IssueDetailDialog detail={props.detail} setDetail={props.setDetail} />
      <CleanupPlanDialog
        plan={props.plan}
        setPlan={props.setPlan}
        confirmationText={props.confirmationText}
        setConfirmationText={props.setConfirmationText}
        cleaning={props.cleaning}
        stagePlanExecution={props.stagePlanExecution}
      />
      <OrderPurgeDialog
        orderPurgePlan={props.orderPurgePlan}
        setOrderPurgePlan={props.setOrderPurgePlan}
        orderPurgeConfirmation={props.orderPurgeConfirmation}
        setOrderPurgeConfirmation={props.setOrderPurgeConfirmation}
        orderPurgeBusy={props.orderPurgeBusy}
        stageOrderPurge={props.stageOrderPurge}
      />
    </>
  );
}

function IssueDetailDialog({
  detail,
  setDetail,
}: {
  detail: DataHealthIssue | null;
  setDetail: (issue: DataHealthIssue | null) => void;
}) {
  return (
    <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
      <DialogContent id="data-health.data-health-dialogs.dialog-content" className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader id="data-health.data-health-dialogs.dialog-header">
          <DialogTitle id="data-health.data-health-dialogs.dialog-title">{detail?.title}</DialogTitle>
          <DialogDescription id="data-health.data-health-dialogs.dialog-description">{detail?.details}</DialogDescription>
        </DialogHeader>
        {detail ? (
          <div id="data-health.data-health-dialogs.div" className="space-y-3 text-sm">
            <DetailRow id="data-health.data-health-dialogs.detail-row" label="الخطورة" value={severityLabels[detail.severity]} />
            <DetailRow id="data-health.data-health-dialogs.detail-row.2" label="المصدر" value={`${detail.database}.${detail.table}`} />
            <DetailRow id="data-health.data-health-dialogs.detail-row.3" label="معرف السجل" value={detail.recordId} ltr />
            <DetailRow id="data-health.data-health-dialogs.detail-row.4" label="المالك" value={detail.ownerUid || "-"} ltr />
            <DetailRow id="data-health.data-health-dialogs.detail-row.5" label="الإجراء" value={cleanupLabels[detail.cleanupAction]} />
            <div id="data-health.data-health-dialogs.div.2">
              <div id="data-health.data-health-dialogs.div.3" className="mb-1 text-xs text-on-surface-variant">الدليل</div>
              <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
                {JSON.stringify(detail.evidence, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CleanupPlanDialog({
  plan,
  setPlan,
  confirmationText,
  setConfirmationText,
  cleaning,
  stagePlanExecution,
}: {
  plan: DataHealthCleanupPlan | null;
  setPlan: (plan: DataHealthCleanupPlan | null) => void;
  confirmationText: string;
  setConfirmationText: (value: string) => void;
  cleaning: boolean;
  stagePlanExecution: () => void;
}) {
  return (
    <Dialog open={Boolean(plan)} onOpenChange={(open) => !open && setPlan(null)}>
      <DialogContent id="data-health.data-health-dialogs.dialog-content.2" className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader id="data-health.data-health-dialogs.dialog-header.2">
          <DialogTitle id="data-health.data-health-dialogs.dialog-title.2">معاينة خطة التنظيف</DialogTitle>
          <DialogDescription id="data-health.data-health-dialogs.dialog-description.2">
            الخطة صالحة حتى {dateText(plan?.expiresAt)} ولا يمكن استخدامها أكثر من مرة.
          </DialogDescription>
        </DialogHeader>
        <div id="data-health.data-health-dialogs.div.4" className="space-y-2">
          {plan?.preview.map((item) => (
            <div key={item.issueId} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{item.title}</div>
              <div className="mt-1 text-xs text-on-surface-variant">
                {cleanupLabels[item.action]}،{" "}
                {item.cleanupMode === "quarantine" ? "حجر 30 يومًا" : "تنفيذ مباشر"}
              </div>
            </div>
          ))}
        </div>
        <div id="data-health.data-health-dialogs.div.5" className="space-y-1">
          <label id="data-health.data-health-dialogs.label" className="text-sm font-medium">اكتب العبارة التالية للتأكيد:</label>
          <div id="data-health.data-health-dialogs.div.6" className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
            {plan?.confirmationText}
          </div>
          <Input id="data-health.data-health-dialogs.input"
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter id="data-health.data-health-dialogs.dialog-footer" className="gap-2">
          <Button id="data-health.data-health-dialogs.button" variant="outline" onClick={() => setPlan(null)}>
            إلغاء
          </Button>
          <Button id="data-health.data-health-dialogs.button.2"
            disabled={cleaning || !plan || confirmationText !== plan.confirmationText}
            onClick={stagePlanExecution}
          >
            {cleaning ? "جاري التنفيذ" : "إضافة الخطة إلى الحفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderPurgeDialog({
  orderPurgePlan,
  setOrderPurgePlan,
  orderPurgeConfirmation,
  setOrderPurgeConfirmation,
  orderPurgeBusy,
  stageOrderPurge,
}: {
  orderPurgePlan: DataHealthOrderPurgePlan | null;
  setOrderPurgePlan: (plan: DataHealthOrderPurgePlan | null) => void;
  orderPurgeConfirmation: string;
  setOrderPurgeConfirmation: (value: string) => void;
  orderPurgeBusy: boolean;
  stageOrderPurge: () => void;
}) {
  return (
    <Dialog
      open={Boolean(orderPurgePlan)}
      onOpenChange={(open) => {
        if (!open && !orderPurgeBusy) setOrderPurgePlan(null);
      }}
    >
      <DialogContent id="data-health.data-health-dialogs.dialog-content.3" className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader id="data-health.data-health-dialogs.dialog-header.3">
          <DialogTitle id="data-health.data-health-dialogs.dialog-title.3">معاينة حذف جميع الطلبات</DialogTitle>
          <DialogDescription id="data-health.data-health-dialogs.dialog-description.3">
            هذه عملية نهائية تشمل كل أنواع الطلبات والسجلات التابعة لها. الخطة صالحة حتى {dateText(orderPurgePlan?.expiresAt)}.
          </DialogDescription>
        </DialogHeader>
        <div id="data-health.data-health-dialogs.div.7" className="grid gap-2 sm:grid-cols-3">
          <DetailRow id="data-health.data-health-dialogs.detail-row.6" label="الطلبات" value={String(orderPurgePlan?.orderCount ?? 0)} />
          <DetailRow id="data-health.data-health-dialogs.detail-row.7" label="صور الطلبات" value={String(orderPurgePlan?.imageCount ?? 0)} />
          <DetailRow id="data-health.data-health-dialogs.detail-row.8"
            label="المصدر"
            value={`${orderPurgePlan?.databaseSource ?? "-"} / ${orderPurgePlan?.storageSource ?? "-"}`}
            ltr
          />
        </div>
        <div id="data-health.data-health-dialogs.div.8" className="max-h-52 overflow-y-auto rounded-md border">
          {Object.entries(orderPurgePlan?.tableCounts ?? {}).map(([table, count]) => (
            <div key={table} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
              <span dir="ltr">{table}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
        <div id="data-health.data-health-dialogs.div.9" className="space-y-1">
          <label id="data-health.data-health-dialogs.label.2" className="text-sm font-medium">اكتب العبارة التالية حرفيًا للتأكيد:</label>
          <div id="data-health.data-health-dialogs.div.10" className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
            {orderPurgePlan?.confirmationText}
          </div>
          <Input id="data-health.data-health-dialogs.input.2"
            value={orderPurgeConfirmation}
            onChange={(event) => setOrderPurgeConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter id="data-health.data-health-dialogs.dialog-footer.2" className="gap-2">
          <Button id="data-health.data-health-dialogs.button.3"
            variant="outline"
            disabled={orderPurgeBusy}
            onClick={() => setOrderPurgePlan(null)}
          >
            إلغاء
          </Button>
          <Button id="data-health.data-health-dialogs.button.4"
            disabled={
              orderPurgeBusy ||
              !orderPurgePlan ||
              orderPurgeConfirmation !== orderPurgePlan.confirmationText
            }
            onClick={stageOrderPurge}
          >
            {orderPurgeBusy ? "جاري الحذف" : "إضافة الخطة إلى الحفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
