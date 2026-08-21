"use client";

import * as React from "react";
import { Clipboard, Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DeployTab } from "./DeployRunbookTypes";

export function ExecutionIndicator(props: { log: string; tab: DeployTab; status: string }) {
  const snapshot = React.useMemo(() => parseExecutionSnapshot(props.log, props.tab), [props.log, props.tab]);
  return (
    <section className="grid gap-2 md:grid-cols-5">
      <IndicatorCard label="الحالة" value={props.status} help="حالة الـ job كما يراها مشغل الأوامر." />
      <IndicatorCard label="الأمر" value={snapshot.commandFamily} help="هل السجل الحالي من Deploy All أم Deploy Push." />
      <IndicatorCard label="المرحلة" value={snapshot.phase} help="آخر مرحلة ظهرت في الطرفية." />
      <IndicatorCard label="القسم" value={snapshot.section} help="آخر قسم داخلي معروف داخل المرحلة." />
      <IndicatorCard label="الفرع / الأمر" value={snapshot.branch} help="آخر branch أو npm script بدأ تنفيذه." />
    </section>
  );
}

export function Terminal(props: { text: string; onCopy: () => void; onClear: () => void }) {
  return (
    <section className="space-y-2 rounded-md border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">الطرفية</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={props.onCopy}><Clipboard className="h-4 w-4" />نسخ</Button>
          <Button variant="outline" onClick={props.onClear}><Eraser className="h-4 w-4" />مسح العرض</Button>
        </div>
      </div>
      <pre className="min-h-96 max-h-[42rem] overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
        {props.text || "لا يوجد خرج بعد. شغّل أحد التبويبين لعرض سجل الطرفية هنا."}
      </pre>
    </section>
  );
}

function IndicatorCard(props: { label: string; value: string; help: string }) {
  return (
    <div className="rounded-md border bg-surface p-3">
      <div className="text-xs text-on-surface-variant">{props.label}</div>
      <div className="mt-1 truncate text-sm font-semibold" dir="ltr">{props.value || "—"}</div>
      <p className="mt-1 text-[11px] text-on-surface-variant">{props.help}</p>
    </div>
  );
}

function parseExecutionSnapshot(log: string, tab: DeployTab) {
  const lines = log.split(/\r?\n/).filter(Boolean);
  const latest = (pattern: RegExp) => {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const match = lines[index]?.match(pattern);
      if (match?.[1]) return match[1];
    }
    return "";
  };
  const deployAllPhase = latest(/\[deploy:all\]\s+── phase: ([^ ]+) ──/);
  const deployAllSection = latest(/\[deploy:all\] Preflight section: (.+)$/);
  const deployAllBranch = latest(/\[deploy:all\] branch ([^:]+): ([^—]+)(?: — .*)?$/);
  const deployAllStarted = latest(/\[deploy:all\] Starting ([^.\r\n]+)\.\.\./);
  const deployPushStarted = latest(/\[deploy:push\] Starting ([^.\r\n]+)\.\.\./);
  const deployPushTarget = latest(/\[deploy:push\] Service targets: ([^(]+)\(/);
  const pushStep = latest(/\[deploy:push\] (Pushing main to GitHub|Verifying origin\/main matches the pushed commit|Creating deployment commit: .+)$/);
  return {
    commandFamily: tab === "deploy-all" ? "deploy:all" : "deploy:push",
    phase: tab === "deploy-all" ? deployAllPhase || "بانتظار بدء المرحلة" : deployPushTarget || "fast publish",
    section: tab === "deploy-all" ? deployAllSection || "—" : "push / Vercel",
    branch: deployAllBranch || deployAllStarted || deployPushStarted || pushStep || "بانتظار بدء الأمر",
  };
}
