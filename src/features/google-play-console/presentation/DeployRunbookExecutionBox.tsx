"use client";

import { LoaderCircle, Play, StopCircle, Clipboard } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/ui/button";
import { NativeCore } from "@asol/native-core";
import { Option } from "./DeployRunbookControls";
import { DeployRunbookCollapsible } from "./DeployRunbookCollapsible";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <aside {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.aside.2-XDJ23Y", id: "google-play-console.deploy-runbook-execution-box.aside.2" })} id="google-play-console.deploy-runbook-execution-box.aside" className="min-w-0 w-full space-y-3">
      <header {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.header.2-YsLr7s", id: "google-play-console.deploy-runbook-execution-box.header.2" })} id="google-play-console.deploy-runbook-execution-box.header" className="rounded-md border bg-surface p-3 sm:p-4">
        <h2 {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.h2.2-TTt1yH", id: "google-play-console.deploy-runbook-execution-box.h2.2" })} id="google-play-console.deploy-runbook-execution-box.h2" className="font-semibold">التنفيذ</h2>
        <p {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.p.5-ZKLzp7", id: "google-play-console.deploy-runbook-execution-box.p.5" })} id="google-play-console.deploy-runbook-execution-box.p" className="mt-1 text-xs text-on-surface-variant">
          شغّل أو أوقف job النظام المحلي بعد مراجعة الأمر وعبارة التأكيد.
        </p>
      </header>

      <DeployRunbookCollapsible id="google-play-console.deploy-runbook-execution-box.deploy-runbook-collapsible"
        title="معاينة الأمر"
        description="الأمر الذي سيُنفَّذ فعلياً عبر job النظام."
      >
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.div.7-8M6iaA", id: "google-play-console.deploy-runbook-execution-box.div.7" })} id="google-play-console.deploy-runbook-execution-box.div" className="min-w-0 overflow-x-auto rounded-md bg-muted p-3 text-xs">
          <code {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.code-dfBy9k", id: "google-play-console.deploy-runbook-execution-box.code" })} className="block min-w-0 whitespace-pre-wrap break-all text-left" dir="ltr">
            {props.commandPreview}
          </code>
          <p {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.p.6-62UavF", id: "google-play-console.deploy-runbook-execution-box.p.6" })} id="google-play-console.deploy-runbook-execution-box.p.2" className="mt-2 break-words text-on-surface-variant">
            راجع المعاينة قبل التشغيل؛ السجل الكامل يظهر في الطرفية.
          </p>
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible id="google-play-console.deploy-runbook-execution-box.deploy-runbook-collapsible.2"
        title="خيارات الأمان"
        description="تجاوزات حساسة للنشر والـ manifest والملفات المؤقتة."
      >
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.div.8-0J2Z6t", id: "google-play-console.deploy-runbook-execution-box.div.8" })} id="google-play-console.deploy-runbook-execution-box.div.2" className="grid gap-2">
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
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.div.9-E6WLS9", id: "google-play-console.deploy-runbook-execution-box.div.9" })} id="google-play-console.deploy-runbook-execution-box.div.3" className="space-y-3">
          <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.div.10-VTzUN7", id: "google-play-console.deploy-runbook-execution-box.div.10" })} id="google-play-console.deploy-runbook-execution-box.div.4" className="space-y-1">
            <label {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.label.2-VMs1lU", id: "google-play-console.deploy-runbook-execution-box.label.2" })} id="google-play-console.deploy-runbook-execution-box.label" className="block space-y-1 text-sm">
              <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.span.2-hM7U1S", id: "google-play-console.deploy-runbook-execution-box.span.2" })} id="google-play-console.deploy-runbook-execution-box.span">عبارة التأكيد</span>
              <input {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.input.2-GSTo0k", id: "google-play-console.deploy-runbook-execution-box.input.2" })} id="google-play-console.deploy-runbook-execution-box.input"
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
            <p {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.p.7-W01m1I", id: "google-play-console.deploy-runbook-execution-box.p.7" })} id="google-play-console.deploy-runbook-execution-box.p.3" className="rounded-md bg-error-container p-2 text-sm text-on-error-container break-words">
              {props.startError}
            </p>
          ) : null}
          <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.div.11-p9YkVI", id: "google-play-console.deploy-runbook-execution-box.div.11" })} id="google-play-console.deploy-runbook-execution-box.div.5" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button id="google-play-console.deploy-runbook-execution-box.button.2"
              ui={{
                uid: "deploy-runbook.execution.start-NVT7Gg",
                id: "deploy-runbook.execution.start",
                kind: "action",
                action: "start-run",
                part: "execution",
              }}
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
              <Button id="google-play-console.deploy-runbook-execution-box.button.3"
                ui={{
                  uid: "deploy-runbook.execution.cancel-K6Ga4z",
                  id: "deploy-runbook.execution.cancel",
                  kind: "action",
                  action: "cancel-run",
                  part: "execution",
                }} variant="destructive" className="w-full sm:w-auto" onClick={props.onCancel}>
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
    <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.div.12-aEW4Dg", id: "google-play-console.deploy-runbook-execution-box.div.12" })} id="google-play-console.deploy-runbook-execution-box.div.6" className="flex flex-wrap items-start justify-between gap-2 text-xs text-on-surface-variant">
      <p {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.p.8-wVjO6t", id: "google-play-console.deploy-runbook-execution-box.p.8" })} id="google-play-console.deploy-runbook-execution-box.p.4" className="min-w-0 break-words">
        يجب كتابة{" "}
        <button {...uiAttributes({ uid: "google-play-console.deploy-runbook-execution-box.button.5-H9O5oN", id: "google-play-console.deploy-runbook-execution-box.button.5" })} id="google-play-console.deploy-runbook-execution-box.button"
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
        ui={{
          uid: "deploy-runbook.execution.copy-phrase-FiE69A",
          id: "deploy-runbook.execution.copy-phrase",
          kind: "action",
          action: "copy-confirmation-phrase",
          part: "execution",
        }}
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
