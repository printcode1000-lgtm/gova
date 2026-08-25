import type { SimulationProgressStep } from "@asol/simulation-core";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

export function SimulationProgressPanel({ steps, error }: { steps: readonly SimulationProgressStep[]; error?: string }) {
  return (
    <section className="space-y-3 rounded-2xl border border-outline-variant bg-surface p-4">
      <h2 className="font-bold text-on-surface">متابعة تنفيذ E2E</h2>
      {steps.length === 0 ? (
        <p className="text-sm text-on-surface-variant">اختر حدثًا لبدء التنفيذ.</p>
      ) : (
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
      )}
      {error ? <div className="asol-selectable break-words rounded-xl bg-error/10 p-3 text-sm text-error">{error}</div> : null}
    </section>
  );
}
