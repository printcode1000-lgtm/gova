"use client";

import * as React from "react";

import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { useBuildJobs } from "@/features/release-commands/ui";
import {
  DEPLOY_PUSH_RUNBOOK,
  deployAllBranchIds,
  deployPushBranchIds,
} from "@asol/release-core/console";
import { useAuthHeaders } from "./hooks/use-auth-headers";
import { RunbookPanel } from "./DeployRunbookControls";
import { DeployRunbookCollapsible } from "./DeployRunbookCollapsible";
import { DeployRunbookMainGrid } from "./DeployRunbookMainGrid";
import type { DeployTab } from "./DeployRunbookTypes";
import { PUSH_BRANCH_HELP, deployPushTargets } from "./deploy-runbook-copy";
import { deployAllPreview, deployPushPreview } from "./deploy-runbook-preview";
import {
  DeployAllPanel,
  Header,
  StatusBadge,
  Summary,
  TabButtons,
} from "./DeployRunbookPageSections";
import { createUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

export function DeployRunbookPage() {
  const { session, isLoading } = useSession();
  const allowed = !isLoading && isSuperAdmin(session);
  const jobs = useBuildJobs(useAuthHeaders());
  const [tab, setTab] = React.useState<DeployTab>("deploy-all");
  const [allSelected, setAllSelected] = React.useState(() => new Set(deployAllBranchIds()));
  const [pushSelected, setPushSelected] = React.useState(() => new Set(deployPushBranchIds()));
  const [allScenario, setAllScenario] = React.useState("full");
  const [pushTarget, setPushTarget] = React.useState("all");
  const [continueOnError, setContinueOnError] = React.useState(false);
  const [skipPreflight, setSkipPreflight] = React.useState(false);
  const [allowEmpty, setAllowEmpty] = React.useState(false);
  const [allowManifestDowngrade, setAllowManifestDowngrade] = React.useState(false);
  const [allowScratchFiles, setAllowScratchFiles] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");

  if (isLoading) {
    return <main {...uiAttributes({ uid: "google-play-console.deploy-runbook-page.main.4-fMil1o", id: "google-play-console.deploy-runbook-page.main.4" })} id="google-play-console.deploy-runbook-page.main" className="p-4 text-sm text-on-surface-variant">جار التحميل...</main>;
  }
  if (!allowed) {
    return (
      <main {...uiAttributes({ uid: "google-play-console.deploy-runbook-page.main.5-Q6X2Mg", id: "google-play-console.deploy-runbook-page.main.5" })} id="google-play-console.deploy-runbook-page.main.2" className="mx-auto max-w-2xl p-4 sm:p-6">
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-page.div.2-quiON0", id: "google-play-console.deploy-runbook-page.div.2" })} id="google-play-console.deploy-runbook-page.div" className="rounded-md bg-error-container p-4 text-on-error-container">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </main>
    );
  }

  const activeJob = jobs.jobs.find((job) => job.status === "queued" || job.status === "running");
  const locked = jobs.busy || Boolean(activeJob);
  const exactPhrase = tab === "deploy-all" ? "DEPLOY_ALL" : "DEPLOY_PUSH";
  const selectedCount = tab === "deploy-all" ? allSelected.size : pushSelected.size;
  const totalCount =
    tab === "deploy-all" ? deployAllBranchIds().length : deployPushBranchIds().length;
  const commandPreview =
    tab === "deploy-all"
      ? deployAllPreview(allScenario, allSelected, {
          continueOnError,
          skipPreflight,
          allowEmpty,
          allowManifestDowngrade,
          allowScratchFiles,
        })
      : deployPushPreview(pushTarget, {
          allowEmpty,
          allowManifestDowngrade,
          allowScratchFiles,
        });

  const start = () =>
    void jobs.start(
      tab === "deploy-all"
        ? {
            commandId: "deploy-all-runbook",
            confirmationPhrase: exactPhrase,
            parameters: {
              deployAllScenario: allScenario,
              deployAllBranches: [...allSelected].join(","),
              deployAllContinueOnError: continueOnError,
              deployAllSkipPreflight: skipPreflight,
              deployAllAllowEmpty: allowEmpty,
              deployAllAllowManifestDowngrade: allowManifestDowngrade,
              deployAllAllowScratchFiles: allowScratchFiles,
            },
          }
        : {
            commandId: "deploy-push-runbook",
            confirmationPhrase: exactPhrase,
            parameters: {
              deployPushTarget: pushTarget,
              deployPushAllowEmpty: allowEmpty,
              deployPushAllowManifestDowngrade: allowManifestDowngrade,
              deployPushAllowScratchFiles: allowScratchFiles,
            },
          },
    );

  return (
    <main {...uiAttributes({ uid: "google-play-console.deploy-runbook-page.main.6-2nwM18", id: "google-play-console.deploy-runbook-page.main.6" })} id="google-play-console.deploy-runbook-page.main.3"
      className="mx-auto w-full min-w-0 max-w-7xl space-y-3 p-3 pb-24 sm:space-y-4 sm:p-4"
      dir="rtl"
    >
      <Header id="google-play-console.deploy-runbook-page.header" />
      <TabButtons id="google-play-console.deploy-runbook-page.tab-buttons" tab={tab} setTab={setTab} />

      <DeployRunbookCollapsible id="google-play-console.deploy-runbook-page.deploy-runbook-collapsible"
        instance={createUiInstanceId("status-summary")}
        title="ملخص الحالة"
        description="نظرة سريعة على الفروع المفعّلة وحالة التنفيذ وسلوك الخطأ."
        badge={<StatusBadge id="google-play-console.deploy-runbook-page.status-badge" status={activeJob?.status ?? "جاهز"} />}
      >
        <Summary id="google-play-console.deploy-runbook-page.summary"
          selectedCount={selectedCount}
          totalCount={totalCount}
          status={activeJob?.status ?? "جاهز"}
          continueOnError={continueOnError && tab === "deploy-all"}
        />
      </DeployRunbookCollapsible>

      {tab === "deploy-all" ? (
        <DeployAllPanel id="google-play-console.deploy-runbook-page.deploy-all-panel"
          selected={allSelected}
          setSelected={setAllSelected}
          scenario={allScenario}
          setScenario={setAllScenario}
          continueOnError={continueOnError}
          setContinueOnError={setContinueOnError}
          skipPreflight={skipPreflight}
          setSkipPreflight={setSkipPreflight}
        />
      ) : (
        <RunbookPanel id="google-play-console.deploy-runbook-page.runbook-panel"
          instance={createUiInstanceId("deploy-push")}
          title="Deploy Push"
          description="المسار السريع: أسرار، commit، push، ثم تحقق Vercel للأهداف المختارة دون فحوصات build/test."
          runbook={DEPLOY_PUSH_RUNBOOK}
          help={PUSH_BRANCH_HELP}
          selected={pushSelected}
          setSelected={setPushSelected}
          scenarioLabel="هدف Vercel"
          scenarioValue={pushTarget}
          onScenarioChange={setPushTarget}
          scenarios={deployPushTargets}
        />
      )}

      <DeployRunbookMainGrid
        tab={tab}
        log={jobs.log}
        clearLog={jobs.clearLog}
        activeJob={activeJob}
        activeStatus={activeJob?.status ?? "idle"}
        locked={locked}
        exactPhrase={exactPhrase}
        confirmation={confirmation}
        setConfirmation={setConfirmation}
        commandPreview={commandPreview}
        allowEmpty={allowEmpty}
        setAllowEmpty={setAllowEmpty}
        allowManifestDowngrade={allowManifestDowngrade}
        setAllowManifestDowngrade={setAllowManifestDowngrade}
        allowScratchFiles={allowScratchFiles}
        setAllowScratchFiles={setAllowScratchFiles}
        startError={jobs.startError}
        onStart={start}
        onCancel={() => activeJob && void jobs.cancel(activeJob)}
      />
    </main>
  );
}
