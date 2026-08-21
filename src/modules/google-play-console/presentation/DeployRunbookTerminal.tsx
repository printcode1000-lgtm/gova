"use client";

import * as React from "react";
import { Clipboard, Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DeployTab } from "./DeployRunbookTypes";
import { parseDeployRunbookLogSnapshot } from "./deploy-runbook-log-snapshot";

export function ExecutionIndicator(props: { log: string; tab: DeployTab; status: string }) {
  const snapshot = React.useMemo(
    () => parseDeployRunbookLogSnapshot(props.log, props.tab),
    [props.log, props.tab],
  );
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      <IndicatorCard label="الحالة" value={props.status} help="حالة الـ job كما يراها مشغل الأوامر." />
      <IndicatorCard
        label="الأمر"
        value={snapshot.commandFamily}
        help="هل السجل الحالي من Deploy All أم Deploy Push."
      />
      <IndicatorCard
        label="المرحلة"
        value={snapshot.phase}
        help="آخر مرحلة ظهرت في الطرفية."
      />
      <IndicatorCard
        label="القسم"
        value={snapshot.section}
        help="آخر قسم داخلي معروف داخل المرحلة."
      />
      <IndicatorCard
        label="الفرع / الأمر"
        value={snapshot.branch}
        help="آخر branch أو npm script بدأ تنفيذه."
        className="sm:col-span-2 xl:col-span-1"
      />
    </div>
  );
}

export function TerminalOutput(props: { text: string }) {
  const empty = "لا يوجد خرج بعد. شغّل أحد التبويبين لعرض سجل الطرفية هنا.";
  return (
    <div
      className={
        "asol-terminal-scroll min-h-48 max-h-[32rem] w-full min-w-0 " +
        "sm:min-h-64 sm:max-h-[42rem] rounded-md bg-muted"
      }
    >
      <pre className="asol-selectable min-w-0 p-3 text-xs whitespace-pre-wrap break-words" dir="ltr">
        {props.text || empty}
      </pre>
    </div>
  );
}

export function TerminalActions(props: { onCopy: () => void; onClear: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="shrink-0" onClick={props.onCopy}>
        <Clipboard className="h-4 w-4" />
        نسخ
      </Button>
      <Button variant="outline" size="sm" className="shrink-0" onClick={props.onClear}>
        <Eraser className="h-4 w-4" />
        مسح العرض
      </Button>
    </div>
  );
}

function IndicatorCard(props: {
  label: string;
  value: string;
  help: string;
  className?: string;
}) {
  return (
    <div className={props.className ?? ""}>
      <div className="min-w-0 rounded-md border bg-surface p-3">
        <div className="text-xs text-on-surface-variant">{props.label}</div>
        <div className="mt-1 text-sm font-semibold break-words sm:text-base" dir="ltr">
          {props.value || "—"}
        </div>
        <p className="mt-1 text-[11px] text-on-surface-variant break-words">{props.help}</p>
      </div>
    </div>
  );
}
