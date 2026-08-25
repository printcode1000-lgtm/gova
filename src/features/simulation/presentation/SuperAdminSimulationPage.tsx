"use client";

import {
  SIMULATION_SCENARIOS,
  USER_PAGE_REGISTRY,
  resolveSimulationRuntime,
  runPageInteraction,
  simulationUserByRole,
  type SimulationProgressStep,
  type SimulationRunResult,
} from "@asol/simulation-core";
import { FlaskConical, Layers3, MonitorSmartphone, Play } from "lucide-react";
import * as React from "react";

import { getClientRuntimeContext } from "@/core/config/runtime-context.client";
import { isSuperAdmin } from "@/features/auth";
import { useSession } from "@/features/auth/ui";
import { Button } from "@/shared/ui/button";
import { beginSimulationActorSession } from "../application/services/simulation-actor-session";
import { IframeSimulationExecutionPort } from "../infrastructure/iframe-simulation-execution.port";
import { internalCatalogImagePool } from "../infrastructure/internal-catalog-image-pool";
import { SimulationProgressPanel } from "./SimulationProgressPanel";
import { SimulationUsersStatus } from "./SimulationUsersStatus";
import { simulationRuntimeLabel } from "./simulation-runtime-label";

const initialPage = USER_PAGE_REGISTRY[0];

export function SuperAdminSimulationPage() {
  const { session, isLoading } = useSession();
  const runtime = resolveSimulationRuntime(getClientRuntimeContext());
  const [selectedPageId, setSelectedPageId] = React.useState(initialPage?.id ?? "");
  const [selectedInteractionId, setSelectedInteractionId] = React.useState(
    initialPage?.interactions[0]?.id ?? "",
  );
  const [steps, setSteps] = React.useState<readonly SimulationProgressStep[]>([]);
  const [result, setResult] = React.useState<SimulationRunResult | null>(null);
  const [runningId, setRunningId] = React.useState("");

  const selectedPage = React.useMemo(
    () => USER_PAGE_REGISTRY.find((page) => page.id === selectedPageId) ?? initialPage,
    [selectedPageId],
  );
  const selectedInteractions = selectedPage?.interactions ?? [];
  const selectedInteraction =
    selectedInteractions.find((interaction) => interaction.id === selectedInteractionId) ??
    selectedInteractions[0];

  const selectPage = (pageId: string) => {
    const page = USER_PAGE_REGISTRY.find((candidate) => candidate.id === pageId);
    setSelectedPageId(page?.id ?? "");
    setSelectedInteractionId(page?.interactions[0]?.id ?? "");
  };

  const runSelectedInteraction = async () => {
    if (!selectedPage || !selectedInteraction) return;

    setRunningId(selectedInteraction.id);
    setResult(null);
    setSteps([]);

    const user =
      selectedInteraction.actor === "buyer" ||
      selectedInteraction.actor === "seller" ||
      selectedInteraction.actor === "delivery"
        ? simulationUserByRole(selectedInteraction.actor)
        : undefined;
    let restoreSession: (() => Promise<void>) | undefined;

    try {
      const actor = user ?? (selectedInteraction.actor === "guest" ? "guest" : "any");
      restoreSession = await beginSimulationActorSession(actor);
      const next = await runPageInteraction({
        runtime,
        page: selectedPage,
        interaction: selectedInteraction,
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
        pageId: selectedPage.id,
        interactionId: selectedInteraction.id,
        steps: [],
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await restoreSession?.();
      setRunningId("");
    }
  };

  if (isLoading) return <div className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>;
  if (!isSuperAdmin(session)) {
    return <div className="mx-auto max-w-2xl p-6 text-error">هذه الصفحة متاحة للسوبر أدمن فقط.</div>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-on-surface">
            <FlaskConical className="h-6 w-6" aria-hidden />
            محاكاة المستخدم وE2E
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            اختر الصفحة والحدث وشغّل التفاعل الحقيقي مع متابعة التنفيذ من نفس الشاشة.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-primary-container px-3 py-2 text-sm text-on-primary-container">
          <MonitorSmartphone className="h-4 w-4" aria-hidden />
          {simulationRuntimeLabel(runtime)}
        </div>
      </header>

      <SimulationUsersStatus />

      <section className="rounded-2xl border border-outline-variant bg-surface p-4">
        <div className="mb-4">
          <h2 className="font-bold text-on-surface">تشغيل محاكاة الصفحة</h2>
          <p className="text-xs text-on-surface-variant">
            {USER_PAGE_REGISTRY.length} صفحة مستخدم مغطاة. اختر الصفحة ثم حدث المستخدم الحقيقي المطلوب.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] xl:items-start">
          <div className="grid grid-cols-2 items-start gap-4">
            <label className="min-w-0 space-y-2">
              <span className="block text-sm font-semibold text-on-surface">الصفحة</span>
              <select
                value={selectedPage?.id ?? ""}
                onChange={(event) => selectPage(event.target.value)}
                disabled={Boolean(runningId)}
                className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {USER_PAGE_REGISTRY.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.label} — {page.route}
                  </option>
                ))}
              </select>
              {selectedPage ? (
                <span className="block text-xs text-on-surface-variant">{selectedPage.description}</span>
              ) : null}
            </label>

            <div className="min-w-0 space-y-3">
              <label className="block space-y-2">
                <span className="block text-sm font-semibold text-on-surface">أحداث المستخدم الحقيقية</span>
                <select
                  key={selectedPage?.id ?? "no-page"}
                  value={selectedInteraction?.id ?? ""}
                  onChange={(event) => setSelectedInteractionId(event.target.value)}
                  disabled={Boolean(runningId) || !selectedPage}
                  className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedInteractions.map((interaction) => (
                    <option key={interaction.id} value={interaction.id}>
                      {interaction.label}
                    </option>
                  ))}
                </select>
                {selectedInteraction ? (
                  <span className="block text-xs text-on-surface-variant">{selectedInteraction.description}</span>
                ) : null}
              </label>

              <Button
                type="button"
                onClick={() => void runSelectedInteraction()}
                disabled={Boolean(runningId) || !selectedPage || !selectedInteraction}
                className="w-full"
              >
                {runningId ? (
                  <span className="animate-pulse">جارٍ التنفيذ</span>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    تشغيل
                  </>
                )}
              </Button>
            </div>
          </div>

          <SimulationProgressPanel steps={steps} error={result?.error} />
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-outline-variant bg-surface p-5 text-center">
        <Layers3 className="mx-auto h-7 w-7 text-on-surface-variant" aria-hidden />
        <h2 className="mt-2 font-bold text-on-surface">حاوية السيناريوهات</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {SIMULATION_SCENARIOS.length === 0 ? "فارغة في الإصدار الأول كما هو مخطط." : `${SIMULATION_SCENARIOS.length} سيناريو`}
        </p>
      </section>
    </main>
  );
}
