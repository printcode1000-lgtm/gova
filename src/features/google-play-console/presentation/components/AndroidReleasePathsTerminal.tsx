"use client";

import * as React from "react";

import { NativeCore } from "@asol/native-core";
import type { BuildJobRecord } from "@asol/release-core/console";
import { DeployRunbookCollapsible } from "../DeployRunbookCollapsible";
import { parseAndroidReleaseLogSnapshot } from "../android-release-log-snapshot";
import { TerminalActions, TerminalOutput } from "../DeployRunbookTerminal";

function IndicatorCard(props: {
  label: string;
  value: string;
  help: string;
  className?: string;
}) {
  return (
    <div className={props.className ?? ""}>
      <div className="min-w-0 rounded-md border bg-surface p-3">
        <div className="text-xs text-on-surface-variant">{props.label}</div>
        <div className="mt-1 text-sm font-semibold break-words sm:text-base" dir="ltr">
          {props.value || "—"}
        </div>
        <p className="mt-1 text-[11px] text-on-surface-variant break-words">{props.help}</p>
      </div>
    </div>
  );
}

export function AndroidReleasePathsTerminal(props: {
  log: string;
  clearLog: () => void;
  activeJob: BuildJobRecord | undefined;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const snapshot = React.useMemo(
    () => parseAndroidReleaseLogSnapshot(props.log, props.activeJob, props.t),
    [props.activeJob, props.log, props.t],
  );

  return (
    <section className="mt-3 grid min-w-0 grid-cols-1 gap-3">
      <DeployRunbookCollapsible
        title={props.t("releaseConsole.androidPaths.executionIndicatorsTitle")}
        description={props.t("releaseConsole.androidPaths.executionIndicatorsHelp")}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <IndicatorCard
            label={props.t("releaseConsole.androidPaths.indicatorStatus")}
            value={snapshot.status}
            help={props.t("releaseConsole.androidPaths.indicatorStatusHelp")}
          />
          <IndicatorCard
            label={props.t("releaseConsole.androidPaths.indicatorCommand")}
            value={snapshot.command}
            help={props.t("releaseConsole.androidPaths.indicatorCommandHelp")}
          />
          <IndicatorCard
            label={props.t("releaseConsole.androidPaths.indicatorPhase")}
            value={snapshot.phase}
            help={props.t("releaseConsole.androidPaths.indicatorPhaseHelp")}
          />
          <IndicatorCard
            label={props.t("releaseConsole.androidPaths.indicatorSection")}
            value={snapshot.section}
            help={props.t("releaseConsole.androidPaths.indicatorSectionHelp")}
          />
          <IndicatorCard
            label={props.t("releaseConsole.androidPaths.indicatorBranch")}
            value={snapshot.branch}
            help={props.t("releaseConsole.androidPaths.indicatorBranchHelp")}
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible
        title={props.t("releaseConsole.androidPaths.terminalTitle")}
        description={props.t("releaseConsole.androidPaths.terminalHelp")}
        actions={
          <TerminalActions
            onCopy={() => void NativeCore.writeClipboard({ string: props.log })}
            onClear={props.clearLog}
          />
        }
      >
        <TerminalOutput text={props.log} />
      </DeployRunbookCollapsible>
    </section>
  );
}
