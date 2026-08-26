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
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{detail?.title}</DialogTitle>
          <DialogDescription>{detail?.details}</DialogDescription>
        </DialogHeader>
        {detail ? (
          <div className="space-y-3 text-sm">
            <DetailRow label="الخطورة" value={severityLabels[detail.severity]} />
            <DetailRow label="المصدر" value={`${detail.database}.${detail.table}`} />
            <DetailRow label="معرف السجل" value={detail.recordId} ltr />
            <DetailRow label="المالك" value={detail.ownerUid || "-"} ltr />
            <DetailRow label="الإجراء" value={cleanupLabels[detail.cleanupAction]} />
            <div>
              <div className="mb-1 text-xs text-on-surface-variant">الدليل</div>
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
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>معاينة خطة التنظيف</DialogTitle>
          <DialogDescription>
            الخطة صالحة حتى {dateText(plan?.expiresAt)} ولا يمكن استخدامها أكثر من مرة.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
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
        <div className="space-y-1">
          <label className="text-sm font-medium">اكتب العبارة التالية للتأكيد:</label>
          <div className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
            {plan?.confirmationText}
          </div>
          <Input ui={{ uid: "data-health.plan-dialog.confirmation-T28K1D", id: "data-health.plan-dialog.confirmation", kind: "field", part: "confirmation" }}
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button ui={{ uid: "data-health.plan-dialog.cancel-1BXAzX", id: "data-health.plan-dialog.cancel", kind: "action", action: "cancel", part: "dialog-footer" }} variant="outline" onClick={() => setPlan(null)}>
            إلغاء
          </Button>
          <Button ui={{ uid: "data-health.plan-dialog.confirm-H8cx3F", id: "data-health.plan-dialog.confirm", kind: "action", action: "stage-plan-execution", part: "dialog-footer" }}
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
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>معاينة حذف جميع الطلبات</DialogTitle>
          <DialogDescription>
            هذه عملية نهائية تشمل كل أنواع الطلبات والسجلات التابعة لها. الخطة صالحة حتى {dateText(orderPurgePlan?.expiresAt)}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-3">
          <DetailRow label="الطلبات" value={String(orderPurgePlan?.orderCount ?? 0)} />
          <DetailRow label="صور الطلبات" value={String(orderPurgePlan?.imageCount ?? 0)} />
          <DetailRow
            label="المصدر"
            value={`${orderPurgePlan?.databaseSource ?? "-"} / ${orderPurgePlan?.storageSource ?? "-"}`}
            ltr
          />
        </div>
        <div className="max-h-52 overflow-y-auto rounded-md border">
          {Object.entries(orderPurgePlan?.tableCounts ?? {}).map(([table, count]) => (
            <div key={table} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
              <span dir="ltr">{table}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">اكتب العبارة التالية حرفيًا للتأكيد:</label>
          <div className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
            {orderPurgePlan?.confirmationText}
          </div>
          <Input ui={{ uid: "data-health.order-purge-dialog.confirmation-vMFMZ3", id: "data-health.order-purge-dialog.confirmation", kind: "field", part: "confirmation" }}
            value={orderPurgeConfirmation}
            onChange={(event) => setOrderPurgeConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button ui={{ uid: "data-health.order-purge-dialog.cancel-1fBQND", id: "data-health.order-purge-dialog.cancel", kind: "action", action: "cancel", part: "dialog-footer" }}
            variant="outline"
            disabled={orderPurgeBusy}
            onClick={() => setOrderPurgePlan(null)}
          >
            إلغاء
          </Button>
          <Button ui={{ uid: "data-health.order-purge-dialog.confirm-KNb66D", id: "data-health.order-purge-dialog.confirm", kind: "action", action: "stage-order-purge", part: "dialog-footer" }}
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
