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
      <DialogContent id='features-data-health-presentation-datahealthdialogs-dialogcontent-1-o6jv0v' className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader id='features-data-health-presentation-datahealthdialogs-dialogheader-2-ogzjxz'>
          <DialogTitle id='features-data-health-presentation-datahealthdialogs-dialogtitle-3-7mvmqs'>{detail?.title}</DialogTitle>
          <DialogDescription id='features-data-health-presentation-datahealthdialogs-dialogdescription-4-qpmyvc'>{detail?.details}</DialogDescription>
        </DialogHeader>
        {detail ? (
          <div id='features-data-health-presentation-datahealthdialogs-div-5-qwuuu3' className="space-y-3 text-sm">
            <DetailRow id='features-data-health-presentation-datahealthdialogs-detailrow-6-ry7zrr' label="الخطورة" value={severityLabels[detail.severity]} />
            <DetailRow id='features-data-health-presentation-datahealthdialogs-detailrow-7-vrhid5' label="المصدر" value={`${detail.database}.${detail.table}`} />
            <DetailRow id='features-data-health-presentation-datahealthdialogs-detailrow-8-pj2gn5' label="معرف السجل" value={detail.recordId} ltr />
            <DetailRow id='features-data-health-presentation-datahealthdialogs-detailrow-9-ukxlkz' label="المالك" value={detail.ownerUid || "-"} ltr />
            <DetailRow id='features-data-health-presentation-datahealthdialogs-detailrow-10-fafonn' label="الإجراء" value={cleanupLabels[detail.cleanupAction]} />
            <div id='features-data-health-presentation-datahealthdialogs-div-11-fop0cg'>
              <div id='features-data-health-presentation-datahealthdialogs-div-12-iciqgz' className="mb-1 text-xs text-on-surface-variant">الدليل</div>
              <pre id="features-data-health-presentation-datahealthdialogs-pre-13-wznsks" className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
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
      <DialogContent id='features-data-health-presentation-datahealthdialogs-dialogcontent-14-a2qoyb' className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader id='features-data-health-presentation-datahealthdialogs-dialogheader-15-3i48c5'>
          <DialogTitle id='features-data-health-presentation-datahealthdialogs-dialogtitle-16-2g6bfy'>معاينة خطة التنظيف</DialogTitle>
          <DialogDescription id='features-data-health-presentation-datahealthdialogs-dialogdescription-17-6vw0wf'>
            الخطة صالحة حتى {dateText(plan?.expiresAt)} ولا يمكن استخدامها أكثر من مرة.
          </DialogDescription>
        </DialogHeader>
        <div id='features-data-health-presentation-datahealthdialogs-div-18-0cxobq' className="space-y-2">
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
        <div id='features-data-health-presentation-datahealthdialogs-div-19-9jppa8' className="space-y-1">
          <label id='features-data-health-presentation-datahealthdialogs-label-20-fhitry' className="text-sm font-medium">اكتب العبارة التالية للتأكيد:</label>
          <div id='features-data-health-presentation-datahealthdialogs-div-21-9cxrvz' className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
            {plan?.confirmationText}
          </div>
          <Input id='features-data-health-presentation-datahealthdialogs-input-22-ty0plj'
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter id='features-data-health-presentation-datahealthdialogs-dialogfooter-23-qnukkk' className="gap-2">
          <Button id='features-data-health-presentation-datahealthdialogs-button-24-khdnxj' variant="outline" onClick={() => setPlan(null)}>
            إلغاء
          </Button>
          <Button id='features-data-health-presentation-datahealthdialogs-button-25-xyjker'
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
      <DialogContent id='features-data-health-presentation-datahealthdialogs-dialogcontent-26-bljxrl' className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader id='features-data-health-presentation-datahealthdialogs-dialogheader-27-9xgpbt'>
          <DialogTitle id='features-data-health-presentation-datahealthdialogs-dialogtitle-28-hpvybm'>معاينة حذف جميع الطلبات</DialogTitle>
          <DialogDescription id='features-data-health-presentation-datahealthdialogs-dialogdescription-29-dxnnvl'>
            هذه عملية نهائية تشمل كل أنواع الطلبات والسجلات التابعة لها. الخطة صالحة حتى {dateText(orderPurgePlan?.expiresAt)}.
          </DialogDescription>
        </DialogHeader>
        <div id='features-data-health-presentation-datahealthdialogs-div-30-v0kyqr' className="grid gap-2 sm:grid-cols-3">
          <DetailRow id='features-data-health-presentation-datahealthdialogs-detailrow-31-jjtwmi' label="الطلبات" value={String(orderPurgePlan?.orderCount ?? 0)} />
          <DetailRow id='features-data-health-presentation-datahealthdialogs-detailrow-32-dcnsmw' label="صور الطلبات" value={String(orderPurgePlan?.imageCount ?? 0)} />
          <DetailRow id='features-data-health-presentation-datahealthdialogs-detailrow-33-stdgbx'
            label="المصدر"
            value={`${orderPurgePlan?.databaseSource ?? "-"} / ${orderPurgePlan?.storageSource ?? "-"}`}
            ltr
          />
        </div>
        <div id='features-data-health-presentation-datahealthdialogs-div-34-ebloia' className="max-h-52 overflow-y-auto rounded-md border">
          {Object.entries(orderPurgePlan?.tableCounts ?? {}).map(([table, count]) => (
            <div key={table} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
              <span dir="ltr">{table}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
        <div id='features-data-health-presentation-datahealthdialogs-div-35-b9ou16' className="space-y-1">
          <label id='features-data-health-presentation-datahealthdialogs-label-36-qyueif' className="text-sm font-medium">اكتب العبارة التالية حرفيًا للتأكيد:</label>
          <div id='features-data-health-presentation-datahealthdialogs-div-37-nsxxtd' className="select-all rounded-md bg-muted p-2 text-sm font-semibold">
            {orderPurgePlan?.confirmationText}
          </div>
          <Input id='features-data-health-presentation-datahealthdialogs-input-38-5aaiul'
            value={orderPurgeConfirmation}
            onChange={(event) => setOrderPurgeConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter id='features-data-health-presentation-datahealthdialogs-dialogfooter-39-lk1ehe' className="gap-2">
          <Button id='features-data-health-presentation-datahealthdialogs-button-40-wy22fs'
            variant="outline"
            disabled={orderPurgeBusy}
            onClick={() => setOrderPurgePlan(null)}
          >
            إلغاء
          </Button>
          <Button id='features-data-health-presentation-datahealthdialogs-button-41-ieg6pc'
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
