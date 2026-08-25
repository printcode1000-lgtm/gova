"use client";

import type { SimulationProgressStep } from "@asol/simulation-core";
import { Check, CheckCircle2, Circle, Copy, Loader2, XCircle } from "lucide-react";
import * as React from "react";

export type SimulationProgressRunStatus = "pending" | "running" | "passed" | "failed";

export type SimulationProgressRun = {
  id: string;
  pageId: string;
  pageLabel: string;
  interactionId: string;
  interactionLabel: string;
  status: SimulationProgressRunStatus;
  steps: readonly SimulationProgressStep[];
  error?: string;
};

type SimulationProgressPanelProps = {
  steps: readonly SimulationProgressStep[];
  error?: string;
  succeeded?: boolean;
  running?: boolean;
  runs?: readonly SimulationProgressRun[];
};

function statusLabel(status: SimulationProgressRunStatus) {
  if (status === "passed") return "نجح";
  if (status === "failed") return "فشل";
  if (status === "running") return "جارٍ التنفيذ";
  return "بانتظار التنفيذ";
}

function statusIcon(status: SimulationProgressRunStatus) {
  if (status === "passed") return <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-error" aria-hidden />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-secondary" aria-hidden />;
  return <Circle className="h-4 w-4 text-on-surface-variant" aria-hidden />;
}

function singleStatusLabel(succeeded: boolean | undefined, running: boolean) {
  if (running) return "جارٍ التنفيذ";
  if (succeeded === true) return "نجح";
  if (succeeded === false) return "فشل";
  return "لم يبدأ";
}

function buildCopyText(
  steps: readonly SimulationProgressStep[],
  error: string | undefined,
  succeeded: boolean | undefined,
  running: boolean,
  runs: readonly SimulationProgressRun[],
) {
  const lines = ["متابعة تنفيذ E2E"];

  if (runs.length > 0) {
    let activePageId = "";
    for (const run of runs) {
      if (run.pageId !== activePageId) {
        activePageId = run.pageId;
        lines.push("", `الصفحة: ${run.pageLabel}`);
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

  lines.push(`الحالة: ${singleStatusLabel(succeeded, running)}`);
  for (const step of steps) {
    lines.push(`[${step.status}] ${step.label}${step.detail ? ` — ${step.detail}` : ""}`);
  }
  if (error) lines.push(`رسالة الخطأ: ${error}`);
  return lines.join("\n");
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function StepList({ steps }: { steps: readonly SimulationProgressStep[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-3 rounded-xl bg-surface-container-low p-3">
          {step.status === "passed" ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> :
            step.status === "failed" ? <XCircle className="mt-0.5 h-4 w-4 text-error" /> :
              step.status === "running" ? <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-secondary" /> :
                <Circle className="mt-0.5 h-4 w-4 text-on-surface-variant" />}
          <div className="min-w-0">
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
  succeeded,
  running = false,
  runs = [],
}: SimulationProgressPanelProps) {
  const [copied, setCopied] = React.useState(false);
  const hasContent = runs.length > 0 || steps.length > 0 || Boolean(error) || succeeded !== undefined || running;
  const pageGroups = React.useMemo(() => {
    const groups: Array<{ pageId: string; pageLabel: string; runs: SimulationProgressRun[] }> = [];
    for (const run of runs) {
      const current = groups.at(-1);
      if (!current || current.pageId !== run.pageId) {
        groups.push({ pageId: run.pageId, pageLabel: run.pageLabel, runs: [run] });
      } else {
        current.runs.push(run);
      }
    }
    return groups;
  }, [runs]);

  const handleCopy = async () => {
    if (!hasContent) return;
    try {
      await copyText(buildCopyText(steps, error, succeeded, running, runs));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-outline-variant bg-surface p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-on-surface">متابعة تنفيذ E2E</h2>
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={!hasContent}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>

      {runs.length > 0 ? (
        <div className="space-y-4">
          {pageGroups.map((group) => (
            <section key={group.pageId} className="space-y-2 rounded-xl border border-outline-variant p-3">
              <h3 className="font-bold text-on-surface">الصفحة: {group.pageLabel}</h3>
              <div className="space-y-3">
                {group.runs.map((run) => (
                  <article key={run.id} className="space-y-2 rounded-xl bg-surface-container-low p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-on-surface">{run.interactionLabel}</div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
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
      ) : steps.length === 0 && !error && succeeded === undefined && !running ? (
        <p className="text-sm text-on-surface-variant">اختر حدثًا لبدء التنفيذ.</p>
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-on-surface">
            الحالة: {singleStatusLabel(succeeded, running)}
          </div>
          {steps.length > 0 ? <StepList steps={steps} /> : null}
          {error ? (
            <div className="asol-selectable break-words rounded-xl bg-error/10 p-3 text-sm text-error">
              <span className="font-bold">رسالة الخطأ: </span>{error}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
