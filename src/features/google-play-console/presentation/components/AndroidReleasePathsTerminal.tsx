"use client";

import * as React from "react";

import { NativeCore } from "@asol/native-core";
import type { BuildJobRecord } from "@asol/release-core/console";
import { DeployRunbookCollapsible } from "../DeployRunbookCollapsible";
import { parseAndroidReleaseLogSnapshot } from "../android-release-log-snapshot";
import { TerminalActions, TerminalOutput } from "../DeployRunbookTerminal";
import { uiAttributes } from "@asol/ui-registry-core";

function IndicatorCard(props: {
  label: string;
  value: string;
  help: string;
  className?: string;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "google-play-console.android-release-paths-terminal.div.2-v3aOtF", id: "google-play-console.android-release-paths-terminal.div.2" })} id={props.id} className={props.className ?? ""}>
      <div {...uiAttributes({ uid: "google-play-console.android-release-paths-terminal.div.3-OP0rLm", id: "google-play-console.android-release-paths-terminal.div.3" })} className="min-w-0 rounded-md border bg-surface p-3">
        <div {...uiAttributes({ uid: "google-play-console.android-release-paths-terminal.div.4-6ATR9Y", id: "google-play-console.android-release-paths-terminal.div.4" })} className="text-xs text-on-surface-variant">{props.label}</div>
        <div {...uiAttributes({ uid: "google-play-console.android-release-paths-terminal.div.5-v3D2MM", id: "google-play-console.android-release-paths-terminal.div.5" })} className="mt-1 text-sm font-semibold break-words sm:text-base" dir="ltr">
          {props.value || "—"}
        </div>
        <p {...uiAttributes({ uid: "google-play-console.android-release-paths-terminal.p-3LX3eh", id: "google-play-console.android-release-paths-terminal.p" })} className="mt-1 text-[11px] text-on-surface-variant break-words">{props.help}</p>
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
    <section {...uiAttributes({ uid: "google-play-console.android-release-paths-terminal.section.2-U5X3Nc", id: "google-play-console.android-release-paths-terminal.section.2" })} id="google-play-console.android-release-paths-terminal.section" className="mt-3 grid min-w-0 grid-cols-1 gap-3">
      <DeployRunbookCollapsible id="google-play-console.android-release-paths-terminal.deploy-runbook-collapsible"
        title={props.t("releaseConsole.androidPaths.executionIndicatorsTitle")}
        description={props.t("releaseConsole.androidPaths.executionIndicatorsHelp")}
      >
        <div {...uiAttributes({ uid: "google-play-console.android-release-paths-terminal.div.6-Qb02JM", id: "google-play-console.android-release-paths-terminal.div.6" })} id="google-play-console.android-release-paths-terminal.div" className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <IndicatorCard id="google-play-console.android-release-paths-terminal.indicator-card"
            label={props.t("releaseConsole.androidPaths.indicatorStatus")}
            value={snapshot.status}
            help={props.t("releaseConsole.androidPaths.indicatorStatusHelp")}
          />
          <IndicatorCard id="google-play-console.android-release-paths-terminal.indicator-card.2"
            label={props.t("releaseConsole.androidPaths.indicatorCommand")}
            value={snapshot.command}
            help={props.t("releaseConsole.androidPaths.indicatorCommandHelp")}
          />
          <IndicatorCard id="google-play-console.android-release-paths-terminal.indicator-card.3"
            label={props.t("releaseConsole.androidPaths.indicatorPhase")}
            value={snapshot.phase}
            help={props.t("releaseConsole.androidPaths.indicatorPhaseHelp")}
          />
          <IndicatorCard id="google-play-console.android-release-paths-terminal.indicator-card.4"
            label={props.t("releaseConsole.androidPaths.indicatorSection")}
            value={snapshot.section}
            help={props.t("releaseConsole.androidPaths.indicatorSectionHelp")}
          />
          <IndicatorCard id="google-play-console.android-release-paths-terminal.indicator-card.5"
            label={props.t("releaseConsole.androidPaths.indicatorBranch")}
            value={snapshot.branch}
            help={props.t("releaseConsole.androidPaths.indicatorBranchHelp")}
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible id="google-play-console.android-release-paths-terminal.deploy-runbook-collapsible.2"
        title={props.t("releaseConsole.androidPaths.terminalTitle")}
        description={props.t("releaseConsole.androidPaths.terminalHelp")}
        actions={
          <TerminalActions id="google-play-console.android-release-paths-terminal.terminal-actions"
            onCopy={() => void NativeCore.writeClipboard({ string: props.log })}
            onClear={props.clearLog}
          />
        }
      >
        <TerminalOutput id="google-play-console.android-release-paths-terminal.terminal-output" text={props.log} />
      </DeployRunbookCollapsible>
    </section>
  );
}
