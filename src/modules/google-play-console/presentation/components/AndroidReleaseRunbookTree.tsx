"use client";

import { CheckSquare, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AndroidReleaseRunbookPhase } from "@asol/release-core/console";
import {
  branchIdsFromAndroidRunbook,
  dangerousAndroidBranchIds,
} from "@asol/release-core/console";
import { DeployRunbookCollapsible } from "../DeployRunbookCollapsible";
import { PhaseBlock } from "./AndroidReleaseRunbookPhaseBlocks";
import type { AndroidRunbookTreeContext } from "./AndroidReleaseRunbookTreeShared";

const SELECT_BTN =
  "h-auto w-full min-w-0 justify-start whitespace-normal py-2 text-left";

export function AndroidReleaseRunbookTree(
  props: AndroidRunbookTreeContext & {
    runbook: readonly AndroidReleaseRunbookPhase[];
    setSelected: (next: Set<string>) => void;
  },
) {
  const allIds = branchIdsFromAndroidRunbook(props.runbook);
  const dangerousIds = dangerousAndroidBranchIds(props.runbook);
  const safeIds = allIds.filter((id) => !dangerousIds.includes(id));
  const selectedInRunbook = allIds.filter((id) => props.selected.has(id)).length;

  const toggleBranch = (id: string) => {
    const next = new Set(props.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    props.setSelected(next);
  };

  const toggleMany = (ids: readonly string[], enable: boolean) => {
    const next = new Set(props.selected);
    for (const id of ids) {
      if (enable) next.add(id);
      else next.delete(id);
    }
    props.setSelected(next);
  };

  const context: AndroidRunbookTreeContext = {
    selected: props.selected,
    onToggleBranch: toggleBranch,
    onToggleMany: toggleMany,
    t: props.t,
    busy: props.busy,
    cancel: props.cancel,
    jobs: props.jobs,
    missingEnvOf: props.missingEnvOf,
    start: props.start,
  };

  return (
    <div className="min-w-0 space-y-3">
      <DeployRunbookCollapsible
        title={props.t("releaseConsole.androidPaths.bulkSelectTitle")}
        description={props.t("releaseConsole.androidPaths.bulkSelectHelp")}
        badge={
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
            {selectedInRunbook} / {allIds.length}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set(allIds))}
          >
            <CheckSquare className="h-4 w-4 shrink-0" />
            {props.t("releaseConsole.androidPaths.selectAll")}
          </Button>
          <Button
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set())}
          >
            <Square className="h-4 w-4 shrink-0" />
            {props.t("releaseConsole.androidPaths.selectNone")}
          </Button>
          <Button
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set(safeIds))}
          >
            {props.t("releaseConsole.androidPaths.selectSafe")}
          </Button>
          <Button
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set(dangerousIds))}
          >
            {props.t("releaseConsole.androidPaths.selectDangerous")}
          </Button>
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible
        title={props.t("releaseConsole.androidPaths.treeTitle")}
        description={props.t("releaseConsole.androidPaths.treeHelp")}
        badge={
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
            {props.runbook.length} {props.t("releaseConsole.androidPaths.phaseCountLabel")}
          </span>
        }
      >
        <div className="space-y-3">
          {props.runbook.map((phase) => (
            <PhaseBlock key={phase.id} phase={phase} {...context} />
          ))}
        </div>
      </DeployRunbookCollapsible>
    </div>
  );
}
