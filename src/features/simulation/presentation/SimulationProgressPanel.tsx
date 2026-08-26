"use client";

import type { SimulationProgressStep, SimulationRunOutcome } from "@asol/simulation-core";
import { Check, CheckCircle2, Circle, Copy, Loader2, MinusCircle, XCircle } from "lucide-react";
import * as React from "react";

import { simulationProgressClipboard } from "./simulation-progress-clipboard";

export type SimulationProgressRunStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "unavailable";

export type SimulationProgressRun = {
  id: string;
  pageId: string;
  pageLabel: string;
  pageRoute?: string;
  interactionId: string;
  interactionLabel: string;
  status: SimulationProgressRunStatus;
  steps: readonly SimulationProgressStep[];
  error?: string;
};

type SimulationProgressPanelProps = {
  steps: readonly SimulationProgressStep[];
  error?: string;
  outcome?: SimulationRunOutcome;
  running?: boolean;
  runs?: readonly SimulationProgressRun[];
  pageLabel?: string;
  pageRoute?: string;
  interactionLabel?: string;
};

function statusLabel(status: SimulationProgressRunStatus) {
  if (status === "passed") return "نجح";
  if (status === "failed") return "فشل";
  if (status === "unavailable") return "غير متاح";
  if (status === "running") return "جارٍ التنفيذ";
  return "بانتظار التنفيذ";
}

function statusIcon(status: SimulationProgressRunStatus) {
  if (status === "passed") return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />;
  if (status === "failed") return <XCircle className="h-4 w-4 shrink-0 text-error" aria-hidden />;
  if (status === "unavailable") return <MinusCircle className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />;
  if (status === "running") return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-secondary" aria-hidden />;
  return <Circle className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />;
}

function singleStatusLabel(outcome: SimulationRunOutcome | undefined, running: boolean) {
  if (running) return "جارٍ التنفيذ";
  if (outcome === "passed") return "نجح";
  if (outcome === "unavailable") return "غير متاح";
  if (outcome === "failed") return "فشل";
  return "لم يبدأ";
}

function pageText(label: string, route?: string) {
  return route ? `${label} ${route}` : label;
}

function buildCopyText(
  steps: readonly SimulationProgressStep[],
  error: string | undefined,
  outcome: SimulationRunOutcome | undefined,
  running: boolean,
  runs: readonly SimulationProgressRun[],
) {
  const lines = ["متابعة تنفيذ E2E"];

  if (runs.length > 0) {
    let activePageId = "";
    for (const run of runs) {
      if (run.pageId !== activePageId) {
        activePageId = run.pageId;
        lines.push("", `الصفحة: ${pageText(run.pageLabel, run.pageRoute)}`);
      }
      lines.push(`  الحدث: ${run.interactionLabel}`);
      lines.push(`  الحالة: ${statusLabel(run.status)}`);
      for (const step of run.steps) {
        lines.push(`    [${step.status}] ${step.label}${step.detail ? ` — ${step.detail}` : ""}`);
      }
      if (run.error) lines.push(`  رسالة الخطأ: ${run.error}`);
    }
    return lines.join("\n");
  }

  lines.push(`الحالة: ${singleStatusLabel(outcome, running)}`);
  for (const step of steps) {
    lines.push(`[${step.status}] ${step.label}${step.detail ? ` — ${step.detail}` : ""}`);
  }
  if (error) lines.push(`رسالة الخطأ: ${error}`);
  return lines.join("\n");
}

function buildErrorsOnlyText(
  error: string | undefined,
  runs: readonly SimulationProgressRun[],
  pageLabel: string | undefined,
  pageRoute: string | undefined,
  interactionLabel: string | undefined,
) {
  const failedRuns = runs.filter((run) => Boolean(run.error));
  const lines: string[] = [];

  if (failedRuns.length > 0) {
    for (const run of failedRuns) {
      if (lines.length > 0) lines.push("");
      lines.push(`الصفحة: ${pageText(run.pageLabel, run.pageRoute)}`);
      lines.push(`الإجراء: ${run.interactionLabel}`);
      lines.push(`الخطأ: ${run.error}`);
    }
    return lines.join("\n");
  }

  if (error && pageLabel && interactionLabel) {
    return [`الصفحة: ${pageText(pageLabel, pageRoute)}`, `الإجراء: ${interactionLabel}`, `الخطأ: ${error}`].join("\n");
  }

  return "";
}

