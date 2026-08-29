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
import { uiAttributes } from "@asol/ui-registry-core";

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
      <DialogContent ui={{ uid: "data-health.issue-detail.content-XlP3wc", id: "data-health.issue-detail.dialog-content" }} id="data-health.data-health-dialogs.dialog-content" className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader ui={{ uid: "data-health.data-health-dialogs.dialog-header.4-tGG4WV", id: "data-health.data-health-dialogs.dialog-header.4" }} id="data-health.data-health-dialogs.dialog-header">
          <DialogTitle ui={{ uid: "data-health.data-health-dialogs.dialog-title.4-39cJO0", id: "data-health.data-health-dialogs.dialog-title.4" }} id="data-health.data-health-dialogs.dialog-title">{detail?.title}</DialogTitle>
          <DialogDescription ui={{ uid: "data-health.data-health-dialogs.dialog-description.4-5H3DZh", id: "data-health.data-health-dialogs.dialog-description.4" }} id="data-health.data-health-dialogs.dialog-description">{detail?.details}</DialogDescription>
        </DialogHeader>
        {detail ? (
          <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.11-W0TCiv", id: "data-health.data-health-dialogs.div.11" })} id="data-health.data-health-dialogs.div" className="space-y-3 text-sm">
            <DetailRow id="data-health.data-health-dialogs.detail-row" label="الخطورة" value={severityLabels[detail.severity]} />
            <DetailRow id="data-health.data-health-dialogs.detail-row.2" label="المصدر" value={`${detail.database}.${detail.table}`} />
            <DetailRow id="data-health.data-health-dialogs.detail-row.3" label="معرف السجل" value={detail.recordId} ltr />
            <DetailRow id="data-health.data-health-dialogs.detail-row.4" label="المالك" value={detail.ownerUid || "-"} ltr />
            <DetailRow id="data-health.data-health-dialogs.detail-row.5" label="الإجراء" value={cleanupLabels[detail.cleanupAction]} />
            <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.12-KXK6gK", id: "data-health.data-health-dialogs.div.12" })} id="data-health.data-health-dialogs.div.2">
              <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.13-hTQh1n", id: "data-health.data-health-dialogs.div.13" })} id="data-health.data-health-dialogs.div.3" className="mb-1 text-xs text-on-surface-variant">الدليل</div>
              <pre {...uiAttributes({ uid: "data-health.data-health-dialogs.pre-JeXW1a", id: "data-health.data-health-dialogs.pre" })} className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
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
      <DialogContent ui={{ uid: "data-health.cleanup-plan.content-9Kj8Fg", id: "data-health.cleanup-plan.dialog-content" }} id="data-health.data-health-dialogs.dialog-content.2" className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader ui={{ uid: "data-health.data-health-dialogs.dialog-header.5-HYJ9uf", id: "data-health.data-health-dialogs.dialog-header.5" }} id="data-health.data-health-dialogs.dialog-header.2">
          <DialogTitle ui={{ uid: "data-health.data-health-dialogs.dialog-title.5-Gg7THy", id: "data-health.data-health-dialogs.dialog-title.5" }} id="data-health.data-health-dialogs.dialog-title.2">معاينة خطة التنظيف</DialogTitle>
          <DialogDescription ui={{ uid: "data-health.data-health-dialogs.dialog-description.5-K1ZTq7", id: "data-health.data-health-dialogs.dialog-description.5" }} id="data-health.data-health-dialogs.dialog-description.2">
            الخطة صالحة حتى {dateText(plan?.expiresAt)} ولا يمكن استخدامها أكثر من مرة.
          </DialogDescription>
        </DialogHeader>
        <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.14-pMtp40", id: "data-health.data-health-dialogs.div.14" })} id="data-health.data-health-dialogs.div.4" className="space-y-2">
          {plan?.preview.map((item) => (
            <div key={item.issueId} {...uiAttributes({ uid: "data-health.data-health-dialogs.div.15-EqqjN4", id: "data-health.data-health-dialogs.div.15" })} className="rounded-md border p-3 text-sm">
              <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.16-P8biR8", id: "data-health.data-health-dialogs.div.16" })} className="font-medium">{item.title}</div>
              <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.17-B24K7v", id: "data-health.data-health-dialogs.div.17" })} className="mt-1 text-xs text-on-surface-variant">
                {cleanupLabels[item.action]}،{" "}
                {item.cleanupMode === "quarantine" ? "حجر 30 يومًا" : "تنفيذ مباشر"}
              </div>
            </div>
          ))}
        </div>
        <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.18-xcFR44", id: "data-health.data-health-dialogs.div.18" })} id="data-health.data-health-dialogs.div.5" className="space-y-1">
          <label {...uiAttributes({ uid: "data-health.data-health-dialogs.label.3-0wnyTF", id: "data-health.data-health-dialogs.label.3" })} id="data-health.data-health-dialogs.label" className="text-sm font-medium">اكتب العبارة التالية للتأكيد:</label>
          <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.19-Uc41Jx", id: "data-health.data-health-dialogs.div.19" })} id="data-health.data-health-dialogs.div.6" className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
            {plan?.confirmationText}
          </div>
          <Input id="data-health.data-health-dialogs.input" ui={{ uid: "data-health.plan-dialog.confirmation-T28K1D", id: "data-health.plan-dialog.confirmation", kind: "field", part: "confirmation" }}
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter ui={{ uid: "data-health.data-health-dialogs.dialog-footer.3-Kf1k6m", id: "data-health.data-health-dialogs.dialog-footer.3" }} id="data-health.data-health-dialogs.dialog-footer" className="gap-2">
          <Button id="data-health.data-health-dialogs.button" ui={{ uid: "data-health.plan-dialog.cancel-1BXAzX", id: "data-health.plan-dialog.cancel", kind: "action", action: "cancel", part: "dialog-footer" }} variant="outline" onClick={() => setPlan(null)}>
            إلغاء
          </Button>
          <Button id="data-health.data-health-dialogs.button.2" ui={{ uid: "data-health.plan-dialog.confirm-H8cx3F", id: "data-health.plan-dialog.confirm", kind: "action", action: "stage-plan-execution", part: "dialog-footer" }}
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
      <DialogContent ui={{ uid: "data-health.order-purge.content-15Lsyv", id: "data-health.order-purge.dialog-content" }} id="data-health.data-health-dialogs.dialog-content.3" className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader ui={{ uid: "data-health.data-health-dialogs.dialog-header.6-b4wFNr", id: "data-health.data-health-dialogs.dialog-header.6" }} id="data-health.data-health-dialogs.dialog-header.3">
          <DialogTitle ui={{ uid: "data-health.data-health-dialogs.dialog-title.6-HU6B3o", id: "data-health.data-health-dialogs.dialog-title.6" }} id="data-health.data-health-dialogs.dialog-title.3">معاينة حذف جميع الطلبات</DialogTitle>
          <DialogDescription ui={{ uid: "data-health.data-health-dialogs.dialog-description.6-UgV71D", id: "data-health.data-health-dialogs.dialog-description.6" }} id="data-health.data-health-dialogs.dialog-description.3">
            هذه عملية نهائية تشمل كل أنواع الطلبات والسجلات التابعة لها. الخطة صالحة حتى {dateText(orderPurgePlan?.expiresAt)}.
          </DialogDescription>
        </DialogHeader>
        <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.20-5vZVkE", id: "data-health.data-health-dialogs.div.20" })} id="data-health.data-health-dialogs.div.7" className="grid gap-2 sm:grid-cols-3">
          <DetailRow id="data-health.data-health-dialogs.detail-row.6" label="الطلبات" value={String(orderPurgePlan?.orderCount ?? 0)} />
          <DetailRow id="data-health.data-health-dialogs.detail-row.7" label="صور الطلبات" value={String(orderPurgePlan?.imageCount ?? 0)} />
          <DetailRow id="data-health.data-health-dialogs.detail-row.8"
            label="المصدر"
            value={`${orderPurgePlan?.databaseSource ?? "-"} / ${orderPurgePlan?.storageSource ?? "-"}`}
            ltr
          />
        </div>
        <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.21-L1C4yZ", id: "data-health.data-health-dialogs.div.21" })} id="data-health.data-health-dialogs.div.8" className="max-h-52 overflow-y-auto rounded-md border">
          {Object.entries(orderPurgePlan?.tableCounts ?? {}).map(([table, count]) => (
            <div key={table} {...uiAttributes({ uid: "data-health.data-health-dialogs.div.22-7G637n", id: "data-health.data-health-dialogs.div.22" })} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
              <span {...uiAttributes({ uid: "data-health.data-health-dialogs.span-S52iZ8", id: "data-health.data-health-dialogs.span" })} dir="ltr">{table}</span>
              <span {...uiAttributes({ uid: "data-health.data-health-dialogs.span.2-pSOQm6", id: "data-health.data-health-dialogs.span.2" })}>{count}</span>
            </div>
          ))}
        </div>
        <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.23-69F3v7", id: "data-health.data-health-dialogs.div.23" })} id="data-health.data-health-dialogs.div.9" className="space-y-1">
          <label {...uiAttributes({ uid: "data-health.data-health-dialogs.label.4-GFGZ3A", id: "data-health.data-health-dialogs.label.4" })} id="data-health.data-health-dialogs.label.2" className="text-sm font-medium">اكتب العبارة التالية حرفيًا للتأكيد:</label>
          <div {...uiAttributes({ uid: "data-health.data-health-dialogs.div.24-SFzH82", id: "data-health.data-health-dialogs.div.24" })} id="data-health.data-health-dialogs.div.10" className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
            {orderPurgePlan?.confirmationText}
          </div>
          <Input id="data-health.data-health-dialogs.input.2" ui={{ uid: "data-health.order-purge-dialog.confirmation-vMFMZ3", id: "data-health.order-purge-dialog.confirmation", kind: "field", part: "confirmation" }}
            value={orderPurgeConfirmation}
            onChange={(event) => setOrderPurgeConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter ui={{ uid: "data-health.data-health-dialogs.dialog-footer.4-0OCyeg", id: "data-health.data-health-dialogs.dialog-footer.4" }} id="data-health.data-health-dialogs.dialog-footer.2" className="gap-2">
          <Button id="data-health.data-health-dialogs.button.3" ui={{ uid: "data-health.order-purge-dialog.cancel-1fBQND", id: "data-health.order-purge-dialog.cancel", kind: "action", action: "cancel", part: "dialog-footer" }}
            variant="outline"
            disabled={orderPurgeBusy}
            onClick={() => setOrderPurgePlan(null)}
          >
            إلغاء
          </Button>
          <Button id="data-health.data-health-dialogs.button.4" ui={{ uid: "data-health.order-purge-dialog.confirm-KNb66D", id: "data-health.order-purge-dialog.confirm", kind: "action", action: "stage-order-purge", part: "dialog-footer" }}
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
