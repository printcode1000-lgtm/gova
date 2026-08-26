"use client";

import { CheckSquare, Square } from "lucide-react";

import { Button } from "@/shared/ui/button";
import type { AndroidReleaseRunbookPhase } from "@asol/release-core/console";
import type { BuildJobRecord } from "@asol/release-core/console";
import {
  branchIdsFromAndroidRunbook,
  dangerousAndroidBranchIds,
} from "@asol/release-core/console";
import { DeployRunbookCollapsible } from "../DeployRunbookCollapsible";
import { PhaseBlock } from "./AndroidReleaseRunbookPhaseBlocks";
import type { AndroidRunbookTreeContext } from "./AndroidReleaseRunbookTreeShared";
import type { AndroidRunbookStart } from "./AndroidReleaseRunbookTreeShared";

const SELECT_BTN =
  "h-auto w-full min-w-0 justify-start whitespace-normal py-2 text-left";

export function AndroidReleaseRunbookTree(props: {
  runbook: readonly AndroidReleaseRunbookPhase[];
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
  t: (key: string, params?: Record<string, string>) => string;
  busy: boolean;
  cancel: (job: BuildJobRecord) => Promise<unknown>;
  jobs: readonly BuildJobRecord[];
  missingEnvOf: (commandId: string) => readonly string[];
  start: AndroidRunbookStart;
}) {
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
          <Button ui={{ uid: "release-console.runbook-tree.select-all-e1KCtu", id: "release-console.runbook-tree.select-all", kind: "action", action: "select-all", part: "selection" }}
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set(allIds))}
          >
            <CheckSquare className="h-4 w-4 shrink-0" />
            {props.t("releaseConsole.androidPaths.selectAll")}
          </Button>
          <Button ui={{ uid: "release-console.runbook-tree.select-none-Sob3hC", id: "release-console.runbook-tree.select-none", kind: "action", action: "select-none", part: "selection" }}
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set())}
          >
            <Square className="h-4 w-4 shrink-0" />
            {props.t("releaseConsole.androidPaths.selectNone")}
          </Button>
          <Button ui={{ uid: "release-console.runbook-tree.select-safe-oEY9r2", id: "release-console.runbook-tree.select-safe", kind: "action", action: "select-safe", part: "selection" }}
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set(safeIds))}
          >
            {props.t("releaseConsole.androidPaths.selectSafe")}
          </Button>
          <Button ui={{ uid: "release-console.runbook-tree.select-dangerous-Lc8QnP", id: "release-console.runbook-tree.select-dangerous", kind: "action", action: "select-dangerous", part: "selection" }}
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
