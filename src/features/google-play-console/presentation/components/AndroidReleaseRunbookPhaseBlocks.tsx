"use client";

import type { AndroidReleaseRunbookPhase } from "@asol/release-core/console";
import { DeployRunbookCollapsible } from "../DeployRunbookCollapsible";
import { ANDROID_RELEASE_BRANCH_HELP } from "../android-release-runbook-copy";
import { latestJobFor } from "./ReleaseJobIndicators";
import { CommandBranchCard } from "./AndroidReleaseRunbookBranchCard";
import {
  CascadeCheckbox,
} from "./AndroidReleaseRunbookCascadeCheckbox";
import {
  selectionState,
  type AndroidRunbookTreeContext,
} from "./AndroidReleaseRunbookTreeShared";
import { uiAttributes } from "@asol/ui-registry-core";

export function PhaseBlock(props: AndroidRunbookTreeContext & { phase: AndroidReleaseRunbookPhase } & { id?: string }) {
  const branchIds = props.phase.sections.flatMap((section) =>
    section.branches.map((item) => item.id),
  );
  const phaseState = selectionState(branchIds, props.selected);

  return (
    <DeployRunbookCollapsible id={props.id}
      nested
      title={`${props.phase.id} — ${props.phase.label}`}
      description={props.t("releaseConsole.androidPaths.phaseCheckboxHelp")}
      badge={
        <span {...uiAttributes({ uid: "google-play-console.android-release-runbook-phase-blocks.span-9RCGED", id: "google-play-console.android-release-runbook-phase-blocks.span" })} className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
          {phaseState.active} / {branchIds.length}
        </span>
      }
    >
      <div {...uiAttributes({ uid: "google-play-console.android-release-runbook-phase-blocks.div-N1M8yb", id: "google-play-console.android-release-runbook-phase-blocks.div" })} className="mb-3">
        <CascadeCheckbox
          checked={phaseState.all}
          indeterminate={phaseState.some}
          onChange={() => props.onToggleMany(branchIds, !phaseState.all)}
          label={props.t("releaseConsole.androidPaths.phaseToggleLabel", { id: props.phase.id })}
          help={props.t("releaseConsole.androidPaths.phaseCheckboxHelp")}
        />
      </div>
      <div {...uiAttributes({ uid: "google-play-console.android-release-runbook-phase-blocks.div.2-99AiOl", id: "google-play-console.android-release-runbook-phase-blocks.div.2" })} className="space-y-3">
        {props.phase.sections.map((section) => (
          <SectionBlock key={section.id} section={section} {...props} />
        ))}
      </div>
    </DeployRunbookCollapsible>
  );
}

export function SectionBlock(
  props: AndroidRunbookTreeContext & {
    section: AndroidReleaseRunbookPhase["sections"][number];
  } & { id?: string },
) {
  const branchIds = props.section.branches.map((item) => item.id);
  const sectionState = selectionState(branchIds, props.selected);

  return (
    <DeployRunbookCollapsible id={props.id}
      nested
      title={`${props.section.id} — ${props.section.label}`}
      description={props.t("releaseConsole.androidPaths.sectionCheckboxHelp")}
      badge={
        <span {...uiAttributes({ uid: "google-play-console.android-release-runbook-phase-blocks.span.2-3i9mKG", id: "google-play-console.android-release-runbook-phase-blocks.span.2" })} className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
          {sectionState.active} / {branchIds.length}
        </span>
      }
    >
      <div {...uiAttributes({ uid: "google-play-console.android-release-runbook-phase-blocks.div.3-SY0QJN", id: "google-play-console.android-release-runbook-phase-blocks.div.3" })} className="mb-3">
        <CascadeCheckbox
          checked={sectionState.all}
          indeterminate={sectionState.some}
          onChange={() => props.onToggleMany(branchIds, !sectionState.all)}
          label={props.t("releaseConsole.androidPaths.sectionToggleLabel", {
            id: props.section.id,
          })}
          help={props.t("releaseConsole.androidPaths.sectionCheckboxHelp")}
        />
      </div>
      <div {...uiAttributes({ uid: "google-play-console.android-release-runbook-phase-blocks.div.4-lVI6Jj", id: "google-play-console.android-release-runbook-phase-blocks.div.4" })} className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
        {props.section.branches.map((item) => (
          <CommandBranchCard
            key={item.id}
            item={item}
            selected={props.selected.has(item.id)}
            help={ANDROID_RELEASE_BRANCH_HELP[item.id]}
            onToggle={() => props.onToggleBranch(item.id)}
            t={props.t}
            busy={props.busy}
            cancel={props.cancel}
            job={latestJobFor(props.jobs, item.commandId)}
            missingEnv={props.missingEnvOf(item.commandId)}
            start={props.start}
          />
        ))}
      </div>
    </DeployRunbookCollapsible>
  );
}