function StepList({ steps }: { steps: readonly SimulationProgressStep[] }) {
  return (
    <ol className="min-w-0 space-y-2">
      {steps.map((step) => (
        <li key={step.id} className="flex min-w-0 items-start gap-3 rounded-xl bg-surface-container-low p-3">
          {step.status === "passed" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> :
            step.status === "failed" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" /> :
              step.status === "running" ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-secondary" /> :
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />}
          <div className="min-w-0 flex-1 break-words">
            <div className="text-sm font-semibold text-on-surface">{step.label}</div>
            {step.detail ? <div className="asol-selectable break-words text-xs text-on-surface-variant">{step.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SimulationProgressPanel({
  steps,
  error,
  outcome,
  running = false,
  runs = [],
  pageLabel,
  pageRoute,
  interactionLabel,
}: SimulationProgressPanelProps) {
  const [copied, setCopied] = React.useState(false);
  const [errorsCopied, setErrorsCopied] = React.useState(false);
  const hasContent = runs.length > 0 || steps.length > 0 || Boolean(error) || outcome !== undefined || running;
  const errorsOnlyText = React.useMemo(
    () => buildErrorsOnlyText(error, runs, pageLabel, pageRoute, interactionLabel),
    [error, runs, pageLabel, pageRoute, interactionLabel],
  );
  const hasErrors = errorsOnlyText.length > 0;
  const pageGroups = React.useMemo(() => {
    const groups: Array<{ pageId: string; pageLabel: string; pageRoute?: string; runs: SimulationProgressRun[] }> = [];
    for (const run of runs) {
      const current = groups.at(-1);
      if (!current || current.pageId !== run.pageId) {
        groups.push({ pageId: run.pageId, pageLabel: run.pageLabel, pageRoute: run.pageRoute, runs: [run] });
      } else {
        current.runs.push(run);
      }
    }
    return groups;
  }, [runs]);

  const handleCopy = async () => {
    if (!hasContent) return;
    try {
      await simulationProgressClipboard.write(buildCopyText(steps, error, outcome, running, runs));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleCopyErrors = async () => {
    if (!hasErrors) return;
    try {
      await simulationProgressClipboard.write(errorsOnlyText);
      setErrorsCopied(true);
      window.setTimeout(() => setErrorsCopied(false), 1500);
    } catch {
      setErrorsCopied(false);
    }
  };

  return (
    <section className="min-w-0 space-y-3 overflow-hidden rounded-2xl border border-outline-variant bg-surface p-3 sm:p-4" aria-live="polite">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-bold text-on-surface">متابعة تنفيذ E2E</h2>
        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => void handleCopyErrors()}
            disabled={!hasErrors}
            className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {errorsCopied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {errorsCopied ? "تم نسخ الأخطاء" : "نسخ الأخطاء فقط"}
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!hasContent}
            className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
        </div>
      </div>

      <div
        tabIndex={0}
        aria-label="سجل تنفيذ E2E"
        className="min-h-0 min-w-0 max-h-[55vh] overflow-y-auto overscroll-contain rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary sm:max-h-[60vh]"
      >
      {runs.length > 0 ? (
        <div className="min-w-0 space-y-4">
          {pageGroups.map((group) => (
            <section key={group.pageId} className="min-w-0 space-y-2 overflow-hidden rounded-xl border border-outline-variant p-3">
              <h3 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-bold text-on-surface">
                <span className="break-words">الصفحة: {group.pageLabel}</span>
                {group.pageRoute ? (
                  <code className="max-w-full break-all rounded-md bg-surface-container-low px-2 py-1 text-[11px] font-semibold text-primary" dir="ltr">
                    {group.pageRoute}
                  </code>
                ) : null}
              </h3>
              <div className="min-w-0 space-y-3">
                {group.runs.map((run) => (
                  <article key={run.id} className="min-w-0 space-y-2 overflow-hidden rounded-xl bg-surface-container-low p-3">
                    <div className="flex min-w-0 flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                      <div className="min-w-0 break-words text-sm font-semibold text-on-surface">{run.interactionLabel}</div>
                      <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-on-surface-variant">
                        {statusIcon(run.status)}
                        <span>{statusLabel(run.status)}</span>
                      </div>
                    </div>
                    {run.steps.length > 0 ? <StepList steps={run.steps} /> : null}
                    {run.error ? (
                      <div className="asol-selectable break-words rounded-lg bg-error/10 p-3 text-xs text-error">
                        <span className="font-bold">رسالة الخطأ: </span>{run.error}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : steps.length === 0 && !error && outcome === undefined && !running ? (
        <p className="text-sm text-on-surface-variant">اختر حدثًا لبدء التنفيذ.</p>
      ) : (
        <div className="min-w-0 space-y-3">
          {pageLabel ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-on-surface">
              <span className="break-words">الصفحة: {pageLabel}</span>
              {pageRoute ? <code className="max-w-full break-all text-xs text-primary" dir="ltr">{pageRoute}</code> : null}
            </div>
          ) : null}
          <div className="text-sm font-semibold text-on-surface">
            الحالة: {singleStatusLabel(outcome, running)}
          </div>
          {steps.length > 0 ? <StepList steps={steps} /> : null}
          {error ? (
            <div className="asol-selectable break-words rounded-xl bg-error/10 p-3 text-sm text-error">
              <span className="font-bold">رسالة الخطأ: </span>{error}
            </div>
          ) : null}
        </div>
      )}
      </div>
    </section>
  );
}
