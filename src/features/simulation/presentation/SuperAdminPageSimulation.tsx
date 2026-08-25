"use client";

import {
  runPageInteraction,
  resolveSimulationRuntime,
  simulationUserByRole,
  type SimulationProgressStep,
  type SimulationRunResult,
  type UserPageDefinition,
} from "@asol/simulation-core";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { getClientRuntimeContext } from "@/core/config/runtime-context.client";
import { isSuperAdmin } from "@/features/auth";
import { useSession } from "@/features/auth/ui";
import { Button } from "@/shared/ui/button";
import { beginSimulationActorSession } from "../application/services/simulation-actor-session";
import { IframeSimulationExecutionPort } from "../infrastructure/iframe-simulation-execution.port";
import { internalCatalogImagePool } from "../infrastructure/internal-catalog-image-pool";
import { SimulationProgressPanel } from "./SimulationProgressPanel";
import { simulationRuntimeLabel } from "./simulation-runtime-label";

export function SuperAdminPageSimulation({ page }: { page: UserPageDefinition }) {
  const { session, isLoading } = useSession();
  const [steps, setSteps] = React.useState<readonly SimulationProgressStep[]>([]);
  const [result, setResult] = React.useState<SimulationRunResult | null>(null);
  const [runningId, setRunningId] = React.useState("");
  const runtime = resolveSimulationRuntime(getClientRuntimeContext());

  const run = async (interactionId: string) => {
    const interaction = page.interactions.find((candidate) => candidate.id === interactionId);
    if (!interaction) return;
    setRunningId(interaction.id);
    setResult(null);
    setSteps([]);
    const user = interaction.actor === "buyer" || interaction.actor === "seller" || interaction.actor === "delivery"
      ? simulationUserByRole(interaction.actor)
      : undefined;
    let restoreSession: (() => Promise<void>) | undefined;
    try {
      const actor = user ?? (interaction.actor === "guest" ? "guest" : "any");
      restoreSession = await beginSimulationActorSession(actor);
      const next = await runPageInteraction({
        runtime,
        page,
        interaction,
        user,
        internalCatalogImages: internalCatalogImagePool(),
        port: new IframeSimulationExecutionPort(),
        onProgress: setSteps,
      });
      setResult(next);
      setSteps(next.steps);
    } catch (error) {
      setResult({
        succeeded: false,
        runtime,
        pageId: page.id,
        interactionId: interaction.id,
        steps: [],
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await restoreSession?.();
      setRunningId("");
    }
  };

  if (isLoading) return <div className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>;
  if (!isSuperAdmin(session)) return <div className="p-6 text-error">هذه الصفحة متاحة للسوبر أدمن فقط.</div>;

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 p-4 pb-24 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <Link href="/super-admin/simulation" className="inline-flex items-center gap-2 text-sm text-primary no-underline active:opacity-70">
          <ArrowRight className="h-4 w-4" aria-hidden />
          العودة إلى الصفحات
        </Link>
        <header>
          <h1 className="text-2xl font-bold text-on-surface">محاكاة: {page.label}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{page.description}</p>
          <div className="mt-2 text-xs text-primary" dir="ltr">{page.route} · {simulationRuntimeLabel(runtime)}</div>
        </header>
        <section className="space-y-3 rounded-2xl border border-outline-variant bg-surface p-4">
          <h2 className="font-bold text-on-surface">أحداث المستخدم الحقيقية</h2>
          <div className="space-y-2">
            {page.interactions.map((interaction) => (
              <div key={interaction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-on-surface">{interaction.label}</div>
                  <div className="text-xs text-on-surface-variant">{interaction.description}</div>
                </div>
                <Button type="button" onClick={() => void run(interaction.id)} disabled={Boolean(runningId)}>
                  {runningId === interaction.id ? <span className="animate-pulse">جارٍ التنفيذ</span> : <><Play className="h-4 w-4" /> تشغيل</>}
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <SimulationProgressPanel steps={steps} error={result?.error} />
    </main>
  );
}
