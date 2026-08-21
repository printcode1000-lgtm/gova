"use client";

import { LoaderCircle, Play, StopCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Option } from "./DeployRunbookControls";

export function ExecutionBox(props: {
  locked: boolean;
  activeJob: unknown;
  exactPhrase: string;
  confirmation: string;
  setConfirmation: (value: string) => void;
  commandPreview: string;
  allowEmpty: boolean;
  setAllowEmpty: (value: boolean) => void;
  allowManifestDowngrade: boolean;
  setAllowManifestDowngrade: (value: boolean) => void;
  allowScratchFiles: boolean;
  setAllowScratchFiles: (value: boolean) => void;
  startError: string;
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <aside className="space-y-3 rounded-md border bg-surface p-4">
      <h2 className="font-semibold">التنفيذ</h2>
      <div className="rounded-md bg-muted p-3 text-xs">
        <div className="mb-1 font-semibold">معاينة الأمر</div>
        <code className="block break-words text-left" dir="ltr">{props.commandPreview}</code>
        <p className="mt-2 text-on-surface-variant">هذه المعاينة تساعدك قبل الضغط على تشغيل؛ التنفيذ الفعلي يتم عبر job النظام وسجله يظهر في الطرفية.</p>
      </div>
      <Option checked={props.allowEmpty} onChange={props.setAllowEmpty} label="السماح بتنفيذ فارغ" help="يسمح بإعادة نشر نفس commit أو إنشاء commit فارغ عند الحاجة." />
      <Option checked={props.allowManifestDowngrade} onChange={props.setAllowManifestDowngrade} label="السماح بخفض manifest" help="يتجاوز حماية خفض releaseId/version. لا تستخدمه إلا إذا كان الخفض مقصوداً." />
      <Option checked={props.allowScratchFiles} onChange={props.setAllowScratchFiles} label="السماح بملفات scratch" help="يسمح بنشر logs/tmp/scratchpad. الافتراضي يمنعها لأنها غالباً بقايا عمل." />
      <label className="block space-y-1 text-sm">
        <span>عبارة التأكيد</span>
        <input className="w-full rounded-md border bg-background p-2 text-left" dir="ltr" value={props.confirmation} onChange={(event) => props.setConfirmation(event.target.value)} placeholder={props.exactPhrase} />
        <span className="block text-xs text-on-surface-variant">يجب كتابة {props.exactPhrase} لتأكيد أن الأمر قد يدفع وينشر إنتاجياً.</span>
      </label>
      {props.startError ? <p className="rounded-md bg-error-container p-2 text-sm text-on-error-container">{props.startError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={props.locked || props.confirmation !== props.exactPhrase} onClick={props.onStart}>
          {props.locked ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {props.locked ? "قيد التشغيل" : "تشغيل"}
        </Button>
        {props.activeJob ? <Button variant="destructive" onClick={props.onCancel}><StopCircle className="h-4 w-4" />إيقاف</Button> : null}
      </div>
    </aside>
  );
}
