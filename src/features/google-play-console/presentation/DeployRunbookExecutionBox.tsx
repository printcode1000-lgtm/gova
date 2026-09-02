"use client";

import { LoaderCircle, Play, StopCircle, Clipboard } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/ui/button";
import { NativeCore } from "@asol/native-core";
import { Option } from "./DeployRunbookControls";
import { DeployRunbookCollapsible } from "./DeployRunbookCollapsible";

import {
  ALLOW_DOWNGRADE_HELP,
  ALLOW_SCRATCH_HELP,
  EXECUTION_BOX_DESCRIPTION,
} from "./deploy-runbook-labels";

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
    <aside id='features-google-play-console-presentation-deployrunbookexecutionbox-aside-1-lrnjzz' className="min-w-0 w-full space-y-3">
      <header
        id='features-google-play-console-presentation-deployrunbookexecutionbox-header-2-ieyyni'
        className="rounded-md border bg-surface p-3 sm:p-4"
      >
        <h2 id='features-google-play-console-presentation-deployrunbookexecutionbox-heading-3-kgupzz' className="font-semibold">التنفيذ</h2>
        <p id='features-google-play-console-presentation-deployrunbookexecutionbox-text-4-tg7q3w' className="mt-1 text-xs text-on-surface-variant">
          {EXECUTION_BOX_DESCRIPTION}
        </p>
      </header>

      <DeployRunbookCollapsible id='features-google-play-console-presentation-deployrunbookexecutionbox-deployrunbookcollapsible-5-gsv7ta'
        title="معاينة الأمر"
        description="الأمر الذي سيُنفَّذ فعلياً عبر job النظام."
      >
        <div
          id='features-google-play-console-presentation-deployrunbookexecutionbox-div-6-gxdx83'
          className="min-w-0 overflow-x-auto rounded-md bg-muted p-3 text-xs"
        >
          <code id="features-google-play-console-presentation-deployrunbookexecutionbox-code-7-bhcdnp" className="block min-w-0 whitespace-pre-wrap break-all text-left" dir="ltr">
            {props.commandPreview}
          </code>
          <p
            id='features-google-play-console-presentation-deployrunbookexecutionbox-text-8-vxyt2p'
            className="mt-2 break-words text-on-surface-variant"
          >
            راجع المعاينة قبل التشغيل؛ السجل الكامل يظهر في الطرفية.
          </p>
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible id='features-google-play-console-presentation-deployrunbookexecutionbox-deployrunbookcollapsible-9-ko6c4m'
        title="خيارات الأمان"
        description="تجاوزات حساسة للنشر والـ manifest والملفات المؤقتة."
      >
        <div id='features-google-play-console-presentation-deployrunbookexecutionbox-div-10-alwkvd' className="grid gap-2">
          <Option id='features-google-play-console-presentation-deployrunbookexecutionbox-option-11-gisbw4'
            checked={props.allowEmpty}
            onChange={props.setAllowEmpty}
            label="السماح بتنفيذ فارغ"
            help="يسمح بإعادة نشر نفس commit أو إنشاء commit فارغ عند الحاجة."
          />
          <Option id='features-google-play-console-presentation-deployrunbookexecutionbox-option-12-yy0via'
            checked={props.allowManifestDowngrade}
            onChange={props.setAllowManifestDowngrade}
            label="السماح بخفض manifest"
            help={ALLOW_DOWNGRADE_HELP}
          />
          <Option id='features-google-play-console-presentation-deployrunbookexecutionbox-option-13-0y0q6x'
            checked={props.allowScratchFiles}
            onChange={props.setAllowScratchFiles}
            label="السماح بملفات scratch"
            help={ALLOW_SCRATCH_HELP}
          />
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible id='features-google-play-console-presentation-deployrunbookexecutionbox-deployrunbookcollapsible-14-kdymip'
        title="تشغيل وإيقاف"
        description="عبارة التأكيد مطلوبة قبل بدء أي نشر إنتاجي."
      >
        <div id='features-google-play-console-presentation-deployrunbookexecutionbox-div-15-madnai' className="space-y-3">
          <div id='features-google-play-console-presentation-deployrunbookexecutionbox-div-16-wdgclw' className="space-y-1">
            <label id='features-google-play-console-presentation-deployrunbookexecutionbox-label-17-n3va9q' className="block space-y-1 text-sm">
              <span id='features-google-play-console-presentation-deployrunbookexecutionbox-text-18-pfurxx'>عبارة التأكيد</span>
              <input id='features-google-play-console-presentation-deployrunbookexecutionbox-input-19-qjn0mr'
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
            <p
              id='features-google-play-console-presentation-deployrunbookexecutionbox-text-20-hj1zqu'
              className="rounded-md bg-error-container p-2 text-sm text-on-error-container break-words"
            >
              {props.startError}
            </p>
          ) : null}
          <div
            id='features-google-play-console-presentation-deployrunbookexecutionbox-div-21-1rc7hi'
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          >
            <Button id='features-google-play-console-presentation-deployrunbookexecutionbox-button-22-z4t5xm'
              className="w-full sm:w-auto"
              disabled={props.locked || props.confirmation !== props.exactPhrase}
              onClick={props.onStart}
            >
              {props.locked ? (
                <LoaderCircle
                  id='features-google-play-console-presentation-deployrunbookexecutionbox-loadercircle-23-0ib5e5'
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <Play id='features-google-play-console-presentation-deployrunbookexecutionbox-play-24-yniwj5' className="h-4 w-4" />
              )}
              {props.locked ? "قيد التشغيل" : "تشغيل"}
            </Button>
            {props.activeJob ? (
              <Button
                id='features-google-play-console-presentation-deployrunbookexecutionbox-button-25-dgixpw'
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={props.onCancel}
              >
                <StopCircle id='features-google-play-console-presentation-deployrunbookexecutionbox-stopcircle-26-0qpuoe' className="h-4 w-4" />
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
    <div
      id='features-google-play-console-presentation-deployrunbookexecutionbox-div-27-q7hem2'
      className="flex flex-wrap items-start justify-between gap-2 text-xs text-on-surface-variant"
    >
      <p id='features-google-play-console-presentation-deployrunbookexecutionbox-text-28-gkvlkk' className="min-w-0 break-words">
        يجب كتابة{" "}
        <button id='features-google-play-console-presentation-deployrunbookexecutionbox-button-29-uzfzkx'
          type="button"
          className="font-mono text-primary underline-offset-2 active:underline"
          dir="ltr"
          onClick={applyPhrase}
        >
          {props.exactPhrase}
        </button>
        {" "}لتأكيد أن الأمر قد يدفع وينشر إنتاجياً.
      </p>
      <Button id='features-google-play-console-presentation-deployrunbookexecutionbox-button-30-t9pqhm'
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 px-2"
        onClick={applyPhrase}
      >
        <Clipboard id='features-google-play-console-presentation-deployrunbookexecutionbox-clipboard-31-zryk7f' className="h-3.5 w-3.5" />
        {copied ? "تم النسخ" : "نسخ العبارة"}
      </Button>
    </div>
  );
}
