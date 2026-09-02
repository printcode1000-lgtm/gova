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
import {
  DEPLOY_PUSH_DESCRIPTION,
  PUSH_BRANCH_HELP,
  STATUS_SUMMARY_DESCRIPTION,
  deployPushTargets,
} from "./deploy-runbook-copy";
import { deployAllPreview, deployPushPreview } from "./deploy-runbook-preview";
import {
  DeployAllPanel,
  Header,
  StatusBadge,
  Summary,
  TabButtons,
} from "./DeployRunbookPageSections";

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
    return (
      <main
        id='features-google-play-console-presentation-deployrunbookpage-main-1-waa4bw'
        className="p-4 text-sm text-on-surface-variant"
      >
        جار التحميل...
      </main>
    );
  }
  if (!allowed) {
    return (
      <main id='features-google-play-console-presentation-deployrunbookpage-main-2-ech6zn' className="mx-auto max-w-2xl p-4 sm:p-6">
        <div
          id='features-google-play-console-presentation-deployrunbookpage-div-3-69zscw'
          className="rounded-md bg-error-container p-4 text-on-error-container"
        >
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
    <main id='features-google-play-console-presentation-deployrunbookpage-main-4-3terue'
      className="mx-auto w-full min-w-0 max-w-7xl space-y-3 p-3 pb-24 sm:space-y-4 sm:p-4"
      dir="rtl"
    >
      <Header id='features-google-play-console-presentation-deployrunbookpage-header-5-z5udbl' />
      <TabButtons id='features-google-play-console-presentation-deployrunbookpage-tabbuttons-6-qy5nk1' tab={tab} setTab={setTab} />

      <DeployRunbookCollapsible
        id='features-google-play-console-presentation-deployrunbookpage-deployrunbookcollapsible-7-ayhjqe'
        title="ملخص الحالة"
        description={STATUS_SUMMARY_DESCRIPTION}
        badge={
          <StatusBadge
            id='features-google-play-console-presentation-deployrunbookpage-statusbadge-8-enfr2b'
            status={activeJob?.status ?? "جاهز"}
          />
        }
      >
        <Summary id='features-google-play-console-presentation-deployrunbookpage-summary-9-ax8wwy'
          selectedCount={selectedCount}
          totalCount={totalCount}
          status={activeJob?.status ?? "جاهز"}
          continueOnError={continueOnError && tab === "deploy-all"}
        />
      </DeployRunbookCollapsible>

      {tab === "deploy-all" ? (
        <DeployAllPanel id='features-google-play-console-presentation-deployrunbookpage-deployallpanel-10-9uf88a'
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
        <RunbookPanel id='features-google-play-console-presentation-deployrunbookpage-runbookpanel-11-gllkem'
          title="Deploy Push"
          description={DEPLOY_PUSH_DESCRIPTION}
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
