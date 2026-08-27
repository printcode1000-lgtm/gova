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
        outcome: "failed",
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

  if (isLoading) return <div id="simulation.super-admin-page-simulation.div" className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>;
  if (!isSuperAdmin(session)) return <div id="simulation.super-admin-page-simulation.div.2" className="p-6 text-error">هذه الصفحة متاحة للسوبر أدمن فقط.</div>;

  return (
    <main id="simulation.super-admin-page-simulation.main" className="mx-auto grid w-full min-w-0 max-w-7xl gap-5 p-3 pb-24 sm:p-4 sm:pb-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div id="simulation.super-admin-page-simulation.div.3" className="min-w-0 space-y-4">
        <Link id="simulation.super-admin-page-simulation.link" href="/super-admin/simulation" className="inline-flex items-center gap-2 text-sm text-primary no-underline active:opacity-70">
          <ArrowRight id="simulation.super-admin-page-simulation.arrow-right" className="h-4 w-4" aria-hidden />
          العودة إلى الصفحات
        </Link>
        <header id="simulation.super-admin-page-simulation.header" className="min-w-0">
          <h1 id="simulation.super-admin-page-simulation.h1" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xl font-bold text-on-surface sm:text-2xl">
            <span id="simulation.super-admin-page-simulation.span" className="break-words">محاكاة: {page.label}</span>
            <code className="max-w-full break-all rounded-md bg-surface-container-low px-2 py-1 text-xs font-semibold text-primary" dir="ltr">
              {page.route}
            </code>
          </h1>
          <p id="simulation.super-admin-page-simulation.p" className="mt-1 break-words text-sm text-on-surface-variant">{page.description}</p>
          <div id="simulation.super-admin-page-simulation.div.4" className="mt-2 break-words text-xs text-primary">{simulationRuntimeLabel(runtime)}</div>
        </header>
        <section id="simulation.super-admin-page-simulation.section" className="min-w-0 space-y-3 rounded-2xl border border-outline-variant bg-surface p-3 sm:p-4">
          <h2 id="simulation.super-admin-page-simulation.h2" className="font-bold text-on-surface">أحداث المستخدم الحقيقية</h2>
          <div id="simulation.super-admin-page-simulation.div.5" className="space-y-2">
            {page.interactions.map((interaction) => (
              <div key={interaction.id} className="flex min-w-0 flex-col gap-3 rounded-xl bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 break-words">
                  <div className="font-semibold text-on-surface">{interaction.label}</div>
                  <div className="text-xs text-on-surface-variant">{interaction.description}</div>
                </div>
                <Button
                  type="button"
                  onClick={() => void run(interaction.id)}
                  disabled={Boolean(runningId)}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {runningId === interaction.id ? <span className="animate-pulse">جارٍ التنفيذ</span> : <><Play className="h-4 w-4" /> تشغيل</>}
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div id="simulation.super-admin-page-simulation.div.6" className="min-w-0">
        <SimulationProgressPanel id="simulation.super-admin-page-simulation.simulation-progress-panel"
          steps={steps}
          error={result?.error}
          pageLabel={page.label}
          pageRoute={page.route}
        />
      </div>
    </main>
  );
}
