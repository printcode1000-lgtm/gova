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
import { uiAttributes } from "@asol/ui-registry-core";

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

  if (isLoading) return <div {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.7-3bAjxr", id: "simulation.super-admin-page-simulation.div.7" })} id="simulation.super-admin-page-simulation.div" className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>;
  if (!isSuperAdmin(session)) return <div {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.8-ETTbK7", id: "simulation.super-admin-page-simulation.div.8" })} id="simulation.super-admin-page-simulation.div.2" className="p-6 text-error">هذه الصفحة متاحة للسوبر أدمن فقط.</div>;

  return (
    <main {...uiAttributes({ uid: "simulation.super-admin-page-simulation.main.2-f0G3Wz", id: "simulation.super-admin-page-simulation.main.2" })} id="simulation.super-admin-page-simulation.main" className="mx-auto grid w-full min-w-0 max-w-7xl gap-5 p-3 pb-24 sm:p-4 sm:pb-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.9-KdrVf8", id: "simulation.super-admin-page-simulation.div.9" })} id="simulation.super-admin-page-simulation.div.3" className="min-w-0 space-y-4">
        <Link id="simulation.super-admin-page-simulation.link" href="/super-admin/simulation" className="inline-flex items-center gap-2 text-sm text-primary no-underline active:opacity-70">
          <ArrowRight id="simulation.super-admin-page-simulation.arrow-right" className="h-4 w-4" aria-hidden />
          العودة إلى الصفحات
        </Link>
        <header {...uiAttributes({ uid: "simulation.super-admin-page-simulation.header.2-1WL2RP", id: "simulation.super-admin-page-simulation.header.2" })} id="simulation.super-admin-page-simulation.header" className="min-w-0">
          <h1 {...uiAttributes({ uid: "simulation.super-admin-page-simulation.h1.2-w47Rgq", id: "simulation.super-admin-page-simulation.h1.2" })} id="simulation.super-admin-page-simulation.h1" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xl font-bold text-on-surface sm:text-2xl">
            <span {...uiAttributes({ uid: "simulation.super-admin-page-simulation.span.2-E7NePC", id: "simulation.super-admin-page-simulation.span.2" })} id="simulation.super-admin-page-simulation.span" className="break-words">محاكاة: {page.label}</span>
            <code {...uiAttributes({ uid: "simulation.super-admin-page-simulation.code-Pj0gRZ", id: "simulation.super-admin-page-simulation.code" })} className="max-w-full break-all rounded-md bg-surface-container-low px-2 py-1 text-xs font-semibold text-primary" dir="ltr">
              {page.route}
            </code>
          </h1>
          <p {...uiAttributes({ uid: "simulation.super-admin-page-simulation.p.2-tqP4O4", id: "simulation.super-admin-page-simulation.p.2" })} id="simulation.super-admin-page-simulation.p" className="mt-1 break-words text-sm text-on-surface-variant">{page.description}</p>
          <div {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.10-GJ9tH3", id: "simulation.super-admin-page-simulation.div.10" })} id="simulation.super-admin-page-simulation.div.4" className="mt-2 break-words text-xs text-primary">{simulationRuntimeLabel(runtime)}</div>
        </header>
        <section {...uiAttributes({ uid: "simulation.super-admin-page-simulation.section.2-k1MLf5", id: "simulation.super-admin-page-simulation.section.2" })} id="simulation.super-admin-page-simulation.section" className="min-w-0 space-y-3 rounded-2xl border border-outline-variant bg-surface p-3 sm:p-4">
          <h2 {...uiAttributes({ uid: "simulation.super-admin-page-simulation.h2.2-US4HCY", id: "simulation.super-admin-page-simulation.h2.2" })} id="simulation.super-admin-page-simulation.h2" className="font-bold text-on-surface">أحداث المستخدم الحقيقية</h2>
          <div {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.11-kR0PRl", id: "simulation.super-admin-page-simulation.div.11" })} id="simulation.super-admin-page-simulation.div.5" className="space-y-2">
            {page.interactions.map((interaction) => (
              <div key={interaction.id} {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.12-9JAl9j", id: "simulation.super-admin-page-simulation.div.12" })} className="flex min-w-0 flex-col gap-3 rounded-xl bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
                <div {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.13-4UIBPH", id: "simulation.super-admin-page-simulation.div.13" })} className="min-w-0 flex-1 break-words">
                  <div {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.14-Fgm1XU", id: "simulation.super-admin-page-simulation.div.14" })} className="font-semibold text-on-surface">{interaction.label}</div>
                  <div {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.15-Jt4Smd", id: "simulation.super-admin-page-simulation.div.15" })} className="text-xs text-on-surface-variant">{interaction.description}</div>
                </div>
                <Button ui={{ uid: "simulation.super-admin-page-simulation.button-69rM1t", id: "simulation.super-admin-page-simulation.button" }}
                  type="button"
                  onClick={() => void run(interaction.id)}
                  disabled={Boolean(runningId)}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {runningId === interaction.id ? <span {...uiAttributes({ uid: "simulation.super-admin-page-simulation.span.3-98gPNX", id: "simulation.super-admin-page-simulation.span.3" })} className="animate-pulse">جارٍ التنفيذ</span> : <><Play className="h-4 w-4" /> تشغيل</>}
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div {...uiAttributes({ uid: "simulation.super-admin-page-simulation.div.16-349VPl", id: "simulation.super-admin-page-simulation.div.16" })} id="simulation.super-admin-page-simulation.div.6" className="min-w-0">
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
