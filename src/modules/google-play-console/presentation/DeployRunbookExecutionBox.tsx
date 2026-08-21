"use client";

import { LoaderCircle, Play, StopCircle, Clipboard } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { NativeCore } from "@asol/native-core";
import { Option } from "./DeployRunbookControls";
import { DeployRunbookCollapsible } from "./DeployRunbookCollapsible";

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
    <aside className="min-w-0 w-full space-y-3">
      <header className="rounded-md border bg-surface p-3 sm:p-4">
        <h2 className="font-semibold">التنفيذ</h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          شغّل أو أوقف job النظام المحلي بعد مراجعة الأمر وعبارة التأكيد.
        </p>
      </header>

      <DeployRunbookCollapsible
        title="معاينة الأمر"
        description="الأمر الذي سيُنفَّذ فعلياً عبر job النظام."
      >
        <div className="min-w-0 overflow-x-auto rounded-md bg-muted p-3 text-xs">
          <code className="block min-w-0 whitespace-pre-wrap break-all text-left" dir="ltr">
            {props.commandPreview}
          </code>
          <p className="mt-2 break-words text-on-surface-variant">
            راجع المعاينة قبل التشغيل؛ السجل الكامل يظهر في الطرفية.
          </p>
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible
        title="خيارات الأمان"
        description="تجاوزات حساسة للنشر والـ manifest والملفات المؤقتة."
      >
        <div className="grid gap-2">
          <Option
            checked={props.allowEmpty}
            onChange={props.setAllowEmpty}
            label="السماح بتنفيذ فارغ"
            help="يسمح بإعادة نشر نفس commit أو إنشاء commit فارغ عند الحاجة."
          />
          <Option
            checked={props.allowManifestDowngrade}
            onChange={props.setAllowManifestDowngrade}
            label="السماح بخفض manifest"
            help="يتجاوز حماية خفض releaseId/version. لا تستخدمه إلا إذا كان الخفض مقصوداً."
          />
          <Option
            checked={props.allowScratchFiles}
            onChange={props.setAllowScratchFiles}
            label="السماح بملفات scratch"
            help="يسمح بنشر logs/tmp/scratchpad. الافتراضي يمنعها لأنها غالباً بقايا عمل."
          />
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible
        title="تشغيل وإيقاف"
        description="عبارة التأكيد مطلوبة قبل بدء أي نشر إنتاجي."
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block space-y-1 text-sm">
              <span>عبارة التأكيد</span>
              <input
                className="w-full rounded-md border bg-background p-2 text-left"
                dir="ltr"
                value={props.confirmation}
                onChange={(event) => props.setConfirmation(event.target.value)}
                placeholder={props.exactPhrase}
              />
            </label>
            <ConfirmationPhraseHelp exactPhrase={props.exactPhrase} onApply={props.setConfirmation} />
          </div>
          {props.startError ? (
            <p className="rounded-md bg-error-container p-2 text-sm text-on-error-container break-words">
              {props.startError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              className="w-full sm:w-auto"
              disabled={props.locked || props.confirmation !== props.exactPhrase}
              onClick={props.onStart}
            >
              {props.locked ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {props.locked ? "قيد التشغيل" : "تشغيل"}
            </Button>
            {props.activeJob ? (
              <Button variant="destructive" className="w-full sm:w-auto" onClick={props.onCancel}>
                <StopCircle className="h-4 w-4" />
                إيقاف
              </Button>
            ) : null}
          </div>
        </div>
      </DeployRunbookCollapsible>
    </aside>
  );
}

function ConfirmationPhraseHelp(props: { exactPhrase: string; onApply: (value: string) => void }) {
  const [copied, setCopied] = React.useState(false);

  const applyPhrase = () => {
    props.onApply(props.exactPhrase);
    void NativeCore.writeClipboard({ string: props.exactPhrase }).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="asol-selectable flex flex-wrap items-start justify-between gap-2 text-xs text-on-surface-variant">
      <p className="min-w-0 break-words">
        يجب كتابة{" "}
        <button
          type="button"
          className="font-mono text-primary underline-offset-2 active:underline"
          dir="ltr"
          onClick={applyPhrase}
        >
          {props.exactPhrase}
        </button>
        {" "}لتأكيد أن الأمر قد يدفع وينشر إنتاجياً.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 px-2"
        onClick={applyPhrase}
      >
        <Clipboard className="h-3.5 w-3.5" />
        {copied ? "تم النسخ" : "نسخ العبارة"}
      </Button>
    </div>
  );
}
