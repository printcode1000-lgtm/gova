"use client";

import { LoaderCircle, Play, StopCircle, Clipboard } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/ui/button";
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
    <aside id="google-play-console.deploy-runbook-execution-box.aside" className="min-w-0 w-full space-y-3">
      <header id="google-play-console.deploy-runbook-execution-box.header" className="rounded-md border bg-surface p-3 sm:p-4">
        <h2 id="google-play-console.deploy-runbook-execution-box.h2" className="font-semibold">التنفيذ</h2>
        <p id="google-play-console.deploy-runbook-execution-box.p" className="mt-1 text-xs text-on-surface-variant">
          شغّل أو أوقف job النظام المحلي بعد مراجعة الأمر وعبارة التأكيد.
        </p>
      </header>

      <DeployRunbookCollapsible id="google-play-console.deploy-runbook-execution-box.deploy-runbook-collapsible"
        title="معاينة الأمر"
        description="الأمر الذي سيُنفَّذ فعلياً عبر job النظام."
      >
        <div id="google-play-console.deploy-runbook-execution-box.div" className="min-w-0 overflow-x-auto rounded-md bg-muted p-3 text-xs">
          <code className="block min-w-0 whitespace-pre-wrap break-all text-left" dir="ltr">
            {props.commandPreview}
          </code>
          <p id="google-play-console.deploy-runbook-execution-box.p.2" className="mt-2 break-words text-on-surface-variant">
            راجع المعاينة قبل التشغيل؛ السجل الكامل يظهر في الطرفية.
          </p>
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible id="google-play-console.deploy-runbook-execution-box.deploy-runbook-collapsible.2"
        title="خيارات الأمان"
        description="تجاوزات حساسة للنشر والـ manifest والملفات المؤقتة."
      >
        <div id="google-play-console.deploy-runbook-execution-box.div.2" className="grid gap-2">
          <Option id="google-play-console.deploy-runbook-execution-box.option"
            checked={props.allowEmpty}
            onChange={props.setAllowEmpty}
            label="السماح بتنفيذ فارغ"
            help="يسمح بإعادة نشر نفس commit أو إنشاء commit فارغ عند الحاجة."
          />
          <Option id="google-play-console.deploy-runbook-execution-box.option.2"
            checked={props.allowManifestDowngrade}
            onChange={props.setAllowManifestDowngrade}
            label="السماح بخفض manifest"
            help="يتجاوز حماية خفض releaseId/version. لا تستخدمه إلا إذا كان الخفض مقصوداً."
          />
          <Option id="google-play-console.deploy-runbook-execution-box.option.3"
            checked={props.allowScratchFiles}
            onChange={props.setAllowScratchFiles}
            label="السماح بملفات scratch"
            help="يسمح بنشر logs/tmp/scratchpad. الافتراضي يمنعها لأنها غالباً بقايا عمل."
          />
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible id="google-play-console.deploy-runbook-execution-box.deploy-runbook-collapsible.3"
        title="تشغيل وإيقاف"
        description="عبارة التأكيد مطلوبة قبل بدء أي نشر إنتاجي."
      >
        <div id="google-play-console.deploy-runbook-execution-box.div.3" className="space-y-3">
          <div id="google-play-console.deploy-runbook-execution-box.div.4" className="space-y-1">
            <label id="google-play-console.deploy-runbook-execution-box.label" className="block space-y-1 text-sm">
              <span id="google-play-console.deploy-runbook-execution-box.span">عبارة التأكيد</span>
              <input id="google-play-console.deploy-runbook-execution-box.input"
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
            <p id="google-play-console.deploy-runbook-execution-box.p.3" className="rounded-md bg-error-container p-2 text-sm text-on-error-container break-words">
              {props.startError}
            </p>
          ) : null}
          <div id="google-play-console.deploy-runbook-execution-box.div.5" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button id="google-play-console.deploy-runbook-execution-box.button.2"
              className="w-full sm:w-auto"
              disabled={props.locked || props.confirmation !== props.exactPhrase}
              onClick={props.onStart}
            >
              {props.locked ? (
                <LoaderCircle id="google-play-console.deploy-runbook-execution-box.loader-circle" className="h-4 w-4 animate-spin" />
              ) : (
                <Play id="google-play-console.deploy-runbook-execution-box.play" className="h-4 w-4" />
              )}
              {props.locked ? "قيد التشغيل" : "تشغيل"}
            </Button>
            {props.activeJob ? (
              <Button id="google-play-console.deploy-runbook-execution-box.button.3" variant="destructive" className="w-full sm:w-auto" onClick={props.onCancel}>
                <StopCircle id="google-play-console.deploy-runbook-execution-box.stop-circle" className="h-4 w-4" />
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
    <div id="google-play-console.deploy-runbook-execution-box.div.6" className="flex flex-wrap items-start justify-between gap-2 text-xs text-on-surface-variant">
      <p id="google-play-console.deploy-runbook-execution-box.p.4" className="min-w-0 break-words">
        يجب كتابة{" "}
        <button id="google-play-console.deploy-runbook-execution-box.button"
          type="button"
          className="font-mono text-primary underline-offset-2 active:underline"
          dir="ltr"
          onClick={applyPhrase}
        >
          {props.exactPhrase}
        </button>
        {" "}لتأكيد أن الأمر قد يدفع وينشر إنتاجياً.
      </p>
      <Button id="google-play-console.deploy-runbook-execution-box.button.4"
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 px-2"
        onClick={applyPhrase}
      >
        <Clipboard id="google-play-console.deploy-runbook-execution-box.clipboard" className="h-3.5 w-3.5" />
        {copied ? "تم النسخ" : "نسخ العبارة"}
      </Button>
    </div>
  );
}
